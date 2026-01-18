import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { DataSourceFactory } from '@/lib/datasources/DataSourceFactory';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const database = searchParams.get('db');

  if (!database) {
    return NextResponse.json({ error: 'Database parameter is required' }, { status: 400 });
  }

  try {
    const dataSource = await DataSourceFactory.createDataSource(database, session.connection);
    const tables = await dataSource.listTables();
    return NextResponse.json(tables);
  } catch (error: any) {
    console.error("Failed to fetch tables:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
