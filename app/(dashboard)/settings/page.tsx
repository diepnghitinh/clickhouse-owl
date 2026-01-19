'use client';

import React, { useEffect, useState } from 'react';
import { Save, Eye, EyeOff, Bot } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function SettingsPage() {
    const [openAIKey, setOpenAIKey] = useState('');
    const [geminiKey, setGeminiKey] = useState('');
    const [claudeKey, setClaudeKey] = useState('');
    const [showOpenAI, setShowOpenAI] = useState(false);
    const [showGemini, setShowGemini] = useState(false);
    const [showClaude, setShowClaude] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const storedOpenAI = localStorage.getItem('openai_api_key');
        const storedGemini = localStorage.getItem('gemini_api_key');
        const storedClaude = localStorage.getItem('claude_api_key');
        if (storedOpenAI) setOpenAIKey(storedOpenAI);
        if (storedGemini) setGeminiKey(storedGemini);
        if (storedClaude) setClaudeKey(storedClaude);
    }, []);

    const handleSave = () => {
        localStorage.setItem('openai_api_key', openAIKey);
        localStorage.setItem('gemini_api_key', geminiKey);
        localStorage.setItem('claude_api_key', claudeKey);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Bot className="w-8 h-8 text-brand" />
                    AI Settings
                </h1>
                <p className="text-muted-foreground mt-2">
                    Configure your API keys to enable AI-powered SQL generation features.
                    Keys are stored locally in your browser and are never saved to our servers.
                </p>
            </div>

            <div className="space-y-6 bg-card border border-border rounded-lg p-6">
                {/* OpenAI */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">OpenAI API Key</label>
                    <div className="relative">
                        <input
                            type={showOpenAI ? 'text' : 'password'}
                            className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-brand/50"
                            placeholder="sk-..."
                            value={openAIKey}
                            onChange={(e) => setOpenAIKey(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowOpenAI(!showOpenAI)}
                            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                        >
                            {showOpenAI ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    <p className="text-xs text-muted-foreground">Used for GPT-4 / GPT-3.5 models.</p>
                </div>

                {/* Claude */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Anthropic Claude API Key</label>
                    <div className="relative">
                        <input
                            type={showClaude ? 'text' : 'password'}
                            className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-brand/50"
                            placeholder="sk-ant-..."
                            value={claudeKey}
                            onChange={(e) => setClaudeKey(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowClaude(!showClaude)}
                            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                        >
                            {showClaude ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    <p className="text-xs text-muted-foreground">Used for Claude 3 models (Sonnet, Opus, Haiku).</p>
                </div>

                {/* Gemini */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Google Gemini API Key</label>
                    <div className="relative">
                        <input
                            type={showGemini ? 'text' : 'password'}
                            className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-brand/50"
                            placeholder="AIza..."
                            value={geminiKey}
                            onChange={(e) => setGeminiKey(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowGemini(!showGemini)}
                            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                        >
                            {showGemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    <p className="text-xs text-muted-foreground">Used for Gemini models.</p>
                </div>

                <div className="pt-4 flex items-center gap-4">
                    <Button onClick={handleSave} icon={<Save className="w-4 h-4" />}>
                        Save Settings
                    </Button>
                    {saved && <span className="text-sm text-green-500 font-medium animate-in fade-in">Saved successfully!</span>}
                </div>
            </div>
        </div>
    );
}
