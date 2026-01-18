
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { Client } from 'pg';

export async function POST(request: Request) {
    const session = await getSession();
    if (!session.isAuthenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let client: Client | null = null;
    try {
        const body = await request.json();
        const { engine, host, port, username, password, database } = body;

        if (!host || !port || !username || !password || !database) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (engine !== 'PostgreSQL') {
            // For now we only support Postgres via 'pg'
            // If MySQL support is needed, we'd need 'mysql2'
            if (engine === 'MySQL') {
                return NextResponse.json({ error: 'MySQL verification not yet implemented on this route' }, { status: 501 });
            }
            return NextResponse.json({ error: 'Unsupported engine' }, { status: 400 });
        }

        client = new Client({
            host,
            port: parseInt(port),
            user: username,
            password,
            database,
            ssl: false // TODO: Add SSL support option in UI
        });

        await client.connect();

        // simple test query
        await client.query('SELECT 1');

        await client.end();
        client = null;

        return NextResponse.json({ success: true, message: `Successfully connected to ${database}` });

    } catch (error: any) {
        console.error("Failed to connect datasource:", error);
        if (client) {
            try { await client.end(); } catch { }
        }
        return NextResponse.json({ error: error.message || 'Connection failed' }, { status: 500 });
    }
}
