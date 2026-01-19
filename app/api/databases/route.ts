import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { ClickHouseRepository } from '@/lib/infrastructure/clickhouse/repositories/clickhouse.repository';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if connection config is passed via header (Base64 encoded)
    // This allows fetching databases for a specific connection (uid4) from the client
    const configHeader = request.headers.get('x-clickhouse-config');
    let connectionConfig: any = session.connection;

    if (configHeader) {
      try {
        const decoded = Buffer.from(configHeader, 'base64').toString('utf-8');
        const parsed = JSON.parse(decoded);
        if (parsed && parsed.url) { // Basic validation
          connectionConfig = parsed;
          // Normalize legacy user -> username
          if (connectionConfig.user && !connectionConfig.username) {
            connectionConfig.username = connectionConfig.user;
          }
        }
      } catch (e) {
        console.warn("Failed to parse x-clickhouse-config header", e);
      }
    }

    if (!connectionConfig) {
      return NextResponse.json({ error: 'Connection config not found' }, { status: 400 });
    }

    const result = await ClickHouseRepository.execute('SHOW DATABASES', undefined, connectionConfig);
    const databases = result.rows.map((row: any) => row[0] as string);
    return NextResponse.json(databases);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const configHeader = request.headers.get('x-clickhouse-config');
    let connectionConfig: any = session.connection;

    if (configHeader) {
      try {
        const decoded = Buffer.from(configHeader, 'base64').toString('utf-8');
        const parsed = JSON.parse(decoded);
        if (parsed && parsed.url) {
          connectionConfig = parsed;
          if (connectionConfig.user && !connectionConfig.username) {
            connectionConfig.username = connectionConfig.user;
          }
        }
      } catch (e) {
        console.warn("Failed to parse x-clickhouse-config header", e);
      }
    }

    if (!connectionConfig) {
      return NextResponse.json({ error: 'Connection config not found' }, { status: 400 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Database name is required' }, { status: 400 });
    }

    // Sanitize database name to prevent injection (though parameterization is better, drop database usually doesn't support params in some drivers)
    // ClickHouse repository execute might not support params for DROP DATABASE depending on implementation, 
    // but we should check if it's safe. 
    // Ideally we rely on the driver or validate the name string rigorously (alphanumeric + _).
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      return NextResponse.json({ error: 'Invalid database name' }, { status: 400 });
    }

    await ClickHouseRepository.execute(`DROP DATABASE IF EXISTS ${name}`, undefined, connectionConfig);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
