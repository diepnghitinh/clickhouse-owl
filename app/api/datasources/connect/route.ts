
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
        const { name, engine, host, port, username, password, database } = body;

        if (!name || !engine || !host || !port || !username || !password || !database) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        let engineClause = '';

        if (engine === 'PostgreSQL') {
            engineClause = `PostgreSQL('${host}:${port}', '${database}', '${username}', '${password}')`;
        } else if (engine === 'MySQL') {
            engineClause = `MySQL('${host}:${port}', '${database}', '${username}', '${password}')`;
        } else {
            return NextResponse.json({ error: 'Unsupported engine' }, { status: 400 });
        }

        // Drop existing if any (to update connection)
        await queryClickHouse(`DROP DATABASE IF EXISTS "${name}"`, undefined, session.connection);

        // Create new connection
        const query = `
            CREATE DATABASE "${name}"
            ENGINE = ${engineClause}
        `;

        await queryClickHouse(query, undefined, session.connection);

        return NextResponse.json({ success: true, message: `Connected to ${name} (${engine})` });

    } catch (error: any) {
        console.error("Failed to connect datasource:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
