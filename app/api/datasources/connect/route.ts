
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { Client } from 'pg';
import { MongoClient } from 'mongodb';

export async function POST(request: Request) {
    const session = await getSession();
    if (!session.isAuthenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let client: Client | null = null;
    let mongoClient: MongoClient | null = null;
    try {
        const body = await request.json();
        const { engine, host, port, username, password, database, ssl, authSource } = body;

        if (!host || !port || !database) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (engine === 'MongoDB') {
            const portNum = parseInt(String(port), 10);
            const auth = username && password ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';
            const authDb = (authSource && String(authSource).trim()) || 'admin';
            const params = new URLSearchParams({ authSource: authDb });
            if (ssl) params.set('retryWrites', 'true');
            if (ssl) params.set('w', 'majority');
            const qs = params.toString();
            const url = ssl
                ? `mongodb+srv://${auth}${host}/${database}?${qs}`
                : `mongodb://${auth}${host}:${portNum}/${database}?${qs}`;
            mongoClient = new MongoClient(url, { serverSelectionTimeoutMS: 5000 });
            await mongoClient.connect();
            await mongoClient.db(database).command({ ping: 1 });
            await mongoClient.close();
            mongoClient = null;
            return NextResponse.json({ success: true, message: `Successfully connected to ${database}` });
        }

        if (engine !== 'PostgreSQL') {
            if (engine === 'MySQL') {
                return NextResponse.json({ error: 'MySQL verification not yet implemented on this route' }, { status: 501 });
            }
            return NextResponse.json({ error: 'Unsupported engine' }, { status: 400 });
        }

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password required for PostgreSQL' }, { status: 400 });
        }

        client = new Client({
            host,
            port: parseInt(String(port), 10),
            user: username,
            password,
            database,
            ssl: ssl ? { rejectUnauthorized: false } : false
        });

        await client.connect();
        await client.query('SELECT 1');
        await client.end();
        client = null;

        return NextResponse.json({ success: true, message: `Successfully connected to ${database}` });

    } catch (error: any) {
        console.error("Failed to connect datasource:", error);
        if (client) {
            try { await client.end(); } catch { }
        }
        if (mongoClient) {
            try { await mongoClient.close(); } catch { }
        }
        return NextResponse.json({ error: error.message || 'Connection failed' }, { status: 500 });
    }
}
