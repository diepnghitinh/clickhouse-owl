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
        const { name, host, port, username, password, database, schema } = body;

        if (!name || !host || !port || !username || !password || !database) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Sanitize input to prevent injection in SQL construction if possible, 
        // though parameter binding is limited in DDL. 
        // We'll rely on basic validation for now.

        const query = `
      CREATE DATABASE IF NOT EXISTS "${name}"
      ENGINE = PostgreSQL('${host}:${port}', '${database}', '${username}', '${password}', '${schema || 'public'}')
    `;

        await queryClickHouse(query, undefined, session.connection);

        return NextResponse.json({ success: true, message: `Data source ${name} created` });
    } catch (error: any) {
        console.error("Failed to create postgres datasource:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET() {
    const session = await getSession();
    if (!session.isAuthenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // List databases that use PostgreSQL engine
        const query = `
      SELECT name, engine, engine_full 
      FROM system.databases 
      WHERE engine = 'PostgreSQL'
    `;

        const result = await queryClickHouse(query, undefined, session.connection);

        const datasources = result.rows.map((row: any) => ({
            name: row[0],
            engine: row[1],
            details: row[2]
        }));

        return NextResponse.json(datasources);
    } catch (error: any) {
        console.error("Failed to list datasources:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
