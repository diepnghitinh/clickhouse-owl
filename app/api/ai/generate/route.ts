import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateSQL } from '@/lib/ai-config';

const generateSchema = z.object({
    provider: z.enum(['openai', 'gemini']),
    apiKey: z.string().min(1),
    prompt: z.string().min(1),
    schemaContext: z.string().optional(),
    model: z.string().optional()
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { provider, apiKey, prompt, schemaContext, model } = generateSchema.parse(body);

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
