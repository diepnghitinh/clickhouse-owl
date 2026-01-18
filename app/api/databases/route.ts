import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { ClickHouseRepository } from '@/lib/infrastructure/clickhouse/repositories/clickhouse.repository';

export async function GET() {
  const session = await getSession();
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Use session connection details if available
    const connectionConfig = session.connection;

    const result = await ClickHouseRepository.execute('SHOW DATABASES', undefined, connectionConfig);
    const databases = result.rows.map((row: any) => row[0] as string);
    return NextResponse.json(databases);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
