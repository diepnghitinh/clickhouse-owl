import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateSQL } from '@/lib/ai-config';

const generateSchema = z.object({
    provider: z.enum(['openai', 'gemini']),
    apiKey: z.string().min(1),
    prompt: z.string().min(1),
    schemaContext: z.string().optional(),
    model: z.string().optional(),
    connectionId: z.string().optional(),
    database: z.string().optional()
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { provider, apiKey, prompt, schemaContext: initialSchemaContext, model, connectionId, database } = generateSchema.parse(body);

        let schemaContext = initialSchemaContext || '';

        // Load enriched context from cache if available
        if (connectionId && database) {
            try {
                const fs = await import('fs');
                const path = await import('path');
                const cacheDir = path.join(process.cwd(), 'cache');

                if (fs.existsSync(cacheDir)) {
                    const uid4 = connectionId.substring(0, 4);
                    const files = fs.readdirSync(cacheDir);
                    const relevantFiles = files.filter(f => f.startsWith(`${uid4}_${database}_`));

                    if (relevantFiles.length > 0) {
                        schemaContext += '\n\nAdditional Cached Context (Schema & Data Samples):\n';

                        for (const file of relevantFiles) {
                            // Extract table name from filename: {uid4}_{db}_{table}_{type}.txt
                            // type is either 'schema' or 'data'
                            // table name might contain underscores, so be careful.
                            // Prefix is `${uid4}_${database}_`
                            const prefix = `${uid4}_${database}_`;
                            const suffix = file.substring(prefix.length);
                            const lastUnderscore = suffix.lastIndexOf('_');
                            const tableName = suffix.substring(0, lastUnderscore);
                            const type = suffix.substring(lastUnderscore + 1, suffix.length - 4); // remove .txt

                            const content = fs.readFileSync(path.join(cacheDir, file), 'utf-8');

                            schemaContext += `\n--- Table: ${tableName} (${type}) ---\n${content}\n`;
                        }
                    }
                }
            } catch (err) {
                console.warn('Failed to load cached context:', err);
                // Continue without cache
            }
        }

        let resultSQL = await generateSQL({ provider, apiKey, prompt, schemaContext, model });

        // Clean up basic markdown if the LLM ignored instructions
        resultSQL = resultSQL.replace(/^```sql\n?/, '').replace(/^```\n?/, '').replace(/```$/, '').trim();

        return NextResponse.json({ sql: resultSQL });

    } catch (error: any) {
        console.error('AI Generation Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate SQL' },
            { status: 500 }
        );
    }
}
