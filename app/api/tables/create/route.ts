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
        const { database, name, engine = 'MergeTree', columns, orderBy } = body;

        if (!database || !name || !columns || columns.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Construct Columns definitions
        const columnDefs = columns.map((col: any) => {
            return `"${col.name}" ${col.type}`;
        }).join(', ');

        // Construct ORDER BY
        // If MergeTree family and no order by is provided, typically we need at least ORDER BY tuple()
        let orderByClause = '';
        if (engine.includes('MergeTree')) {
            if (orderBy && orderBy.length > 0) {
                const keys = orderBy.map((k: string) => `"${k}"`).join(', ');
                orderByClause = `ORDER BY (${keys})`;
            } else {
                orderByClause = `ORDER BY tuple()`;
            }
        }

        const query = `
      CREATE TABLE "${database}"."${name}"
      (
        ${columnDefs}
      )
      ENGINE = ${engine}
      ${orderByClause}
    `;

        await ClickHouseRepository.execute(query, undefined, session.connection);

        return NextResponse.json({ success: true, message: `Table ${name} created` });
    } catch (error: any) {
        console.error("Failed to create table:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
