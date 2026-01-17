import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createClient } from '@clickhouse/client';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { user, password, url, database } = body;

        // Verify the new connection
        const testClient = createClient({
            url: url || 'http://localhost:8123',
            username: user || 'default',
            password: password || '',
            database: database || 'default',
        });

        await testClient.query({ query: 'SELECT 1' });

        // Update session
        const session = await getSession();
        session.connection = {
            url,
            username: user,
            password,
            database,
        };
        await session.save();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Connection switch failed:', error);
        return NextResponse.json({ error: 'Failed to connect to ClickHouse server' }, { status: 400 });
    }
}
