import { createClient } from '@clickhouse/client';
import { ClickHouseClient } from '@clickhouse/client';

export interface ConnectionConfig {
  url: string;
  username: string;
  password?: string;
  database?: string;
}

export const getClient = (config: ConnectionConfig) => {
  return createClient({
    url: config.url,
    username: config.username,
    password: config.password,
    database: config.database,
  });
};

// Default client using env vars for backward compatibility or initial server-side needs
export const clickhouse = createClient({
  url: process.env.CLICKHOUSE_URL,
  username: process.env.CLICKHOUSE_USER,
  password: process.env.CLICKHOUSE_PASSWORD,
  database: process.env.CLICKHOUSE_DATABASE,
});

export async function queryClickHouse(
  query: string,
  database?: string,
  clientOrConfig?: ClickHouseClient | ConnectionConfig
): Promise<{ columns: string[]; rows: any[][] }> {
  let client: ClickHouseClient;

  if (!clientOrConfig) {
    client = clickhouse;
  } else if ('query' in clientOrConfig) {
    client = clientOrConfig as ClickHouseClient;
  } else {
    client = getClient(clientOrConfig as ConnectionConfig);
  }

  const resultSet = await client.query({
    query,
    format: 'JSONCompact',
    clickhouse_settings: { database: database || undefined },
  });

  try {
    const json = await resultSet.json<{ meta?: Array<{ name: string }>; data?: any[][] }>();
    return {
      columns: json.meta?.map(m => m.name) || [],
      rows: (json.data as any[][]) || [],
    };
  } catch (e) {
    // If response is empty (e.g. DDL), return empty result
    return { columns: [], rows: [] };
  }
}
