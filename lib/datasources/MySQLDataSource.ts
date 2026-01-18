import { BaseClickHouseDataSource } from './ClickHouseDataSource';
import { ConnectionConfig } from '@/lib/infrastructure/clickhouse/repositories/clickhouse.repository';

export class MySQLDataSource extends BaseClickHouseDataSource {
    constructor(database: string, connection?: ConnectionConfig) {
        super(database, connection);
    }

    // MySQL specific overrides if necessary.
    // For ClickHouse MySQL Engine, system.tables and system.columns generally work fine
    // as ClickHouse integrates the schema.
}
