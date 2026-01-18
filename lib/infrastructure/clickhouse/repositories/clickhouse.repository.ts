import { createClient, ClickHouseClient } from '@clickhouse/client';

export interface ConnectionConfig {
    url: string;
    username: string;
    password?: string;
    database?: string;
}

export interface QueryResult<T = any> {
    columns: string[];
    rows: T[][];
    statistics?: {
        elapsed: number;
        rows_read: number;
        bytes_read: number;
    };
}

export class ClickHouseRepository {
    private client: ClickHouseClient;

    constructor(config?: ConnectionConfig) {
        if (config) {
            this.client = this.createClient(config);
        } else {
            // Default client from env
            this.client = createClient({
                url: process.env.CLICKHOUSE_URL,
                username: process.env.CLICKHOUSE_USER,
                password: process.env.CLICKHOUSE_PASSWORD,
                database: process.env.CLICKHOUSE_DATABASE,
            });
        }
    }

    private createClient(config: ConnectionConfig): ClickHouseClient {
        return createClient({
            url: config.url,
            username: config.username,
            password: config.password,
            database: config.database,
        });
    }

    /**
     * Executes a query against ClickHouse.
     * Uses the instance client unless a specific connection config is provided for this query.
     */
    async executeQuery(
        query: string,
        database?: string,
        connectionConfig?: ConnectionConfig
    ): Promise<QueryResult> {
        let client = this.client;

        if (connectionConfig) {
            client = this.createClient(connectionConfig);
        }

        try {
            const resultSet = await client.query({
                query,
                format: 'JSONCompact',
                clickhouse_settings: { database: database || undefined },
            });

            const json = await resultSet.json<{
                meta?: Array<{ name: string }>;
                data?: any[][];
                statistics?: {
                    elapsed: number;
                    rows_read: number;
                    bytes_read: number;
                }
            }>();

            return {
                columns: json.meta?.map(m => m.name) || [],
                rows: (json.data as any[][]) || [],
                statistics: json.statistics
            };
        } catch (e: any) {
            console.error('ClickHouse Query Error:', e.message);
            // Re-throw or return empty based on preference. 
            // Existing logic returned empty on error in some cases, but throwing is better for API handling.
            // However, to match existing behavior:
            if (e.message.includes('Syntax error') || e.message.includes('Code: 62')) {
                throw e; // Let syntax errors bubble up
            }
            // For DDLs that don't return data, validation usually passes.
            return { columns: [], rows: [] };
        }
    }

    // Static helper to match previous usage pattern if needed
    static async execute(
        query: string,
        database?: string,
        config?: ConnectionConfig
    ) {
        const repo = new ClickHouseRepository(config);
        return repo.executeQuery(query, database);
    }
}
