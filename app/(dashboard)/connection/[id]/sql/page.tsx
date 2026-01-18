'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Play, Database, Server, Loader2, Save, Table2, Plus, Search, FilePlus, Import, Bot, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CreateTableForm } from '@/components/CreateTableForm'; // Import the new form
import { CreateFromDatasourceModal } from '@/components/CreateFromDatasourceModal';
import { TableInspectorModal } from '@/components/TableInspectorModal';
import { Dropdown } from '@/components/ui/Dropdown';
import { cn } from '@/lib/utils';
import { AI_MODELS, getModelProvider } from '@/lib/ai-config';

interface Connection {
    id: string;
    name: string;
    url: string;
    user: string;
    password?: string;
    database?: string;
}

interface TableInfo {
    name: string;
    engine: string;
}

type ViewMode = 'query' | 'create_table' | 'import_datasource';

export default function ConnectionSqlPage() {
    const params = useParams();
    const connectionId = params.id as string;

    const [connection, setConnection] = useState<Connection | null>(null);
    const [databases, setDatabases] = useState<string[]>([]);
    const [selectedDatabase, setSelectedDatabase] = useState<string>('');

    // Table browser state
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [loadingTables, setLoadingTables] = useState(false);
    const [tableSearch, setTableSearch] = useState('');

    // View State
    const [activeView, setActiveView] = useState<ViewMode>('query');

    // Query state
    const [query, setQuery] = useState('SELECT 1');
    const [results, setResults] = useState<{
        columns: string[],
        rows: any[][],
        statistics?: { elapsed: number; rows_read: number; bytes_read: number; }
    } | null>(null);
    const [executing, setExecuting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [showAiPrompt, setShowAiPrompt] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiModel, setAiModel] = useState<string>(''); // '' = auto/default

    // Modals (only for Import now, if we keep CreateTableForm inline)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Table Inspector State
    const [inspectedTable, setInspectedTable] = useState<string | null>(null);

    // Load connection details
    useEffect(() => {
        const stored = localStorage.getItem('clickhouse_connections');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                const match = parsed.find((c: any) =>
                    c.id === connectionId ||
                    encodeURIComponent(c.name.toLowerCase().replace(/\s+/g, '-')) === connectionId
                );

                if (match) {
                    setConnection(match);
                }
            } catch (e) {
                console.error("Failed to parse connections", e);
            }
        }
    }, [connectionId]);

    // Load databases when connection is ready
    useEffect(() => {
        if (!connection) return;

        const fetchDatabases = async () => {
            try {
                const initialDb = connection.database || 'default';
                setSelectedDatabase(initialDb);

                const res = await fetch('/api/query', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: 'SHOW DATABASES',
                        connection: connection
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    const dbs = data.rows.map((r: any[]) => r[0]);
                    setDatabases(dbs);
                }
            } catch (e) {
                console.error(e);
            }
        };

        fetchDatabases();
    }, [connection]);

    // Fetch tables when database changes
    useEffect(() => {
        if (!connection || !selectedDatabase) return;
        fetchTables();
    }, [connection, selectedDatabase]);

    const handleAskAI = async () => {
        if (!aiPrompt.trim()) return;

        setAiGenerating(true);
        try {
            // Get keys from localStorage
            const openaiKey = localStorage.getItem('openai_api_key');
            const geminiKey = localStorage.getItem('gemini_api_key');

            // Determine provider and available models
            let provider = '';
            let apiKey = '';

            if (aiModel) {
                const p = getModelProvider(aiModel);
                if (p === 'openai') {
                    provider = 'openai';
                    apiKey = openaiKey || '';
                } else if (p === 'gemini') {
                    provider = 'gemini';
                    apiKey = geminiKey || '';
                }
            } else {
                // Auto-detect
                if (openaiKey) {
                    provider = 'openai';
                    apiKey = openaiKey;
                } else if (geminiKey) {
                    provider = 'gemini';
                    apiKey = geminiKey;
                }
            }

            if (!apiKey) {
                alert('Please configure an API Key in Settings first. If selecting a specific model, ensure the corresponding provider key is set.');
                setAiGenerating(false);
                return;
            }

            // Construct Schema Context (simplified: list of tables + columns for the active table if any?)
            // For now, let's just send the list of table names and engines.
            // A better approach would be to fetch 'SHOW CREATE TABLE' for relevant tables, but that's heavy.
            // Let's send the table list.
            const tableList = tables.map(t => `${t.name} (${t.engine})`).join(', ');
            const schemaContext = `Database: ${selectedDatabase}\nTables: ${tableList}`;

            const res = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider,
                    apiKey,
                    prompt: aiPrompt,
                    schemaContext,
                    model: aiModel || undefined
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to generate query');
            }

            const data = await res.json();
            if (data.sql) {
                setQuery(data.sql);
                setShowAiPrompt(false);
                setAiPrompt('');
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setAiGenerating(false);
        }
    };

    const fetchTables = async () => {
        setLoadingTables(true);
        try {
            const res = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: 'SELECT name, engine FROM system.tables WHERE database = \'' + selectedDatabase + '\' ORDER BY name',
                    connection: connection
                })
            });

            if (res.ok) {
                const data = await res.json();
                setTables(data.rows.map((r: any[]) => ({ name: r[0], engine: r[1] })));
            }
        } catch (e) {
            console.error("Failed to fetch tables", e);
        } finally {
            setLoadingTables(false);
        }
    };

    const executeQuery = async () => {
        if (!connection || !selectedDatabase) return;

        setExecuting(true);
        setError(null);
        setResults(null);

        try {
            const res = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    database: selectedDatabase,
                    connection: connection
                })
            });

            const data = await res.json();

            if (data.error) {
                setError(data.error);
            } else {
                setResults(data);
            }
        } catch (e: any) {
            setError(e.message || "An error occurred");
        } finally {
            setExecuting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            executeQuery();
        }
    };

    const filteredTables = tables.filter(t => t.name.toLowerCase().includes(tableSearch.toLowerCase()));

    const handleTableClick = (tableName: string) => {
        setQuery(`SELECT * FROM ${tableName} LIMIT 100`);
        setActiveView('query'); // Switch back to query view if not already
    };

    return (
        <div className="flex h-full bg-background overflow-hidden">
            {/* Sidebar - Table Browser */}
            <div className="w-[300px] border-r border-border bg-card flex flex-col shrink-0">
                <div className="p-4 border-b border-border space-y-4">
                    {/* Database Selector */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Database</label>
                        <div className="relative">
                            <Database className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                            <select
                                className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 appearance-none"
                                value={selectedDatabase}
                                onChange={(e) => setSelectedDatabase(e.target.value)}
                            >
                                {databases.map(db => (
                                    <option key={db} value={db}>{db}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* New Table / Actions */}
                    <Dropdown
                        menuWidth="w-56"
                        trigger={
                            <button className="w-full flex items-center justify-center gap-2 bg-foreground text-background hover:bg-foreground/90 py-2 rounded-md text-sm font-medium transition-colors">
                                <Plus className="w-4 h-4" />
                                <span>New Table</span>
                            </button>
                        }
                        items={[
                            {
                                label: 'Empty Table',
                                icon: <FilePlus className="w-4 h-4" />,
                                onClick: () => setActiveView('create_table')
                            },
                            {
                                label: 'From Datasource',
                                icon: <Import className="w-4 h-4" />,
                                onClick: () => setIsImportModalOpen(true)
                            }
                        ]}
                    />

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search tables..."
                            className="w-full pl-8 pr-3 py-2 bg-secondary/30 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
                            value={tableSearch}
                            onChange={e => setTableSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {loadingTables ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            <div className="px-3 py-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
                                <span>Tables ({tables.length})</span>
                            </div>
                            {filteredTables.map(table => (
                                <div
                                    key={table.name}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary/50 rounded-md transition-colors group cursor-pointer"
                                    onClick={() => handleTableClick(table.name)}
                                >
                                    <Table2 className="w-4 h-4 text-muted-foreground group-hover:text-brand shrink-0" />
                                    <span className="truncate flex-1">{table.name}</span>
                                    {table.engine === 'PostgreSQL' && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-medium">
                                            PSQL
                                        </span>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setInspectedTable(table.name);
                                        }}
                                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-background rounded opacity-0 group-hover:opacity-100 transition-all"
                                        title="Inspect Table Schema & Data"
                                    >
                                        <Bot className="w-3.5 h-3.5 hidden" /> {/* Dummy to keep imports valid if needed, or better use Info */}
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                                    </button>
                                </div>
                            ))}
                            {filteredTables.length === 0 && (
                                <div className="text-center py-8 text-sm text-muted-foreground">
                                    No tables found
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-background">
                {activeView === 'create_table' ? (
                    <CreateTableForm
                        database={selectedDatabase}
                        onCancel={() => setActiveView('query')}
                        onSuccess={() => {
                            setActiveView('query');
                            fetchTables();
                        }}
                    />
                ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                        {/* Query Editor Toolbar */}
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
                                            if (e.key === 'Enter') handleAskAI();
                                            if (e.key === 'Escape') setShowAiPrompt(false);
                                        }}
                                    />
                                    <Button
                                        size="sm"
                                        icon={aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        onClick={handleAskAI}
                                        disabled={aiGenerating || !aiPrompt.trim()}
                                    >
                                        Generate
                                    </Button>
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
                                    variant="outline"
                                    onClick={() => setShowAiPrompt(true)}
                                    className="gap-2 text-brand border-brand/20 hover:bg-brand/10"
                                    icon={<Sparkles className="w-4 h-4" />}
                                >
                                    Ask AI
                                </Button>

                                <Button
                                    onClick={executeQuery}
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

                        {/* Editor Area */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="h-1/2 border-b border-border p-4 relative bg-background">
                                <textarea
                                    className="w-full h-full bg-secondary/10 p-4 font-mono text-sm resize-none focus:outline-none rounded-lg border border-border focus:border-brand/50 custom-scrollbar"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="SELECT * FROM table..."
                                    spellCheck={false}
                                />
                            </div>

                            {/* Results Area */}
                            <div className="h-1/2 bg-card overflow-hidden flex flex-col">
                                <div className="border-b border-border px-4 py-2 bg-secondary/10 flex items-center justify-between shrink-0">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Results</span>
                                    {results && (
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span>
                                                {results.rows.length} rows • {results.columns.length} columns
                                            </span>
                                            {results.statistics && (
                                                <>
                                                    <span className="w-px h-3 bg-border" />
                                                    <span>{results.statistics.elapsed.toFixed(3)}s</span>
                                                    <span className="w-px h-3 bg-border" />
                                                    <span>{results.statistics.rows_read} rows read</span>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                                    {error && (
                                        <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 font-mono text-sm whitespace-pre-wrap">
                                            {error}
                                        </div>
                                    )}

                                    {results && (
                                        <div className="rounded-lg border border-border overflow-hidden inline-block min-w-full align-top">
                                            <table className="min-w-full text-sm text-left">
                                                <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 sticky top-0">
                                                    <tr>
                                                        {results.columns.map((col, i) => (
                                                            <th key={i} className="px-4 py-3 font-medium whitespace-nowrap border-b border-border bg-secondary/50">
                                                                {col}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border bg-card">
                                                    {results.rows.map((row, i) => (
                                                        <tr key={i} className="hover:bg-secondary/20">
                                                            {row.map((cell, j) => (
                                                                <td key={j} className="px-4 py-2 whitespace-nowrap max-w-[300px] truncate border-r border-border/50 last:border-r-0 font-mono text-xs">
                                                                    {typeof cell === 'object' ? JSON.stringify(cell) : String(cell)}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {!results && !error && !executing && (
                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                                            <Play className="w-12 h-12 mb-4 stroke-1" />
                                            <p>Run a query to see results</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <CreateFromDatasourceModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={() => {
                    setIsImportModalOpen(false);
                    fetchTables();
                }}
                targetDatabase={selectedDatabase}
            />

            {inspectedTable && connection && (
                <TableInspectorModal
                    isOpen={!!inspectedTable}
                    onClose={() => setInspectedTable(null)}
                    tableName={inspectedTable}
                    database={selectedDatabase}
                    connection={connection}
                />
            )}
        </div>
    );
}
