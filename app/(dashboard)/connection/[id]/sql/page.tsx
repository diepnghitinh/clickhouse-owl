'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CreateTableForm } from '@/components/CreateTableForm';
import { format } from 'sql-formatter';
import { CreateFromDatasourceModal } from '@/components/CreateFromDatasourceModal';
import { TableInspectorModal } from '@/components/TableInspectorModal';
import { getModelProvider } from '@/lib/ai-config';

// New Components
import { SqlSidebar, TableInfo } from '@/components/sql-console/SqlSidebar';
import { SqlToolbar } from '@/components/sql-console/SqlToolbar';
import { QueryEditor } from '@/components/sql-console/QueryEditor';
import { ResultsTable } from '@/components/sql-console/ResultsTable';

interface Connection {
    id: string;
    name: string;
    url: string;
    user: string;
    password?: string;
    database?: string;
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
    const [cachingContext, setCachingContext] = useState(false);

    // Modals
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
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
            // 1. Auto-cache context first
            try {
                if (connection && selectedDatabase && tables.length > 0) {
                    const tableNames = tables.map(t => t.name);
                    await fetch('/api/ai/cache', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            connection,
                            database: selectedDatabase,
                            tables: tableNames
                        })
                    });
                }
            } catch (err) {
                console.error("Failed to auto-cache (proceeding anyway):", err);
            }

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

            // Construct Schema Context
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
                    model: aiModel || undefined,
                    connectionId: connection?.id,
                    database: selectedDatabase
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

    const handleRefreshContext = async () => {
        if (!connection || !selectedDatabase) return;
        setCachingContext(true);
        try {
            const tableNames = tables.map(t => t.name);
            const res = await fetch('/api/ai/cache', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    connection,
                    database: selectedDatabase,
                    tables: tableNames
                })
            });

            if (!res.ok) {
                console.error('Failed to cache context');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setCachingContext(false);
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

    const handleTableClick = (tableName: string) => {
        setQuery(`SELECT * FROM ${tableName} LIMIT 100`);
        setActiveView('query');
    };

    const handleFormat = () => {
        try {
            const formatted = format(query, {
                language: 'clickhouse',
                keywordCase: 'upper',
            });
            setQuery(formatted);
        } catch (e) {
            console.error("Format error", e);
        }
    };

    return (
        <div className="flex h-full bg-background overflow-hidden">
            <SqlSidebar
                databases={databases}
                selectedDatabase={selectedDatabase}
                onSelectDatabase={setSelectedDatabase}
                tables={tables}
                loadingTables={loadingTables}
                onTableClick={handleTableClick}
                onInspectTable={setInspectedTable}
                onCreateTable={() => setActiveView('create_table')}
                onImportTable={() => setIsImportModalOpen(true)}
            />

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
                        <SqlToolbar
                            connection={connection}
                            selectedDatabase={selectedDatabase}
                            showAiPrompt={showAiPrompt}
                            setShowAiPrompt={setShowAiPrompt}
                            aiModel={aiModel}
                            setAiModel={setAiModel}
                            aiPrompt={aiPrompt}
                            setAiPrompt={setAiPrompt}
                            aiGenerating={aiGenerating}
                            onAskAi={handleAskAI}
                            cachingContext={cachingContext}
                            onRefreshContext={handleRefreshContext}
                            hasContext={tables.length > 0}
                            executing={executing}
                            onRun={executeQuery}
                            onFormat={handleFormat}
                        />

                        {/* Split Panes: Editor & Results */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <QueryEditor
                                query={query}
                                onChange={setQuery}
                                onRun={executeQuery}
                            />

                            <ResultsTable
                                results={results}
                                error={error}
                                executing={executing}
                            />
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
