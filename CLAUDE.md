# CLAUDE.md — ClickHouse Owl

## Project Overview

ClickHouse Owl is a modern, AI-powered web-based admin management interface for ClickHouse databases. Built with Next.js App Router, TypeScript, Tailwind CSS, and Monaco Editor.

## Tech Stack

- **Framework**: Next.js 15+ with App Router (`app/` directory)
- **Language**: TypeScript (strict mode, `@/*` path alias → repo root)
- **Styling**: Tailwind CSS v4
- **Editor**: Monaco Editor via `@monaco-editor/react`
- **Auth**: `iron-session` (encrypted HTTP-only cookies)
- **Validation**: Zod schemas at API boundaries
- **ClickHouse client**: `@clickhouse/client`
- **External DBs**: `pg` (PostgreSQL), `mongodb`
- **AI providers**: OpenAI, Google Gemini, Anthropic Claude (configured in `lib/ai-config.ts`)

## Dev

```bash
yarn dev    # starts on port 5300
yarn build
yarn lint
```

Path alias: `@/` maps to repo root (e.g. `@/components/...`, `@/lib/...`).

## Architecture Patterns

### Repository Pattern

`lib/infrastructure/clickhouse/repositories/clickhouse.repository.ts` — wraps `@clickhouse/client`.

- Use `ClickHouseRepository.execute(config, query)` for one-off queries from API routes.
- Returns `QueryResult<T>` with `{ columns, rows, statistics }`.
- Differentiates **data queries** (SELECT, SHOW, WITH, EXPLAIN, DESCRIBE) from **mutations** (CREATE, INSERT, DROP, etc.) automatically.
- Includes retry logic (3 attempts).

### Factory Pattern

`lib/datasources/DataSourceFactory.ts` — selects the right datasource implementation at runtime.

- Returns `ClickHouseDataSource`, `PostgresDataSource`, or `MySQLDataSource`.
- All implement `IDataSource` interface from `lib/datasources/types.ts`.

### API Routes

All API routes live in `app/api/`. Follow this structure:

1. Validate request body with Zod schema.
2. Get session via `getIronSession()` from `lib/session.ts`.
3. Extract connection config from session (or request override).
4. Call `ClickHouseRepository.execute()` or relevant datasource client.
5. Return JSON `{ columns, rows, statistics }` on success or `{ error }` on failure.

### Authentication

- Session cookie name: `clickhouse_owl_session`
- Dual-mode: if `DASHBOARD_USER`/`DASHBOARD_PASSWORD` env vars are set → validate against those; otherwise test credentials directly against ClickHouse.
- Middleware at `middleware.ts` protects all routes except `/login`.

### SQL Safety

- Use `quoteIdentifier(name)` (escapes `"` as `""`) for identifiers in generated SQL.
- Use `escapeSql(value)` for string values in generated SQL.
- Never interpolate raw user input into SQL without escaping.

## File Structure

```text
app/
  (auth)/login/          — Login page
  (dashboard)/           — Protected pages (layout checks auth)
    connection/[id]/sql/ — SQL console
    datasources/         — External datasource management
  api/
    auth/                — login / logout
    query/               — SQL execution
    tables/              — CRUD + import from Postgres/MongoDB
    databases/           — List databases
    schema/              — Table schema
    datasources/         — Datasource management
    ai/generate/         — AI SQL generation
    connection/switch/   — Switch active connection
lib/
  infrastructure/clickhouse/repositories/ — ClickHouseRepository
  datasources/           — IDataSource, Factory, implementations
  session.ts             — iron-session config
  ai-config.ts           — AI provider integrations
  clickhouse-constants.ts — Engine types and query commands
components/
  sql-console/           — QueryEditor, ResultsTable, SqlSidebar, SqlTabs, SqlToolbar
  ui/                    — Button, Card, Input, Modal, Badge, Dropdown
  *Modal.tsx             — Operation-specific modal dialogs
hooks/                   — Custom React hooks
middleware.ts            — Route protection
```

## Environment Variables

```bash
SESSION_SECRET=          # Required: 32+ char random string for iron-session
DASHBOARD_USER=          # Optional: fixed dashboard login username
DASHBOARD_PASSWORD=      # Optional: fixed dashboard login password
CLICKHOUSE_URL=          # Optional: default ClickHouse server URL
CLICKHOUSE_USER=
CLICKHOUSE_PASSWORD=
CLICKHOUSE_DATABASE=
```

## MongoDB Import

When importing MongoDB collections (`app/api/tables/create-from-mongodb/`):

- Sample first document to infer schema.
- BSON type mapping: `ObjectId`→`String`, `Long`→`Int64`, `Decimal128`→`Float64`.
- Auto-escape non-standard field names with `quoteIdentifier()`.
- Resulting ClickHouse table uses inferred column types.

## AI SQL Generation

`lib/ai-config.ts` exports `generateSQL(provider, model, apiKey, prompt, schema)`.

- System prompt enforces clean SQL output (no markdown, no explanation).
- Schema context passed as part of the prompt.
- Supported providers: `openai`, `gemini`, `anthropic`.

## Component Conventions

- Use functional React components with TypeScript.
- Local state via `useState`/`useEffect`/`useRef` — no Redux or global state manager.
- Modal components accept `isOpen`, `onClose`, and operation-specific props.
- SQL console components are in `components/sql-console/` and communicate via props/callbacks.
- Reusable primitives are in `components/ui/` — prefer these over raw HTML elements.
