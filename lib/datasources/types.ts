export interface TableDefinition {
    name: string;
    schema: string;
    engine?: string;
    columns: ColumnDefinition[];
}

export interface ColumnDefinition {
    name: string;
    type: string;
    default?: string;
    primary_key: boolean;
    nullable: boolean;
}

export interface IDataSource {
    listTables(): Promise<TableDefinition[]>;
    getTableSchema(tableName: string): Promise<ColumnDefinition[]>;
}
