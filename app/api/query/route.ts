import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { queryClickHouse } from '@/lib/clickhouse';
import { z } from 'zod';

const querySchema = z.object({
  query: z.string().min(1),
  database: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { query, database } = querySchema.parse(body);

    // Use session connection details if available
    const connectionConfig = session.connection;

    const result = await queryClickHouse(query, database, connectionConfig);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { columns: [], rows: [], error: error.message },
      { status: 200 }
    );
  }
}
