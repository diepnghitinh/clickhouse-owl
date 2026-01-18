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

export async function PUT(request: Request) {
    const session = await getSession();
    if (!session.isAuthenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { oldName, name, host, port, username, password, database, schema } = body;

        if (!oldName || !name || !host || !port || !username || !password || !database) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Drop old database
        // Use IF EXISTS to be safe, though UI should ensure it exists.
        await queryClickHouse(`DROP DATABASE IF EXISTS "${oldName}"`, undefined, session.connection);

        // 2. Create new database with updated config
        const query = `
      CREATE DATABASE "${name}"
      ENGINE = PostgreSQL('${host}:${port}', '${database}', '${username}', '${password}', '${schema || 'public'}')
    `;

        await queryClickHouse(query, undefined, session.connection);

        return NextResponse.json({ success: true, message: `Data source ${name} updated` });
    } catch (error: any) {
        console.error("Failed to update postgres datasource:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getSession();
    if (!session.isAuthenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name } = body;

        if (!name) {
            return NextResponse.json({ error: 'Missing name' }, { status: 400 });
        }

        const query = `DROP DATABASE IF EXISTS "${name}"`;
        await queryClickHouse(query, undefined, session.connection);

        return NextResponse.json({ success: true, message: `Data source ${name} deleted` });
    } catch (error: any) {
        console.error("Failed to delete postgres datasource:", error);
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
