export interface AIModel {
    id: string;
    name: string;
    provider: 'openai' | 'gemini';
}

export const AI_MODELS: AIModel[] = [
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5', provider: 'openai' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'gemini' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini' },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', provider: 'gemini' },
    { id: 'gemini-flash-latest', name: 'Gemini Flash (Free)', provider: 'gemini' },
];

export const getModelProvider = (modelId: string): 'openai' | 'gemini' | null => {
    const model = AI_MODELS.find(m => m.id === modelId);
    return model ? model.provider : null;
};

export const SYSTEM_PROMPT = `You are an expert ClickHouse SQL developer. 
Your task is to generate a valid ClickHouse SQL query based on the user's natural language request and the provided database schema.
Rules:
1. Return ONLY the SQL query. Do not include markdown formatting (like \`\`\`sql), explanations, or comments.
2. Use the provided table and column names exactly as they appear in the schema.
3. If the request is ambiguous, generate the most logical query.
4. Use ClickHouse specific functions where appropriate (e.g. toYYYYMM(), startOfHour(), etc.).
5. After generate SQL query, also generate the explanation of the query (commented in the SQL query).
`;

interface GenerateSQLParams {
    provider: 'openai' | 'gemini';
    apiKey: string;
    prompt: string;
    schemaContext?: string;
    model?: string;
}

export async function generateSQL({ provider, apiKey, prompt, schemaContext, model }: GenerateSQLParams): Promise<string> {
    const fullPrompt = `
Schema Context:
${schemaContext || 'No schema provided.'}

User Request: ${prompt}

Generate a ClickHouse SQL query.`;

    if (provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model || 'gpt-4o',
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
        return data.choices[0]?.message?.content || '';

    } else if (provider === 'gemini') {
        const targetModel = model || 'gemini-pro';
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`, {
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
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    throw new Error('Invalid provider');
}
