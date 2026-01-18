import { BaseClickHouseDataSource } from './ClickHouseDataSource';
import { ConnectionConfig } from '@/lib/infrastructure/clickhouse/repositories/clickhouse.repository';

export class PostgresDataSource extends BaseClickHouseDataSource {
    constructor(database: string, connection?: ConnectionConfig) {
        super(database, connection);
    }

    // Postgres specific overrides if necessary.
    // For ClickHouse PostgreSQL Engine, system.tables and system.columns usually work.

    // Example: If we wanted to use 'DESCRIBE TABLE' explicitly for Postgres tables
    // instead of system.columns which might be cached or different.

    // For now, inheriting the base implementation is sufficient as ClickHouse abstracts it well.
    // But this class exists to fulfill the pattern and allow future deviation.
}
