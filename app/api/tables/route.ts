import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { queryClickHouse } from '@/lib/clickhouse';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const database = searchParams.get('db') || 'default';

  try {
    // Get tables
    const tablesResult = await queryClickHouse(
      `SELECT name, database as schema, engine FROM system.tables WHERE database = '${database}' ORDER BY name`,
      database
    );

    const tables = await Promise.all(tablesResult.rows.map(async (row: any) => {
      const tableName = row[0] as string;

      // Get columns for each table
      const columnsResult = await queryClickHouse(
        `SELECT name, type, is_in_primary_key, default_expression FROM system.columns WHERE database = '${database}' AND table = '${tableName}' ORDER BY position`,
        database
      );

      const columns = columnsResult.rows.map((col: any, idx: number) => ({
        id: idx,
        name: col[0] as string,
        type: col[1] as string,
        primary_key: col[2] === 1,
        nullable: !col[2],
        default: col[3] as string || '',
      }));

      return {
        name: tableName,
        schema: row[1] as string,
        columns,
      };
    }));

    return NextResponse.json(tables);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
