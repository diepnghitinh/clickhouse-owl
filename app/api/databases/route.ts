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
    let connectionConfig = session.connection;

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
