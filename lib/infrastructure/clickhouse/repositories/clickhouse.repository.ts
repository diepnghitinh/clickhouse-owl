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

        const MAX_RETRIES = 3;
        let lastError: any;

        // Simple heuristic to decide if we expect rows back
        const trimmedQuery = query.trim().toUpperCase();
        const isDataQuery = trimmedQuery.startsWith('SELECT') ||
            trimmedQuery.startsWith('SHOW') ||
            trimmedQuery.startsWith('WITH') ||
            trimmedQuery.startsWith('EXPLAIN') ||
            trimmedQuery.startsWith('DESCRIBE') ||
            trimmedQuery.startsWith('Num');

        for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
            try {
                if (isDataQuery) {
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
                } else {
                    // DDL or other commands
                    const result = await client.command({
                        query,
                        clickhouse_settings: { database: database || undefined },
                    });

                    // result of command is usually just acknowledgment
                    return {
                        columns: ['result'],
                        rows: [['Ok.']],
                        statistics: { elapsed: 0, rows_read: 0, bytes_read: 0 }
                    };
                }
            } catch (e: any) {
                lastError = e;
                const isConnectionRefused = e.message.includes('ECONNREFUSED') || e.code === 'ECONNREFUSED';

                if (isConnectionRefused && attempt <= MAX_RETRIES) {
                    console.warn(`ClickHouse connection refused. Retrying attempt ${attempt}/${MAX_RETRIES}...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff-ish
                    continue;
                }

                // Break immediately for other errors or if retries exhausted
                break;
            }
        }

        // Processing the final error after retries (or immediate non-retry error)
        console.error('ClickHouse Query Error:', lastError.message);

        if (lastError.message.includes('Syntax error') || lastError.message.includes('Code: 62')) {
            throw lastError;
        }

        // throw if it was a connection error that persisted
        if (lastError.message.includes('ECONNREFUSED')) {
            throw new Error(`Failed to connect to ClickHouse after ${MAX_RETRIES} retries: ${lastError.message}`);
        }

        // Propagate other errors so the UI sees them (e.g. Table already exists)
        throw new Error(lastError.message || "Unknown error occurred");
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
