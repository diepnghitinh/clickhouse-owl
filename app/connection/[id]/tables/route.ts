
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { queryClickHouse } from '@/lib/clickhouse';
import { z } from 'zod';

const schema = z.object({
    database: z.string(),
    connection: z.object({
        url: z.string(),
        username: z.string(),
        password: z.string().optional(),
        database: z.string().optional()
    }).optional()
});

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const session = await getSession();
    if (!session.isAuthenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { database, connection } = schema.parse(body);

        // Use provided connection or fall back to session
        const connectionConfig = connection || session.connection;

        const query = `
        SELECT name, database, engine, uuid 
        FROM system.tables 
        WHERE database = '${database}' 
        ORDER BY name
    `;

        const result = await queryClickHouse(query, database, connectionConfig);

        // Transform to expected frontend format if needed
        // The queryClickHouse return { columns: [], rows: [] }
        // We can return it directly and let frontend map it, or map it here.
        // Frontend expects: { columns: [], rows: [] } (from my previous edit to page.tsx)

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Failed to fetch tables:", error);
        return NextResponse.json(
            { columns: [], rows: [], error: error.message },
            { status: 500 }
        );
    }
}

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const session = await getSession();
    if (!session.isAuthenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const db = searchParams.get('db');

    if (!db) {
        return NextResponse.json({ error: 'Missing db parameter' }, { status: 400 });
    }

    try {
        // Try to get connection from Header (stateless/deep link support)
        // headers.get return null if missing
        const connectionHeader = request.headers.get('x-clickhouse-connection');
        let connectionConfig = session.connection;

        if (connectionHeader) {
            try {
                connectionConfig = JSON.parse(connectionHeader);
            } catch (e) {
                console.error("Failed to parse connection header", e);
            }
        }

        const query = `
        SELECT name, database, engine, uuid 
        FROM system.tables 
        WHERE database = '${db}' 
        ORDER BY name
    `;

        const result = await queryClickHouse(query, db, connectionConfig);
        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Failed to fetch tables:", error);
        return NextResponse.json(
            { columns: [], rows: [], error: error.message },
            { status: 500 }
        );
    }
}
