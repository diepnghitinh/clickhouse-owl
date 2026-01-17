import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createClient } from '@clickhouse/client';
import { z } from 'zod';

const loginSchema = z.object({
  user: z.string().optional(),
  password: z.string().optional(),
  url: z.string().optional(),
  database: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user, password, url, database } = loginSchema.parse(body);

    const connectionConfig = {
      url: url || process.env.CLICKHOUSE_URL || 'http://localhost:8123',
      username: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || '',
      database: database || process.env.CLICKHOUSE_DATABASE || 'default',
    };

    // 1. Check Dashboard Auth (Env vars)
    const dashboardUser = process.env.DASHBOARD_USER;
    const dashboardPassword = process.env.DASHBOARD_PASSWORD;

    if (dashboardUser && dashboardPassword) {
      // If env vars are set, we MUST match them
      if (user !== dashboardUser || password !== dashboardPassword) {
        return NextResponse.json({ error: 'Invalid dashboard credentials' }, { status: 401 });
      }
      // Auth success - we implicitly trust the default connection config
    } else {
      // 2. Fallback: Verify credentials by testing ClickHouse connection
      // Only if dashboard auth is NOT configured
      const testClient = createClient({
        ...connectionConfig,
        username: user || connectionConfig.username,
        password: password || connectionConfig.password,
      });
      await testClient.query({ query: 'SELECT 1' });

      // If we are here, CH auth worked. Update connection config with provided creds if any
      if (user) connectionConfig.username = user;
      if (password) connectionConfig.password = password;
    }

    // Create session
    const session = await getSession();
    session.userId = connectionConfig.username;
    session.username = connectionConfig.username;
    session.isAuthenticated = true;
    session.connection = connectionConfig;
    await session.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
}
