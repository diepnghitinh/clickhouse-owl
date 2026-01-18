
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { ClickHouseRepository } from '@/lib/infrastructure/clickhouse/repositories/clickhouse.repository';

export async function POST(request: Request) {
    const session = await getSession();
    if (!session.isAuthenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { sourceTable, targetTable, targetDatabase, connection, mode = 'import' } = body;

        if (!sourceTable || !targetTable || !connection) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { host, port, username, password, database } = connection;

        let query = '';

        const tableName = targetDatabase ? `"${targetDatabase}"."${targetTable}"` : `"${targetTable}"`;

        if (mode === 'link') {
            // Live Proxy Table
            query = `
                CREATE TABLE ${tableName}
                ENGINE = PostgreSQL('${host}:${port}', '${database}', '${sourceTable}', '${username}', '${password}')
            `;
        } else {
            // Snapshot Import
            query = `
                CREATE TABLE ${tableName}
                ENGINE = MergeTree()
                ORDER BY tuple()
                AS SELECT * FROM postgresql('${host}:${port}', '${database}', '${sourceTable}', '${username}', '${password}')
            `;
        }

        await ClickHouseRepository.execute(query, undefined, session.connection);

        const action = mode === 'link' ? 'linked' : 'imported';
        return NextResponse.json({ success: true, message: `Table ${targetTable} ${action} from Postgres: ${database}.${sourceTable}` });
    } catch (error: any) {
        console.error("Failed to process table:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
