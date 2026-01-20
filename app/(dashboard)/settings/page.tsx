'use client';

import React, { useEffect, useState } from 'react';
import { Save, Eye, EyeOff, Bot, Database, Download, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

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

            <BackupRestoreSection />
        </div>
    );
}

function BackupRestoreSection() {
    const [importing, setImporting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleExport = () => {
        try {
            const connections = localStorage.getItem('clickhouse_connections');
            const datasources = localStorage.getItem('owl_datasources');

            const exportData = {
                version: 1,
                exportedAt: new Date().toISOString(),
                connections: connections ? JSON.parse(connections) : [],
                datasources: datasources ? JSON.parse(datasources) : []
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `clickhouse-owl-config-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setMessage({ type: 'success', text: 'Configuration exported successfully.' });
            setTimeout(() => setMessage(null), 3000);
        } catch (e: any) {
            console.error("Export failed", e);
            setMessage({ type: 'error', text: 'Failed to export configuration.' });
        }
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const data = JSON.parse(content);

                // Basic validation
                if (!Array.isArray(data.connections) && !Array.isArray(data.datasources)) {
                    throw new Error("Invalid configuration file format.");
                }

                if (Array.isArray(data.connections)) {
                    localStorage.setItem('clickhouse_connections', JSON.stringify(data.connections));
                }

                if (Array.isArray(data.datasources)) {
                    localStorage.setItem('owl_datasources', JSON.stringify(data.datasources));
                }

                setMessage({ type: 'success', text: 'Configuration imported successfully. Reloading...' });

                // Slight delay to show success message before reload
                setTimeout(() => {
                    window.location.reload();
                }, 1500);

            } catch (err: any) {
                console.error("Import failed", err);
                setMessage({ type: 'error', text: 'Failed to import configuration: ' + err.message });
            } finally {
                setImporting(false);
                // Reset input
                e.target.value = '';
            }
        };

        reader.readAsText(file);
    };

    return (
        <div className="mt-8">
            <div className="mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Database className="w-6 h-6 text-brand" />
                    Backup & Restore
                </h2>
                <p className="text-muted-foreground mt-2">
                    Export your connections and datasources to a JSON file, or restore from a backup.
                </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <h3 className="font-medium mb-2">Export Configuration</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Download all your settings including connections and datasources.
                        </p>
                        <Button variant="outline" onClick={handleExport} icon={<Download className="w-4 h-4" />}>
                            Export to JSON
                        </Button>
                    </div>

                    <div className="w-px bg-border hidden sm:block" />

                    <div className="flex-1">
                        <h3 className="font-medium mb-2">Import Configuration</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Restore settings from a previously exported JSON file.
                        </p>
                        <div className="relative">
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleImport}
                                className="hidden"
                                id="config-import"
                                disabled={importing}
                            />
                            <label htmlFor="config-import">
                                <div className={cn(
                                    "inline-flex items-center justify-center gap-2 font-medium transition-all rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer h-10 px-4 text-sm bg-transparent border border-white/10 hover:border-white/20 text-muted-foreground hover:text-brand",
                                    importing && "opacity-50 cursor-not-allowed"
                                )}>
                                    {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                    <span>{importing ? 'Importing...' : 'Import from JSON'}</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {message && (
                    <div className={cn(
                        "p-3 rounded-md text-sm flex items-center gap-2",
                        message.type === 'success' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                    )}>
                        {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {message.text}
                    </div>
                )}
            </div>
        </div>
    );
}
