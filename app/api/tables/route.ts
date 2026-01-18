
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
    // We expect credentials in the body now
    const body = await request.json();
    const { host, port, username, password, database, engine } = body;

    if (!host || !port || !username || !password || !database) {
      return NextResponse.json({ error: 'Missing connection details' }, { status: 400 });
    }

    if (engine !== 'PostgreSQL') {
      return NextResponse.json({ error: 'Only PostgreSQL supported for now' }, { status: 400 });
    }

    client = new Client({
      host,
      port: parseInt(port),
      user: username,
      password,
      database,
      ssl: false
    });

    await client.connect();

    // Query information_schema for tables
    const res = await client.query(`
        SELECT 
            table_name, 
            table_schema 
        FROM information_schema.tables 
        WHERE table_schema NOT IN ('information_schema', 'pg_catalog') 
          AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    `);

    // For each table, maybe get columns?
    // Doing it in one go might be heavy, let's just list tables first or do a join
    // Let's do a join to get columns
    const columnsRes = await client.query(`
        SELECT 
            table_name, 
            column_name, 
            data_type 
        FROM information_schema.columns 
        WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
        ORDER BY ordinal_position;
    `);

    await client.end();
    client = null;

    // Process result into expected format
    const tablesMap = new Map<string, any>();

    res.rows.forEach((row: any) => {
      tablesMap.set(row.table_name, {
        name: row.table_name,
        schema: row.table_schema,
        columns: []
      });
    });

    columnsRes.rows.forEach((row: any) => {
      const table = tablesMap.get(row.table_name);
      if (table) {
        table.columns.push({
          name: row.column_name,
          type: row.data_type
        });
      }
    });

    return NextResponse.json(Array.from(tablesMap.values()));

  } catch (error: any) {
    console.error("Failed to fetch tables:", error);
    if (client) {
      try { await client.end(); } catch { }
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
