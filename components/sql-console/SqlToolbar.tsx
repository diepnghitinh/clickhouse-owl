import React, { useState } from 'react';
import { Bot, Loader2, Play, Sparkles, X, RefreshCw, Server, AlignLeft, Activity } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AI_MODELS } from '@/lib/ai-config';

interface Connection {
    name: string;
}

interface SqlToolbarProps {
    connection?: Connection | null;
    selectedDatabase: string;
    showAiPrompt: boolean;
    setShowAiPrompt: (show: boolean) => void;
    aiModel: string;
    setAiModel: (model: string) => void;
    aiPrompt: string;
    setAiPrompt: (prompt: string) => void;
    aiGenerating: boolean;
    onAskAi: () => void;
    cachingContext: boolean;
    onRefreshContext: () => void;
    hasContext: boolean;
    executing: boolean;
    onRun: () => void;
    onFormat: () => void;
    onAnalyze: () => void;
}

export function SqlToolbar({
    connection,
    selectedDatabase,
    showAiPrompt,
    setShowAiPrompt,
    aiModel,
    setAiModel,
    aiPrompt,
    setAiPrompt,
    aiGenerating,
    onAskAi,
    cachingContext,
    onRefreshContext,
    hasContext,
    executing,
    onRun,
    onFormat,
    onAnalyze
}: SqlToolbarProps) {
    const statusMessage = aiGenerating ? 'Generating...' : '';

    return (
        <div className="border-b border-border bg-card p-4 flex items-center justify-between gap-4 shrink-0 relative">
            {showAiPrompt && (
                <div className="absolute inset-0 bg-card z-10 flex items-center px-4 gap-2 animate-in fade-in slide-in-from-top-2">
                    <Bot className="w-5 h-5 text-brand" />

                    <select
                        className="h-8 text-xs bg-secondary/50 border-none rounded-md focus:ring-1 focus:ring-brand focus:outline-none px-2 max-w-[100px]"
                        value={aiModel}
                        onChange={e => setAiModel(e.target.value)}
                    >
                        <option value="">Auto</option>
                        {AI_MODELS.map(model => (
                            <option key={model.id} value={model.id}>
                                {model.name}
                            </option>
                        ))}
                    </select>

                    <input
                        autoFocus
                        type="text"
                        placeholder="Ask AI to write a query..."
                        className="flex-1 bg-transparent border-none focus:outline-none text-sm"
                        value={aiPrompt}
                        onChange={e => setAiPrompt(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') onAskAi();
                            if (e.key === 'Escape') setShowAiPrompt(false);
                        }}
                    />
                    <Button
                        size="sm"
                        icon={aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        onClick={onAskAi}
                        disabled={aiGenerating || !aiPrompt.trim()}
                    >
                        {aiGenerating ? (statusMessage || 'Generating...') : 'Generate'}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        icon={cachingContext ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        onClick={onRefreshContext}
                        disabled={cachingContext || !hasContext}
                        title="Refresh AI Context (Schema & Data)"
                        className="border-none bg-transparent hover:bg-secondary/50"
                    />
                    <button onClick={() => setShowAiPrompt(false)} className="p-1 hover:bg-secondary rounded-md">
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>
            )}

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/30 rounded-md border border-border">
                    <Server className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{connection?.name || 'Loading...'}</span>
                </div>
                <div className="h-4 w-px bg-border" />
                <span className="text-sm text-muted-foreground font-mono">
                    {selectedDatabase ? `USE ${selectedDatabase}` : 'No Database'}
                </span>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onFormat}
                    title="Format SQL"
                    icon={<AlignLeft className="w-4 h-4" />}
                />

                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onAnalyze}
                    title="Explain Query Plan"
                    icon={<Activity className="w-4 h-4" />}
                >
                    Explain
                </Button>

                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAiPrompt(true)}
                    className="gap-2 text-brand border-brand/20 hover:bg-brand/10"
                    icon={<Sparkles className="w-4 h-4" />}
                >
                    Ask AI
                </Button>

                <Button
                    size="sm"
                    onClick={onRun}
                    disabled={executing || !connection}
                    loading={executing}
                    icon={<Play className="w-4 h-4 fill-current" />}
                    className="gap-2"
                >
                    Run
                </Button>
                <span className="text-xs text-muted-foreground mr-2">(Cmd+Enter)</span>
            </div>
        </div>
    );
}
