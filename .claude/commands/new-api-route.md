Create a new Next.js API route for ClickHouse Owl.

Ask the user for:
1. The resource name (e.g. `tables`, `databases`, `schema`)
2. HTTP method(s) needed (GET, POST, DELETE)
3. What the route should do

Then scaffold `app/api/<resource>/route.ts` following the project pattern:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { ClickHouseRepository } from "@/lib/infrastructure/clickhouse/repositories/clickhouse.repository";
import { z } from "zod";

const requestSchema = z.object({
  // fields here
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isAuthenticated || !session.connection) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await ClickHouseRepository.execute(session.connection, `YOUR SQL`);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

Rules:
- Always validate with Zod before reading body fields
- Always check `session.isAuthenticated` before proceeding
- Use `quoteIdentifier()` from `@/lib/utils` for any SQL identifiers
- Use `escapeSql()` for any SQL string values
- Return `{ columns, rows, statistics }` for data queries, `{ success: true }` for mutations
