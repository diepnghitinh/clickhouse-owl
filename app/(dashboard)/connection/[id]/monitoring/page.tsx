'use client';

import React, { useEffect, useState } from 'react';
import { Activity, Cpu, HardDrive, AlertCircle, RefreshCcw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Button } from '@/components/ui/Button';

// Types for our metrics
interface MetricPoint {
    time: string; // HH:mm:ss
    queryCount: number; // For Active Queries
    memoryUsage: number; // In GB
    readRows: number;
}

export default function MonitoringPage() {
    const [metrics, setMetrics] = useState<MetricPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [error, setError] = useState<string | null>(null);

    // Keep last 20 points
    const MAX_POINTS = 20;

    const fetchMetrics = async () => {
        try {
            // We'll fetch from /api/query to get system metrics
            // Combining multiple queries into one request if possible, or parallel

            // 1. Active Queries: SELECT value FROM system.metrics WHERE metric = 'Query'
            // 2. Memory: SELECT value FROM system.metrics WHERE metric = 'MemoryTracking' (Bytes)
            // 3. Read Rows: SELECT value FROM system.events WHERE event = 'ReadRows' (Cumulative, need diff? Actually simpler: system.metrics 'Read' or similar? 
            //    Best proxy for immediate load might be 'Query' and 'MemoryTracking'.
            //    Let's stick to these two guaranteed metrics + maybe 'BackgroundPoolTask' for async work.

            // Fetch active queries
            const qRes = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: "SELECT value FROM system.metrics WHERE metric = 'Query'",
                    database: 'system'
                })
            });
            const qData = await qRes.json();
            const activeQueries = parseInt(qData.data[0]?.value || '0');

            // Fetch memory (in bytes)
            const mRes = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: "SELECT value FROM system.metrics WHERE metric = 'MemoryTracking'",
                    database: 'system'
                })
            });
            const mData = await mRes.json();
            const memoryBytes = parseInt(mData.data[0]?.value || '0');
            const memoryGB = parseFloat((memoryBytes / (1024 * 1024 * 1024)).toFixed(2));

            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

            setMetrics(prev => {
                const newPoint = {
                    time: timeStr,
                    queryCount: activeQueries,
                    memoryUsage: memoryGB,
                    readRows: 0 // Placeholder or remove
                };
                const updated = [...prev, newPoint];
                if (updated.length > MAX_POINTS) return updated.slice(updated.length - MAX_POINTS);
                return updated;
            });
            setLastUpdated(now);
            setError(null);
        } catch (e: any) {
            console.error("Fetch metrics error:", e);
            setError(e.message || "Failed to fetch metrics");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 3000); // 3s refresh
        return () => clearInterval(interval);
    }, []);

    const currentMetric = metrics[metrics.length - 1] || { queryCount: 0, memoryUsage: 0 };

    return (
        <div className="flex-1 h-full bg-background p-8 overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Activity className="w-8 h-8 text-brand" />
                            System Monitoring
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Live metrics from <span className="font-mono text-xs bg-secondary px-1 py-0.5 rounded">system.metrics</span> table
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-xs text-muted-foreground text-right hidden md:block">
                            <div>Last updated</div>
                            <div className="font-mono">{lastUpdated.toLocaleTimeString()}</div>
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchMetrics} icon={<RefreshCcw className="w-4 h-4" />}>
                            Refresh
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        {error}
                    </div>
                )}

                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <Activity className="w-4 h-4" />
                            <span className="text-sm font-medium">Active Queries</span>
                        </div>
                        <div className="text-3xl font-bold font-mono text-brand">
                            {currentMetric.queryCount}
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <Cpu className="w-4 h-4" />
                            <span className="text-sm font-medium">Memory Usage</span>
                        </div>
                        <div className="text-3xl font-bold font-mono text-blue-500">
                            {currentMetric.memoryUsage} <span className="text-lg text-muted-foreground font-normal">GB</span>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <HardDrive className="w-4 h-4" />
                            <span className="text-sm font-medium">Data Processed</span>
                        </div>
                        <div className="text-3xl font-bold font-mono text-orange-500">
                            --
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Coming soon</div>
                    </div>
                </div>

                {/* Charts Area */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Active Queries Chart */}
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-[350px] flex flex-col">
                        <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Active Queries Trend</h3>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={metrics}>
                                    <defs>
                                        <linearGradient id="colorQuery" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                                    <XAxis
                                        dataKey="time"
                                        tick={{ fontSize: 12, fill: '#888' }}
                                        interval="preserveStartEnd"
                                        tickMargin={10}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 12, fill: '#888' }}
                                        domain={[0, 'auto']}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="queryCount"
                                        stroke="#8884d8"
                                        fillOpacity={1}
                                        fill="url(#colorQuery)"
                                        name="Queries"
                                        isAnimationActive={false}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Memory Usage Chart */}
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-[350px] flex flex-col">
                        <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Memory Usage (GB)</h3>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={metrics}>
                                    <defs>
                                        <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                                    <XAxis
                                        dataKey="time"
                                        tick={{ fontSize: 12, fill: '#888' }}
                                        interval="preserveStartEnd"
                                        tickMargin={10}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 12, fill: '#888' }}
                                        domain={[0, 'auto']}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="memoryUsage"
                                        stroke="#3b82f6"
                                        fillOpacity={1}
                                        fill="url(#colorMemory)"
                                        name="Memory (GB)"
                                        isAnimationActive={false}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
