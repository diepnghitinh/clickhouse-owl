import { IDataSource } from './types';
import { BaseClickHouseDataSource } from './ClickHouseDataSource';
import { PostgresDataSource } from './PostgresDataSource';
import { MySQLDataSource } from './MySQLDataSource';
import { ClickHouseRepository, ConnectionConfig } from '@/lib/infrastructure/clickhouse/repositories/clickhouse.repository';

export class DataSourceFactory {
    static async createDataSource(databaseName: string, connection?: ConnectionConfig): Promise<IDataSource> {
        // 1. Determine engine type of the database
        const query = `
            SELECT engine 
            FROM system.databases 
            WHERE name = '${databaseName}'
        `;

        try {
            const result = await ClickHouseRepository.execute(query, undefined, connection);
            // Default to 'Atomic' if no rows found or error
            const engine = (result.rows && result.rows.length > 0) ? (result.rows[0][0] as string) : 'Atomic';

            if (engine === 'PostgreSQL') {
                return new PostgresDataSource(databaseName, connection);
            } else if (engine === 'MySQL') {
                return new MySQLDataSource(databaseName, connection);
            } else {
                return new BaseClickHouseDataSource(databaseName, connection);
            }
        } catch (error) {
            console.error("Failed to determine database engine, defaulting to Native", error);
            return new BaseClickHouseDataSource(databaseName, connection);
        }
    }
}
