
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { queryClickHouse } from '@/lib/clickhouse';

export async function POST(request: Request) {
    const session = await getSession();
    if (!session.isAuthenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { sourceTable, targetTable, connection } = body;

        if (!sourceTable || !targetTable || !connection) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { host, port, username, password, database } = connection;

        // Use postgresql function to select data directly from source
        // engine = MergeTree() ORDER BY tuple() is reasonable for a snapshot import

        const query = `
      CREATE TABLE "${targetTable}"
      ENGINE = MergeTree()
      ORDER BY tuple()
      AS SELECT * FROM postgresql('${host}:${port}', '${database}', '${sourceTable}', '${username}', '${password}')
    `;

        await queryClickHouse(query, undefined, session.connection);

        return NextResponse.json({ success: true, message: `Table ${targetTable} imported from Postgres: ${database}.${sourceTable}` });
    } catch (error: any) {
        console.error("Failed to import table:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
