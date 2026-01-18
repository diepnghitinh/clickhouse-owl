import { NextResponse } from 'next/server';
import { z } from 'zod';

const generateSchema = z.object({
    provider: z.enum(['openai', 'gemini']),
    apiKey: z.string().min(1),
    prompt: z.string().min(1),
    schemaContext: z.string().optional()
});

const SYSTEM_PROMPT = `You are an expert ClickHouse SQL developer. 
Your task is to generate a valid ClickHouse SQL query based on the user's natural language request and the provided database schema.
Rules:
1. Return ONLY the SQL query. Do not include markdown formatting (like \`\`\`sql), explanations, or comments.
2. Use the provided table and column names exactly as they appear in the schema.
3. If the request is ambiguous, generate the most logical query.
4. Use ClickHouse specific functions where appropriate (e.g. toYYYYMM(), startOfHour(), etc.).
`;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { provider, apiKey, prompt, schemaContext } = generateSchema.parse(body);

        const fullPrompt = `
Schema Context:
${schemaContext || 'No schema provided.'}

User Request: ${prompt}

Generate a ClickHouse SQL query.`;

        let resultSQL = '';

        if (provider === 'openai') {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o', // Default to 4o or 3.5-turbo if 4o fails? Let's use gpt-4o as it's standard now, user can change if issues.
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: fullPrompt }
                    ],
                    temperature: 0.2
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(`OpenAI API Error: ${err.error?.message || res.statusText}`);
            }

            const data = await res.json();
            resultSQL = data.choices[0]?.message?.content || '';

        } else if (provider === 'gemini') {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: SYSTEM_PROMPT + "\n\n" + fullPrompt
                        }]
                    }]
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(`Gemini API Error: ${err.error?.message || res.statusText}`);
            }

            const data = await res.json();
            resultSQL = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }

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
