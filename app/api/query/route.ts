import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { ClickHouseRepository } from '@/lib/infrastructure/clickhouse/repositories/clickhouse.repository';
import { z } from 'zod';

const querySchema = z.object({
  query: z.string().min(1),
  database: z.string().optional(),
  connection: z.object({
    url: z.string(),
    username: z.string().optional(),
    user: z.string().optional(),
    password: z.string().optional(),
    database: z.string().optional()
  }).optional()
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { query, database, connection } = querySchema.parse(body);

    // Use provided connection or fall back to session
    // Ideally session should be primary, but for deep linking with localStorage, we allow override
    let connectionConfig: any = connection || session.connection;

    // Normalize user -> username if needed
    if (connectionConfig && connectionConfig.user && !connectionConfig.username) {
      connectionConfig = {
        ...connectionConfig,
        username: connectionConfig.user
      };
    }

    const result = await ClickHouseRepository.execute(query, database, connectionConfig);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { columns: [], rows: [], error: error.message },
      { status: 200 }
    );
  }
}
