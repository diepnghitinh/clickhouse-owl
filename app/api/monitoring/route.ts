import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import {
    ClickHouseRepository,
    ConnectionConfig,
    QueryResult,
} from '@/lib/infrastructure/clickhouse/repositories/clickhouse.repository';

function toMetricMap(result: QueryResult): Record<string, number> {
    const map: Record<string, number> = {};
    for (const row of result.rows) {
        map[String(row[0])] = Number(row[1]);
    }
    return map;
}

export async function GET() {
    try {
        const session = await getSession();
        if (!session.isAuthenticated || !session.connection) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const cfg: ConnectionConfig = {
            url: session.connection.url,
            username: session.connection.username,
            password: session.connection.password,
            database: session.connection.database,
        };

        // Single client instance shared across all parallel queries — avoids 7 separate TCP setups
        const repo = new ClickHouseRepository(cfg);

        const safe = (q: string) => repo.executeQuery(q, 'system').catch(() => ({ columns: [] as string[], rows: [] as unknown[][] }));

        const [metricsRes, asyncRes, processesRes, mergesRes, slowQueriesRes, replicasRes, disksRes] =
            await Promise.all([
                safe(`SELECT metric, value FROM system.metrics
                      WHERE metric IN ('Query','MemoryTracking','TCPConnection','HTTPConnection',
                                       'BackgroundMergesAndMutationsTasks','DelayedInserts',
                                       'OpenFileForRead','OpenFileForWrite','ReplicatedChecks')`),
                safe(`SELECT metric, value FROM system.asynchronous_metrics
                      WHERE metric IN ('OSCPUUsageUser','OSCPUUsageSystem','OSMemoryTotal',
                                       'OSMemoryAvailable','OSMemoryFreeWithoutCaches',
                                       'Uptime','OSNumProcessors')
                         OR metric LIKE 'DiskTotal_%'
                         OR metric LIKE 'DiskFree_%'
                         OR metric LIKE 'NetworkReceiveBytes_%'
                         OR metric LIKE 'NetworkSendBytes_%'`),
                safe(`SELECT query_id, user, query, elapsed, read_rows, read_bytes,
                             memory_usage, total_rows_approx
                      FROM system.processes
                      ORDER BY elapsed DESC
                      LIMIT 20`),
                safe(`SELECT database, table, merge_type, elapsed, progress,
                             rows_read, rows_written, memory_usage
                      FROM system.merges
                      ORDER BY elapsed DESC`),
                safe(`SELECT query, query_duration_ms, read_rows, read_bytes, memory_usage, exception
                      FROM system.query_log
                      WHERE event_time >= toStartOfHour(now())
                        AND type = 'QueryFinish'
                      ORDER BY query_duration_ms DESC
                      LIMIT 10`),
                safe(`SELECT database, table, replica_name, is_leader, total_replicas,
                             inserts_in_queue, merges_in_queue, queue_size,
                             last_queue_update_exception
                      FROM system.replicas
                      LIMIT 20`),
                safe(`SELECT name, path, free_space, total_space, type
                      FROM system.disks`),
            ]);

        return NextResponse.json({
            metrics: toMetricMap(metricsRes),
            asyncMetrics: toMetricMap(asyncRes),
            processes: { columns: processesRes.columns, rows: processesRes.rows },
            merges: { columns: mergesRes.columns, rows: mergesRes.rows },
            slowQueries: { columns: slowQueriesRes.columns, rows: slowQueriesRes.rows },
            replicas: { columns: replicasRes.columns, rows: replicasRes.rows },
            disks: { columns: disksRes.columns, rows: disksRes.rows },
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
