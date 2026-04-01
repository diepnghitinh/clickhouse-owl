Scaffold a new external datasource implementation for ClickHouse Owl.

Ask the user for:
1. The datasource type name (e.g. `MySQL`, `SQLite`, `Redis`)
2. The npm package/driver to use
3. What `listTables()` and `getTableSchema()` should return

Then:

1. Create `lib/datasources/<Name>DataSource.ts` implementing `IDataSource` from `lib/datasources/types.ts`:

```typescript
import { IDataSource, TableSchema } from "./types";

export class <Name>DataSource implements IDataSource {
  constructor(private config: { host: string; port: number; database: string; user: string; password: string }) {}

  async listTables(): Promise<string[]> {
    // connect and list tables
  }

  async getTableSchema(tableName: string): Promise<TableSchema> {
    // return columns with name and type
  }
}
```

2. Register the new type in `lib/datasources/DataSourceFactory.ts` — add a case to the factory switch/if block.

3. If a new API route is needed to proxy queries to this datasource, scaffold it under `app/api/datasources/<name>/route.ts` following the standard API route pattern.

Rules:
- Always close database connections after queries (use try/finally)
- Map the external DB's column types to ClickHouse-compatible types where relevant
- Do not store credentials in module scope — pass through config every time
