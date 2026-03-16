
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { Client } from 'pg';
import { MongoClient } from 'mongodb';

function flattenKeys(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') return [];
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    keys.push(key);
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      keys.push(...flattenKeys(v, key));
    }
  }
  return keys;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let client: Client | null = null;
  let mongoClient: MongoClient | null = null;
  try {
    const body = await request.json();
    const { host, port, username, password, database, engine, ssl, authSource } = body;

    if (!host || !port || !database) {
      return NextResponse.json({ error: 'Missing connection details' }, { status: 400 });
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
      mongoClient = new MongoClient(url);
      await mongoClient.connect();
      const db = mongoClient.db(database);
      const collections = await db.listCollections().toArray();
      const tables: { name: string; schema: string; columns: { name: string; type: string }[] }[] = [];

      for (const col of collections) {
        const name = col.name;
        const sample = await db.collection(name).findOne();
        const columns = sample
          ? [...new Set(flattenKeys(sample))].slice(0, 50).map((key) => ({ name: key, type: 'String' }))
          : [{ name: '_id', type: 'String' }];
        if (columns.length === 0) columns.push({ name: '_id', type: 'String' });
        tables.push({ name, schema: database, columns });
      }

      await mongoClient.close();
      mongoClient = null;
      return NextResponse.json(tables);
    }

    if (engine !== 'PostgreSQL') {
      return NextResponse.json({ error: 'Only PostgreSQL and MongoDB supported for listing tables' }, { status: 400 });
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

    const res = await client.query(`
        SELECT 
            table_name, 
            table_schema 
        FROM information_schema.tables 
        WHERE table_schema NOT IN ('information_schema', 'pg_catalog') 
          AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    `);

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
    if (mongoClient) {
      try { await mongoClient.close(); } catch { }
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
