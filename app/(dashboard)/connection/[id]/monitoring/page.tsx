'use client';

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Activity, AlertCircle, AlertTriangle, CheckCircle, ChevronDown, ChevronRight,
    ChevronUp, Cpu, Database, HardDrive, Network, RefreshCcw, Server, Wifi,
    XCircle, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

// ─── Types ────────────────────────────────────────────────────────────────────
// Defined at module level — not recreated on every render

interface MonitoringSnapshot {
    metrics: Record<string, number>;
    asyncMetrics: Record<string, number>;
    processes: { columns: string[]; rows: unknown[][] };
    merges: { columns: string[]; rows: unknown[][] };
    slowQueries: { columns: string[]; rows: unknown[][] };
    replicas: { columns: string[]; rows: unknown[][] };
    disks: { columns: string[]; rows: unknown[][] };
}

interface MetricPoint {
    time: string;
    queryCount: number;
    memoryGB: number;
    cpuPercent: number;
    connections: number;
}

interface Alert {
    severity: 'crit' | 'warn';
    message: string;
    suggestion: string;
}

interface Process {
    query_id: string;
    user: string;
    query: string;
    elapsed: number;
    read_rows: number;
    read_bytes: number;
    memory_usage: number;
    total_rows_approx: number;
}

interface Merge {
    database: string;
    table: string;
    merge_type: string;
    elapsed: number;
    progress: number;
    rows_read: number;
    rows_written: number;
    memory_usage: number;
}

interface SlowQuery {
    query: string;
    query_duration_ms: number;
    read_rows: number;
    read_bytes: number;
    memory_usage: number;
    exception: string;
}

interface Replica {
    database: string;
    table: string;
    replica_name: string;
    is_leader: number;
    total_replicas: number;
    inserts_in_queue: number;
    merges_in_queue: number;
    queue_size: number;
    last_queue_update_exception: string;
}

interface Disk {
    name: string;
    path: string;
    free_space: number;
    total_space: number;
    type: string;
}

// ─── Pure helpers — module-level, never recreated ─────────────────────────────

function fmtBytes(bytes: number): string {
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
    if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(0)} KB`;
    return `${bytes} B`;
}

function fmtNum(n: number): string {
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return String(Math.round(n));
}

function fmtUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

function fmtElapsed(s: number): string {
    if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
    if (s >= 60) return `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`;
    return `${Number(s).toFixed(1)}s`;
}

function truncate(s: string, len: number): string {
    return s.length > len ? s.slice(0, len) + '…' : s;
}

function rowsToObjects<T>(result: { columns: string[]; rows: unknown[][] }): T[] {
    return result.rows.map(row => {
        const obj: Record<string, unknown> = {};
        result.columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj as unknown as T;
    });
}

function computeHealthScore(snap: MonitoringSnapshot): number {
    let score = 100;
    const { metrics, asyncMetrics } = snap;

    const memTotal = asyncMetrics['OSMemoryTotal'] ?? 0;
    // OSMemoryAvailable = MemAvailable (/proc/meminfo) = free + reclaimable caches
    // OSMemoryFreeWithoutCaches = MemFree only (no caches) — too conservative, overstates usage
    const memAvailable = asyncMetrics['OSMemoryAvailable'] ?? asyncMetrics['OSMemoryFreeWithoutCaches'] ?? 0;
    const memPct = memTotal > 0 ? ((memTotal - memAvailable) / memTotal) * 100 : 0;
    if (memPct > 90) score -= 25;
    else if (memPct > 80) score -= 15;
    else if (memPct > 70) score -= 5;

    const cpuUser = asyncMetrics['OSCPUUsageUser'] ?? 0;
    const cpuSys = asyncMetrics['OSCPUUsageSystem'] ?? 0;
    const numCpus = Math.max(asyncMetrics['OSNumProcessors'] ?? 1, 1);
    const cpuPct = Math.min(((cpuUser + cpuSys) / numCpus) * 100, 100);
    if (cpuPct > 90) score -= 20;
    else if (cpuPct > 80) score -= 10;
    else if (cpuPct > 70) score -= 5;

    if ((metrics['DelayedInserts'] ?? 0) > 0) score -= 15;

    const qCount = metrics['Query'] ?? 0;
    if (qCount > 100) score -= 15;
    else if (qCount > 50) score -= 8;

    const replicaErrCount = snap.replicas.rows.filter(r => r[8] && String(r[8]).length > 0).length;
    score -= replicaErrCount * 10;

    const longRunning = snap.processes.rows.filter(r => Number(r[3]) > 60).length;
    score -= longRunning * 5;

    const freeIdx = snap.disks.columns.indexOf('free_space');
    const totalIdx = snap.disks.columns.indexOf('total_space');
    for (const row of snap.disks.rows) {
        const free = Number(row[freeIdx] ?? 0);
        const total = Number(row[totalIdx] ?? 0);
        if (total > 0) {
            const usedPct = ((total - free) / total) * 100;
            if (usedPct > 90) score -= 20;
            else if (usedPct > 80) score -= 10;
        }
    }

    return Math.max(0, Math.min(100, score));
}

function computeAlerts(snap: MonitoringSnapshot): Alert[] {
    const alerts: Alert[] = [];
    const { metrics, asyncMetrics } = snap;

    const memTotal = asyncMetrics['OSMemoryTotal'] ?? 0;
    const memAvailable = asyncMetrics['OSMemoryAvailable'] ?? asyncMetrics['OSMemoryFreeWithoutCaches'] ?? 0;
    const memPct = memTotal > 0 ? ((memTotal - memAvailable) / memTotal) * 100 : 0;
    if (memPct > 90) alerts.push({ severity: 'crit', message: `Critical memory pressure: ${memPct.toFixed(1)}% used`, suggestion: 'Kill memory-heavy queries in the Processes section below.' });
    else if (memPct > 80) alerts.push({ severity: 'warn', message: `High memory usage: ${memPct.toFixed(1)}%`, suggestion: 'Monitor growth. Consider reducing max_memory_usage per query.' });

    const cpuUser = asyncMetrics['OSCPUUsageUser'] ?? 0;
    const cpuSys = asyncMetrics['OSCPUUsageSystem'] ?? 0;
    const numCpus = Math.max(asyncMetrics['OSNumProcessors'] ?? 1, 1);
    const cpuPct = Math.min(((cpuUser + cpuSys) / numCpus) * 100, 100);
    if (cpuPct > 85) alerts.push({ severity: 'crit', message: `CPU overload: ${cpuPct.toFixed(1)}% utilization`, suggestion: 'High query concurrency. Review slow queries and consider read replicas.' });
    else if (cpuPct > 70) alerts.push({ severity: 'warn', message: `Elevated CPU: ${cpuPct.toFixed(1)}%`, suggestion: 'Move batch/ETL jobs to off-peak hours.' });

    if ((metrics['DelayedInserts'] ?? 0) > 0) {
        alerts.push({ severity: 'crit', message: `Write throttling: ${metrics['DelayedInserts']} delayed inserts`, suggestion: 'Too many unmerged parts. Merges need to catch up. Consider pausing inserts.' });
    }

    const longRunning = snap.processes.rows.filter(r => Number(r[3]) > 60);
    if (longRunning.length > 0) {
        alerts.push({ severity: 'warn', message: `${longRunning.length} long-running quer${longRunning.length === 1 ? 'y' : 'ies'} (>60s)`, suggestion: 'Use the Kill button in the Processes table below.' });
    }

    const replicaErrs = snap.replicas.rows.filter(r => r[8] && String(r[8]).length > 0);
    if (replicaErrs.length > 0) {
        alerts.push({ severity: 'crit', message: `Replication errors on ${replicaErrs.length} replica(s)`, suggestion: 'Check system.replicas for details. Data consistency may be at risk.' });
    }

    const freeIdx = snap.disks.columns.indexOf('free_space');
    const totalIdx = snap.disks.columns.indexOf('total_space');
    const nameIdx = snap.disks.columns.indexOf('name');
    for (const row of snap.disks.rows) {
        const free = Number(row[freeIdx] ?? 0);
        const total = Number(row[totalIdx] ?? 0);
        const name = String(row[nameIdx] ?? 'disk');
        if (total > 0) {
            const usedPct = ((total - free) / total) * 100;
            if (usedPct > 90) alerts.push({ severity: 'crit', message: `Disk "${name}" nearly full: ${usedPct.toFixed(1)}% used`, suggestion: 'Free space immediately. Use TTL policies to auto-delete old data.' });
            else if (usedPct > 80) alerts.push({ severity: 'warn', message: `Disk "${name}" usage high: ${usedPct.toFixed(1)}%`, suggestion: 'Plan disk expansion or add TTL rules.' });
        }
    }

    return alerts;
}

// ─── MetricChart — memoized component + memoized SVG paths ───────────────────

interface MetricChartProps {
    data: MetricPoint[];
    dataKey: keyof MetricPoint;
    color: string;
    label: string;
    formatValue?: (v: number) => string;
}

const MetricChart = memo(function MetricChart({
    data, dataKey, color, label, formatValue = String,
}: MetricChartProps) {
    const W = 640, H = 200, P = 20;
    const cH = H - P * 2, cW = W - P * 2;

    // Memoize O(n) SVG path computation — only recomputes when data or dataKey changes
    const svg = useMemo(() => {
        if (data.length < 2) return null;
        const values = data.map(d => d[dataKey] as number);
        const maxVal = Math.max(...values, 1);
        const pts = data.map((d, i) => ({
            x: P + (i / (data.length - 1)) * cW,
            y: P + (1 - (d[dataKey] as number) / maxVal) * cH,
            v: d[dataKey] as number,
            t: d.time,
        }));
        const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        const area = `${line} L ${pts[pts.length - 1].x} ${H - P} L ${pts[0].x} ${H - P} Z`;
        return { pts, line, area, latest: pts[pts.length - 1], first: pts[0] };
    }, [data, dataKey, cH, cW]);

    if (!svg) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Collecting data…
            </div>
        );
    }

    const { pts, line, area, latest, first } = svg;

    return (
        <div className="relative h-full w-full">
            <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full overflow-visible">
                <defs>
                    <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.28" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                    </linearGradient>
                </defs>
                {[0, 1, 2, 3].map(s => (
                    <line key={s} x1={P} y1={P + (cH / 3) * s} x2={W - P} y2={P + (cH / 3) * s}
                        stroke="currentColor" strokeOpacity="0.07" strokeDasharray="4 6"
                        className="text-border" />
                ))}
                <path d={area} fill={`url(#grad-${dataKey})`} />
                <path d={line} fill="none" stroke={color} strokeWidth="2.5"
                    strokeLinejoin="round" strokeLinecap="round" />
                {pts.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y}
                        r={i === pts.length - 1 ? 4 : 2}
                        fill={i === pts.length - 1 ? color : `${color}88`} />
                ))}
            </svg>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between px-1 text-[10px] text-muted-foreground">
                <span>{first.t}</span>
                <span>{latest.t}</span>
            </div>
            <div className="pointer-events-none absolute right-2 top-2 rounded bg-background/90 px-2 py-1 text-xs ring-1 ring-border">
                <div className="text-muted-foreground">{label}</div>
                <div className="font-mono font-bold" style={{ color }}>{formatValue(latest.v)}</div>
            </div>
        </div>
    );
});

// ─── KpiCard — memoized ───────────────────────────────────────────────────────

interface KpiCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
    color?: string;
    trend?: number;
    status?: 'ok' | 'warn' | 'crit' | 'neutral';
}

const KpiCard = memo(function KpiCard({
    icon, label, value, sub, color = 'text-foreground', trend, status = 'neutral',
}: KpiCardProps) {
    const border = status === 'crit' ? 'border-red-500/40 bg-red-500/5'
        : status === 'warn' ? 'border-yellow-500/40 bg-yellow-500/5'
            : status === 'ok' ? 'border-green-500/30 bg-green-500/5'
                : 'border-border';
    return (
        <div className={`rounded-xl border p-5 shadow-sm flex flex-col gap-2 bg-card ${border}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                    {icon}
                    <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
                </div>
                {status === 'crit' && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                {status === 'warn' && <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />}
                {status === 'ok' && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
            </div>
            <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
            <div className="flex items-center justify-between min-h-[16px]">
                <span className="text-xs text-muted-foreground">{sub ?? ''}</span>
                {trend !== undefined && (
                    <span className={`text-xs font-medium flex items-center gap-0.5 ${trend > 2 ? 'text-red-400' : trend < -2 ? 'text-green-400' : 'text-muted-foreground'}`}>
                        {trend > 2 ? <ChevronUp className="w-3 h-3" /> : trend < -2 ? <ChevronDown className="w-3 h-3" /> : null}
                        {Math.abs(trend).toFixed(1)}%
                    </span>
                )}
            </div>
        </div>
    );
});

// ─── HealthScore — memoized ───────────────────────────────────────────────────

const HealthScore = memo(function HealthScore({ score }: { score: number }) {
    const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
    const label = score >= 80 ? 'Healthy' : score >= 60 ? 'Degraded' : 'Critical';
    const r = 28, circ = 2 * Math.PI * r;
    const dash = (score / 100) * circ;
    return (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
            <svg width="68" height="68" viewBox="0 0 68 68">
                <circle cx="34" cy="34" r={r} fill="none" stroke="currentColor"
                    strokeWidth="6" className="text-border" />
                <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="6"
                    strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                    transform="rotate(-90 34 34)" />
                <text x="34" y="39" textAnchor="middle" fontSize="13" fontWeight="bold" fill={color}>{score}</text>
            </svg>
            <div>
                <div className="font-bold text-sm" style={{ color }}>{label}</div>
                <div className="text-xs text-muted-foreground">Health Score</div>
            </div>
        </div>
    );
});

// ─── CollapsibleSection — memoized ───────────────────────────────────────────

const CollapsibleSection = memo(function CollapsibleSection({ title, icon, badge, children, defaultOpen = true }: {
    title: string;
    icon: React.ReactNode;
    badge?: string | number;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-secondary/40 transition-colors"
            >
                <div className="flex items-center gap-2 text-sm font-semibold">
                    {icon}
                    {title}
                    {badge !== undefined && badge !== 0 && (
                        <span className="ml-1 rounded-full bg-brand/20 text-brand text-xs px-2 py-0.5 font-mono">{badge}</span>
                    )}
                </div>
                {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>
            {open && <div className="border-t border-border">{children}</div>}
        </div>
    );
});

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_POINTS = 30;
const REFRESH_OPTIONS = [3, 5, 10, 30, 60] as const;

// formatValue callbacks defined at module level — stable references for React.memo
const fmtMemory = (v: number) => `${v.toFixed(2)} GB`;
const fmtCpu = (v: number) => `${v.toFixed(1)}%`;

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MonitoringPage() {
    const [snapshot, setSnapshot] = useState<MonitoringSnapshot | null>(null);
    const [history, setHistory] = useState<MetricPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [refreshSecs, setRefreshSecs] = useState<number>(5);
    const [killingId, setKillingId] = useState<string | null>(null);

    // AbortController ref — cancels in-flight request before starting a new one
    const abortRef = useRef<AbortController | null>(null);

    const fetchData = useCallback(async () => {
        abortRef.current?.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        try {
            const res = await fetch('/api/monitoring', { signal: ctrl.signal });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: MonitoringSnapshot = await res.json();
            if ('error' in data) throw new Error((data as { error: string }).error);

            const { metrics, asyncMetrics } = data;
            const memTotal = asyncMetrics['OSMemoryTotal'] ?? 0;
            const memAvail = asyncMetrics['OSMemoryAvailable'] ?? asyncMetrics['OSMemoryFreeWithoutCaches'] ?? 0;
            const memUsed = memTotal - memAvail;
            const cpuUser = asyncMetrics['OSCPUUsageUser'] ?? 0;
            const cpuSys = asyncMetrics['OSCPUUsageSystem'] ?? 0;
            const numCpus = Math.max(asyncMetrics['OSNumProcessors'] ?? 1, 1);

            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-US', {
                hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
            });

            const point: MetricPoint = {
                time: timeStr,
                queryCount: metrics['Query'] ?? 0,
                memoryGB: parseFloat((memUsed / 1e9).toFixed(2)),
                cpuPercent: parseFloat((Math.min(((cpuUser + cpuSys) / numCpus) * 100, 100)).toFixed(1)),
                connections: (metrics['TCPConnection'] ?? 0) + (metrics['HTTPConnection'] ?? 0),
            };

            setSnapshot(data);
            setHistory(prev => {
                const next = [...prev, point];
                return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next;
            });
            setLastUpdated(now);
            setError(null);
        } catch (e: unknown) {
            if (e instanceof Error && e.name === 'AbortError') return; // superseded by newer fetch
            setError(e instanceof Error ? e.message : 'Failed to fetch metrics');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const id = window.setInterval(fetchData, refreshSecs * 1000);
        return () => {
            window.clearInterval(id);
            abortRef.current?.abort();
        };
    }, [fetchData, refreshSecs]);

    const killQuery = useCallback(async (queryId: string) => {
        setKillingId(queryId);
        try {
            await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: `KILL QUERY WHERE query_id = '${queryId}' ASYNC` }),
            });
            setTimeout(fetchData, 600);
        } finally {
            setKillingId(null);
        }
    }, [fetchData]);

    // ── Memoized derived values ────────────────────────────────────────────────
    // Only recompute when snapshot changes, not on killingId / lastUpdated changes

    const derived = useMemo(() => {
        const asyncM = snapshot?.asyncMetrics ?? {};
        const metrics = snapshot?.metrics ?? {};

        const memTotal = asyncM['OSMemoryTotal'] ?? 0;
        const memAvail = asyncM['OSMemoryAvailable'] ?? asyncM['OSMemoryFreeWithoutCaches'] ?? 0;
        const cpuUser = asyncM['OSCPUUsageUser'] ?? 0;
        const cpuSys = asyncM['OSCPUUsageSystem'] ?? 0;
        const numCpus = Math.max(asyncM['OSNumProcessors'] ?? 1, 1);
        const cpuPct = Math.min(((cpuUser + cpuSys) / numCpus) * 100, 100);
        const memPct = memTotal > 0 ? Math.round(((memTotal - memAvail) / memTotal) * 100) : 0;
        // ClickHouse-allocated memory (from system.metrics 'MemoryTracking')
        const chMemGB = ((snapshot?.metrics['MemoryTracking'] ?? 0) / 1e9).toFixed(1);

        const diskPct = (() => {
            if (!snapshot || snapshot.disks.rows.length === 0) return null;
            const fIdx = snapshot.disks.columns.indexOf('free_space');
            const tIdx = snapshot.disks.columns.indexOf('total_space');
            const row = snapshot.disks.rows[0];
            const f = Number(row[fIdx] ?? 0), t = Number(row[tIdx] ?? 0);
            return t > 0 ? Math.round(((t - f) / t) * 100) : null;
        })();

        return {
            memUsedGB: ((memTotal - memAvail) / 1e9).toFixed(1),
            memTotalGB: (memTotal / 1e9).toFixed(1),
            memPct,
            chMemGB,
            cpuPct,
            uptime: asyncM['Uptime'] ?? 0,
            tcpConns: metrics['TCPConnection'] ?? 0,
            httpConns: metrics['HTTPConnection'] ?? 0,
            bgMerges: metrics['BackgroundMergesAndMutationsTasks'] ?? 0,
            delayedInserts: metrics['DelayedInserts'] ?? 0,
            queryCount: metrics['Query'] ?? 0,
            diskPct,
        };
    }, [snapshot]);

    const alerts = useMemo(
        () => snapshot ? computeAlerts(snapshot) : [],
        [snapshot],
    );

    const healthScore = useMemo(
        () => snapshot ? computeHealthScore(snapshot) : 100,
        [snapshot],
    );

    // rowsToObjects is O(n×cols) — memoize so it only runs when snapshot changes
    const tableData = useMemo(() => ({
        processes: snapshot ? rowsToObjects<Process>(snapshot.processes) : [],
        merges: snapshot ? rowsToObjects<Merge>(snapshot.merges) : [],
        slowQueries: snapshot ? rowsToObjects<SlowQuery>(snapshot.slowQueries) : [],
        replicas: snapshot ? rowsToObjects<Replica>(snapshot.replicas) : [],
        disks: snapshot ? rowsToObjects<Disk>(snapshot.disks) : [],
    }), [snapshot]);

    // Trend: % change vs previous data point — memoized over history
    const trends = useMemo(() => {
        const curr = history[history.length - 1];
        const prev = history[history.length - 2];
        if (!curr || !prev) return {} as Partial<Record<keyof MetricPoint, number>>;
        const calc = (k: keyof MetricPoint) => {
            const c = curr[k] as number, p = prev[k] as number;
            return p === 0 ? undefined : ((c - p) / p) * 100;
        };
        return {
            queryCount: calc('queryCount'),
            memoryGB: calc('memoryGB'),
            cpuPercent: calc('cpuPercent'),
            connections: calc('connections'),
        };
    }, [history]);

    // ── Destructure for render ─────────────────────────────────────────────────
    const { memUsedGB, memTotalGB, memPct, chMemGB, cpuPct, uptime, tcpConns, httpConns,
        bgMerges, delayedInserts, queryCount, diskPct } = derived;
    const { processes, merges, slowQueries, replicas, disks } = tableData;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex-1 h-full bg-background overflow-y-auto">
            <div className="max-w-7xl mx-auto p-6 space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Activity className="w-6 h-6 text-brand" />
                            System Monitoring
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Live metrics · refreshes every {refreshSecs}s
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {REFRESH_OPTIONS.map(s => (
                                <button key={s} onClick={() => setRefreshSecs(s)}
                                    className={`px-2 py-1 rounded transition-colors ${refreshSecs === s ? 'bg-brand text-white font-semibold' : 'hover:bg-secondary'}`}>
                                    {s}s
                                </button>
                            ))}
                        </div>
                        <div className="text-xs text-muted-foreground hidden md:block text-right">
                            <div>Last updated</div>
                            <div className="font-mono">{lastUpdated.toLocaleTimeString()}</div>
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchData}
                            icon={<RefreshCcw className="w-4 h-4" />}>
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg flex items-center gap-2 text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        {error}
                    </div>
                )}

                {/* Health + Alerts */}
                {snapshot && (
                    <div className="flex flex-col lg:flex-row gap-4">
                        <HealthScore score={healthScore} />
                        {alerts.length === 0 ? (
                            <div className="flex-1 flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/5 px-5 py-4 text-sm text-green-600 dark:text-green-400">
                                <CheckCircle className="w-5 h-5 shrink-0" />
                                All systems nominal — no active alerts.
                            </div>
                        ) : (
                            <div className="flex-1 space-y-2">
                                {alerts.map((a, i) => (
                                    <div key={i} className={`rounded-lg border px-4 py-3 text-sm flex gap-3 ${a.severity === 'crit' ? 'border-red-500/30 bg-red-500/8 text-red-600 dark:text-red-400' : 'border-yellow-500/30 bg-yellow-500/8 text-yellow-700 dark:text-yellow-400'}`}>
                                        {a.severity === 'crit' ? <XCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
                                        <div>
                                            <div className="font-medium">{a.message}</div>
                                            <div className="text-xs opacity-75 mt-0.5">{a.suggestion}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KpiCard icon={<Activity className="w-4 h-4" />} label="Active Queries"
                        value={String(queryCount)} color="text-brand"
                        trend={trends.queryCount}
                        status={queryCount > 50 ? 'crit' : queryCount > 20 ? 'warn' : 'ok'} />
                    <KpiCard icon={<Cpu className="w-4 h-4" />} label="Memory Usage"
                        value={`${memUsedGB} GB`}
                        sub={`of ${memTotalGB} GB · ${memPct}% · CH: ${chMemGB} GB`}
                        color="text-blue-500" trend={trends.memoryGB}
                        status={memPct > 90 ? 'crit' : memPct > 75 ? 'warn' : 'ok'} />
                    <KpiCard icon={<Zap className="w-4 h-4" />} label="CPU Usage"
                        value={`${cpuPct.toFixed(1)}%`} color="text-orange-500"
                        trend={trends.cpuPercent}
                        status={cpuPct > 85 ? 'crit' : cpuPct > 70 ? 'warn' : 'ok'} />
                    <KpiCard icon={<Wifi className="w-4 h-4" />} label="Connections"
                        value={String(tcpConns + httpConns)} sub={`TCP ${tcpConns} · HTTP ${httpConns}`}
                        color="text-teal-500" trend={trends.connections} status="neutral" />
                    <KpiCard icon={<Server className="w-4 h-4" />} label="Uptime"
                        value={fmtUptime(uptime)} color="text-foreground" status="ok" />
                    <KpiCard icon={<Database className="w-4 h-4" />} label="BG Merges"
                        value={String(bgMerges)}
                        color={bgMerges > 10 ? 'text-yellow-500' : 'text-foreground'}
                        status={bgMerges > 10 ? 'warn' : 'neutral'} />
                    <KpiCard icon={<AlertCircle className="w-4 h-4" />} label="Delayed Inserts"
                        value={String(delayedInserts)}
                        color={delayedInserts > 0 ? 'text-red-500' : 'text-green-500'}
                        status={delayedInserts > 0 ? 'crit' : 'ok'} />
                    <KpiCard icon={<HardDrive className="w-4 h-4" />} label="Disk Usage"
                        value={diskPct !== null ? `${diskPct}%` : '—'}
                        color={diskPct !== null && diskPct > 90 ? 'text-red-500' : diskPct !== null && diskPct > 80 ? 'text-yellow-500' : 'text-foreground'}
                        status={diskPct !== null ? (diskPct > 90 ? 'crit' : diskPct > 80 ? 'warn' : 'ok') : 'neutral'} />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {([
                        { key: 'queryCount', color: '#8b5cf6', title: 'Active Queries', label: 'Queries', fmt: undefined },
                        { key: 'memoryGB', color: '#3b82f6', title: 'Memory Usage', label: 'Memory', fmt: fmtMemory },
                        { key: 'cpuPercent', color: '#f97316', title: 'CPU Utilization', label: 'CPU', fmt: fmtCpu },
                        { key: 'connections', color: '#14b8a6', title: 'Active Connections', label: 'Connections', fmt: undefined },
                    ] as const).map(({ key, color, title, label, fmt }) => (
                        <div key={key} className="bg-card border border-border rounded-xl p-5 shadow-sm h-[300px] flex flex-col">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{title}</h3>
                            <div className="flex-1 min-h-0">
                                <MetricChart data={history} dataKey={key} color={color} label={label} formatValue={fmt} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Live Processes */}
                <CollapsibleSection title="Live Processes" icon={<Activity className="w-4 h-4" />} badge={processes.length}>
                    {processes.length === 0 ? (
                        <div className="px-6 py-8 text-center text-sm text-muted-foreground">No active queries running.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                                        <th className="px-4 py-3 text-left">User</th>
                                        <th className="px-4 py-3 text-left">Query</th>
                                        <th className="px-4 py-3 text-right">Elapsed</th>
                                        <th className="px-4 py-3 text-right">Memory</th>
                                        <th className="px-4 py-3 text-right">Rows Read</th>
                                        <th className="px-4 py-3 text-right">Progress</th>
                                        <th className="px-4 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {processes.map((p) => {
                                        const elapsed = Number(p.elapsed);
                                        const progress = p.total_rows_approx > 0
                                            ? Math.min(Math.round((p.read_rows / p.total_rows_approx) * 100), 100)
                                            : null;
                                        const isLong = elapsed > 60;
                                        return (
                                            <tr key={p.query_id}
                                                className={`border-b border-border/50 hover:bg-secondary/40 ${isLong ? 'bg-yellow-500/5' : ''}`}>
                                                <td className="px-4 py-3 font-medium">{p.user}</td>
                                                <td className="px-4 py-3 font-mono text-xs max-w-[320px]">
                                                    <span title={p.query}>{truncate(String(p.query).replace(/\s+/g, ' '), 80)}</span>
                                                </td>
                                                <td className={`px-4 py-3 text-right font-mono ${isLong ? 'text-yellow-500 font-semibold' : ''}`}>
                                                    {fmtElapsed(elapsed)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-xs">{fmtBytes(Number(p.memory_usage))}</td>
                                                <td className="px-4 py-3 text-right font-mono text-xs">{fmtNum(Number(p.read_rows))}</td>
                                                <td className="px-4 py-3 text-right">
                                                    {progress !== null ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                                                                <div className="h-full bg-brand rounded-full" style={{ width: `${progress}%` }} />
                                                            </div>
                                                            <span className="font-mono text-xs w-8 text-right">{progress}%</span>
                                                        </div>
                                                    ) : <span className="text-muted-foreground">—</span>}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button onClick={() => killQuery(p.query_id)}
                                                        disabled={killingId === p.query_id}
                                                        className="text-xs px-2 py-1 rounded border border-red-500/40 text-red-500 hover:bg-red-500/10 disabled:opacity-50 transition-colors">
                                                        {killingId === p.query_id ? '…' : 'Kill'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CollapsibleSection>

                {/* Active Merges */}
                <CollapsibleSection title="Active Merges" icon={<Database className="w-4 h-4" />} badge={merges.length} defaultOpen={merges.length > 0}>
                    {merges.length === 0 ? (
                        <div className="px-6 py-8 text-center text-sm text-muted-foreground">No active merge operations.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                                        <th className="px-4 py-3 text-left">Table</th>
                                        <th className="px-4 py-3 text-left">Type</th>
                                        <th className="px-4 py-3 text-right">Elapsed</th>
                                        <th className="px-4 py-3 text-left">Progress</th>
                                        <th className="px-4 py-3 text-right">Rows Read</th>
                                        <th className="px-4 py-3 text-right">Rows Written</th>
                                        <th className="px-4 py-3 text-right">Memory</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {merges.map((m, i) => {
                                        const pct = Math.min(Math.round(Number(m.progress) * 100), 100);
                                        return (
                                            <tr key={i} className="border-b border-border/50 hover:bg-secondary/40">
                                                <td className="px-4 py-3 font-mono text-xs">{m.database}.{m.table}</td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground">{m.merge_type}</td>
                                                <td className="px-4 py-3 text-right font-mono text-xs">{fmtElapsed(Number(m.elapsed))}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                                                            <div className="h-full bg-teal-500 rounded-full" style={{ width: `${pct}%` }} />
                                                        </div>
                                                        <span className="font-mono text-xs">{pct}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-xs">{fmtNum(Number(m.rows_read))}</td>
                                                <td className="px-4 py-3 text-right font-mono text-xs">{fmtNum(Number(m.rows_written))}</td>
                                                <td className="px-4 py-3 text-right font-mono text-xs">{fmtBytes(Number(m.memory_usage))}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CollapsibleSection>

                {/* Slow Queries */}
                <CollapsibleSection title="Slow Queries (Last 1h)" icon={<AlertTriangle className="w-4 h-4" />} badge={slowQueries.length} defaultOpen={slowQueries.length > 0}>
                    {slowQueries.length === 0 ? (
                        <div className="px-6 py-8 text-center text-sm text-muted-foreground">No slow queries in the last hour.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                                        <th className="px-4 py-3 text-left">Query</th>
                                        <th className="px-4 py-3 text-right">Duration</th>
                                        <th className="px-4 py-3 text-right">Rows Read</th>
                                        <th className="px-4 py-3 text-right">Bytes Read</th>
                                        <th className="px-4 py-3 text-right">Memory</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {slowQueries.map((q, i) => (
                                        <tr key={i} className="border-b border-border/50 hover:bg-secondary/40">
                                            <td className="px-4 py-3 font-mono text-xs max-w-[400px]">
                                                <span title={q.query}>{truncate(String(q.query).replace(/\s+/g, ' '), 100)}</span>
                                                {q.exception && <div className="text-red-400 mt-0.5">{truncate(q.exception, 60)}</div>}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-orange-500">
                                                {Number(q.query_duration_ms) >= 1000
                                                    ? `${(Number(q.query_duration_ms) / 1000).toFixed(2)}s`
                                                    : `${q.query_duration_ms}ms`}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-xs">{fmtNum(Number(q.read_rows))}</td>
                                            <td className="px-4 py-3 text-right font-mono text-xs">{fmtBytes(Number(q.read_bytes))}</td>
                                            <td className="px-4 py-3 text-right font-mono text-xs">{fmtBytes(Number(q.memory_usage))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CollapsibleSection>

                {/* Disk Usage */}
                {disks.length > 0 && (
                    <CollapsibleSection title="Disk Usage" icon={<HardDrive className="w-4 h-4" />}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
                            {disks.map((d) => {
                                const usedPct = d.total_space > 0
                                    ? Math.round(((d.total_space - d.free_space) / d.total_space) * 100) : 0;
                                const barColor = usedPct > 90 ? '#ef4444' : usedPct > 80 ? '#f59e0b' : '#22c55e';
                                return (
                                    <div key={d.name} className="rounded-lg border border-border bg-background p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-semibold text-sm">{d.name}</div>
                                                <div className="text-xs text-muted-foreground">{d.type} · {d.path}</div>
                                            </div>
                                            <span className="font-bold font-mono text-sm" style={{ color: barColor }}>{usedPct}%</span>
                                        </div>
                                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all" style={{ width: `${usedPct}%`, backgroundColor: barColor }} />
                                        </div>
                                        <div className="flex justify-between text-xs text-muted-foreground font-mono">
                                            <span>{fmtBytes(d.total_space - d.free_space)} used</span>
                                            <span>{fmtBytes(d.free_space)} free of {fmtBytes(d.total_space)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CollapsibleSection>
                )}

                {/* Replication Status */}
                {replicas.length > 0 && (
                    <CollapsibleSection title="Replication Status" icon={<Network className="w-4 h-4" />} badge={replicas.length}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                                        <th className="px-4 py-3 text-left">Table</th>
                                        <th className="px-4 py-3 text-left">Replica</th>
                                        <th className="px-4 py-3 text-center">Leader</th>
                                        <th className="px-4 py-3 text-right">Queue</th>
                                        <th className="px-4 py-3 text-right">Inserts In Queue</th>
                                        <th className="px-4 py-3 text-right">Merges In Queue</th>
                                        <th className="px-4 py-3 text-left">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {replicas.map((r, i) => {
                                        const hasError = r.last_queue_update_exception?.length > 0;
                                        return (
                                            <tr key={i} className={`border-b border-border/50 hover:bg-secondary/40 ${hasError ? 'bg-red-500/5' : ''}`}>
                                                <td className="px-4 py-3 font-mono text-xs">{r.database}.{r.table}</td>
                                                <td className="px-4 py-3 text-xs">{r.replica_name}</td>
                                                <td className="px-4 py-3 text-center">
                                                    {Number(r.is_leader) ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <span className="text-muted-foreground">—</span>}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-xs">{r.queue_size}</td>
                                                <td className="px-4 py-3 text-right font-mono text-xs">{r.inserts_in_queue}</td>
                                                <td className="px-4 py-3 text-right font-mono text-xs">{r.merges_in_queue}</td>
                                                <td className="px-4 py-3 text-xs">
                                                    {hasError
                                                        ? <span className="text-red-400">{truncate(r.last_queue_update_exception, 60)}</span>
                                                        : <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CollapsibleSection>
                )}

                {loading && !snapshot && (
                    <div className="flex justify-center py-12 text-muted-foreground text-sm">
                        Loading metrics…
                    </div>
                )}

            </div>
        </div>
    );
}
