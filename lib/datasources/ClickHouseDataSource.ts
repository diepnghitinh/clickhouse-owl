import { IDataSource, TableDefinition, ColumnDefinition } from './types';
import { ClickHouseRepository, ConnectionConfig } from '@/lib/infrastructure/clickhouse/repositories/clickhouse.repository';

export class BaseClickHouseDataSource implements IDataSource {
    constructor(
        protected database: string,
        protected connection?: ConnectionConfig
    ) { }

    async listTables(): Promise<TableDefinition[]> {
        // Default implementation using system tables
        const query = `
            SELECT name, database, engine 
            FROM system.tables 
            WHERE database = '${this.database}' 
            ORDER BY name
        `;
        const result = await ClickHouseRepository.execute(query, this.database, this.connection);

        // Populate columns for each table is expensive N+1. 
        // For list tables, we might just return names and basic info.
        // If the UI expects columns, we should optimize or fetch lazily.
        // The current API contract seemingly returns columns.

        // Optimization: Fetch all columns for this database
        const colsQuery = `
            SELECT table, name, type, is_in_primary_key, default_expression 
            FROM system.columns 
            WHERE database = '${this.database}' 
            ORDER BY table, position
        `;
        const colsResult = await ClickHouseRepository.execute(colsQuery, this.database, this.connection);

        const output: TableDefinition[] = [];
        const colsMap = new Map<string, ColumnDefinition[]>();

        colsResult.rows.forEach((row: any) => {
            const table = row[0] as string;
            const col: ColumnDefinition = {
                name: row[1],
                type: row[2],
                primary_key: row[3] === 1,
                nullable: !row[3], // simplsitic mapping
                default: row[4] || ''
            };
            if (!colsMap.has(table)) colsMap.set(table, []);
            colsMap.get(table)?.push(col);
        });

        result.rows.forEach((row: any) => {
            output.push({
                name: row[0],
                schema: row[1],
                engine: row[2],
                columns: colsMap.get(row[0]) || []
            });
        });

        return output;
    }

    async getTableSchema(tableName: string): Promise<ColumnDefinition[]> {
        const query = `
            SELECT name, type, is_in_primary_key, default_expression 
            FROM system.columns 
            WHERE database = '${this.database}' AND table = '${tableName}'
            ORDER BY position
        `;
        const result = await ClickHouseRepository.execute(query, this.database, this.connection);

        return result.rows.map((row: any) => ({
            name: row[0],
            type: row[1],
            primary_key: row[2] === 1,
            nullable: !row[2],
            default: row[3] || ''
        }));
    }
}
