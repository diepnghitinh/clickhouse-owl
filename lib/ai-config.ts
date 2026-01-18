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
