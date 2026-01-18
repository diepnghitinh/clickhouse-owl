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
        const { sourceDatabase, sourceTable, targetTable } = body;

        if (!sourceDatabase || !sourceTable || !targetTable) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Default to MergeTree and ORDER BY tuple() logic for simplicity as per plan
        const query = `
      CREATE TABLE "${targetTable}"
      ENGINE = MergeTree()
      ORDER BY tuple()
      AS SELECT * FROM "${sourceDatabase}"."${sourceTable}"
    `;

        await queryClickHouse(query, undefined, session.connection);

        return NextResponse.json({ success: true, message: `Table ${targetTable} created from ${sourceDatabase}.${sourceTable}` });
    } catch (error: any) {
        console.error("Failed to import table:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
