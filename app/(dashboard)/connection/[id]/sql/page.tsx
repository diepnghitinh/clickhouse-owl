'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { CreateTableForm } from '@/components/CreateTableForm';
import { format } from 'sql-formatter';
import { CreateFromDatasourceModal } from '@/components/CreateFromDatasourceModal';
import { TableInspectorModal } from '@/components/TableInspectorModal';
import { RenameTableModal } from '@/components/RenameTableModal';
import { DeleteTableModal } from '@/components/DeleteTableModal';
import { TruncateTableModal } from '@/components/TruncateTableModal';
import { DuplicateTableModal } from '@/components/DuplicateTableModal';

// ... (existing imports)



import { getModelProvider } from '@/lib/ai-config';

// New Components
import { SqlSidebar, TableInfo } from '@/components/sql-console/SqlSidebar';
import { SqlToolbar } from '@/components/sql-console/SqlToolbar';
import { QueryEditor } from '@/components/sql-console/QueryEditor';
import { ResultsTable } from '@/components/sql-console/ResultsTable';
import { QueryPlanViewer } from '@/components/sql-console/QueryPlanViewer';
import { SqlTabs, QueryTab } from '@/components/sql-console/SqlTabs';

interface Connection {
    id: string;
    name: string;
    url: string;
    user: string;
    password?: string;
    database?: string;
}

type ViewMode = 'query' | 'create_table' | 'import_datasource' | 'analyze';

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

    // Tabs State
    const [tabs, setTabs] = useState<QueryTab[]>([
        { id: '1', title: 'Query 1', query: 'SELECT 1', results: null, error: null, executing: false, executionPlan: [] }
    ]);
    const [activeTabId, setActiveTabId] = useState<string>('1');

    const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

    const updateActiveTab = (updates: Partial<QueryTab>) => {
        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, ...updates } : t));
    };

    // AI State
    const [showAiPrompt, setShowAiPrompt] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiModel, setAiModel] = useState<string>(''); // '' = auto/default
    const [cachingContext, setCachingContext] = useState(false);

    // Modals
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [inspectedTable, setInspectedTable] = useState<string | null>(null);
    const [duplicatingTable, setDuplicatingTable] = useState<string | null>(null);
    const [renamingTable, setRenamingTable] = useState<string | null>(null);
    const [truncatingTable, setTruncatingTable] = useState<string | null>(null);
    const [deletingTable, setDeletingTable] = useState<string | null>(null);

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

    // Tab Handlers
    const handleAddTab = () => {
        const newId = Date.now().toString();
        const newTab: QueryTab = {
            id: newId,
            title: `Query ${tabs.length + 1}`,
            query: '',
            results: null,
            error: null,
            executing: false,
            executionPlan: []
        };
        setTabs([...tabs, newTab]);
        setActiveTabId(newId);
    };

    const handleCloseTab = (id: string) => {
        if (tabs.length === 1) return;

        const newTabs = tabs.filter(t => t.id !== id);
        setTabs(newTabs);

        if (id === activeTabId) {
            setActiveTabId(newTabs[newTabs.length - 1].id);
        }
    };

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
            const claudeKey = localStorage.getItem('claude_api_key');

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
                } else if (p === 'claude') {
                    provider = 'claude';
                    apiKey = claudeKey || '';
                }
            } else {
                // Auto-detect
                if (openaiKey) {
                    provider = 'openai';
                    apiKey = openaiKey;
                } else if (geminiKey) {
                    provider = 'gemini';
                    apiKey = geminiKey;
                } else if (claudeKey) {
                    provider = 'claude';
                    apiKey = claudeKey;
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
                updateActiveTab({ query: data.sql });
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

    const editorRef = useRef<any>(null);

    const executeQuery = async () => {
        if (!connection || !selectedDatabase) return;

        let queryToExecute = activeTab.query;

        // Check for selected text
        if (editorRef.current) {
            const model = editorRef.current.getModel();
            const selection = editorRef.current.getSelection();
            if (model && selection && !selection.isEmpty()) {
                queryToExecute = model.getValueInRange(selection);
            }
        }

        updateActiveTab({ executing: true, error: null, results: null });
        setActiveView('query');

        try {
            const res = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: queryToExecute,
                    database: selectedDatabase,
                    connection: connection
                })
            });

            const data = await res.json();

            if (data.error) {
                updateActiveTab({ error: data.error });
            } else {
                updateActiveTab({ results: data });
            }
        } catch (e: any) {
            updateActiveTab({ error: e.message || "An error occurred" });
        } finally {
            updateActiveTab({ executing: false });
        }
    };

    const handleAnalyze = async () => {
        if (!connection || !selectedDatabase) return;

        updateActiveTab({ executing: true, error: null, executionPlan: [] });
        setActiveView('analyze');

        try {
            let queryToAnalyze = activeTab.query;
            if (editorRef.current) {
                const model = editorRef.current.getModel();
                const selection = editorRef.current.getSelection();
                if (model && selection && !selection.isEmpty()) {
                    queryToAnalyze = model.getValueInRange(selection);
                }
            }

            // ClickHouse EXPLAIN syntax: EXPLAIN PLAN json=1 <query>
            const explainQuery = `EXPLAIN PLAN json=1 ${queryToAnalyze}`;

            const res = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: explainQuery,
                    database: selectedDatabase,
                    connection: connection
                })
            });

            const data = await res.json();

            if (data.error) {
                updateActiveTab({ error: data.error });
            } else if (data.rows && data.rows.length > 0) {
                // Result is usually a single string field containing JSON
                const jsonStr = data.rows[0][0];
                try {
                    let plan = JSON.parse(jsonStr);
                    // ClickHouse EXPLAIN json=1 returns an array of { Plan: ... } sometimes
                    if (Array.isArray(plan) && plan.length > 0 && plan[0].Plan) {
                        plan = plan.map((p: any) => p.Plan);
                    }
                    updateActiveTab({ executionPlan: plan });
                } catch (parseErr) {
                    updateActiveTab({ error: "Failed to parse execution plan JSON. Ensure your ClickHouse version supports 'json=1'. Output: " + jsonStr });
                }
            } else {
                updateActiveTab({ error: "No execution plan returned." });
            }
        } catch (e: any) {
            updateActiveTab({ error: e.message || "An error occurred during analysis" });
        } finally {
            updateActiveTab({ executing: false });
        }
    };

    const executeDuplicateTable = async (newName: string, engine: string, copyData: boolean) => {
        if (!connection || !selectedDatabase || !duplicatingTable) return;

        const ddl = `CREATE TABLE ${selectedDatabase}.${newName} ENGINE = ${engine} AS ${selectedDatabase}.${duplicatingTable}`;

        try {
            // 1. Create Table Structure
            const res = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: ddl,
                    database: selectedDatabase,
                    connection: connection
                })
            });

            const data = await res.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // 2. Copy Data (if requested)
            if (copyData) {
                const dml = `INSERT INTO ${selectedDatabase}.${newName} SELECT * FROM ${selectedDatabase}.${duplicatingTable}`;
                const resData = await fetch('/api/query', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: dml,
                        database: selectedDatabase,
                        connection: connection
                    })
                });

                const dataData = await resData.json();
                if (dataData.error) {
                    throw new Error(`Table created but failed to copy data: ${dataData.error}`);
                }
            }

            // Refresh tables
            fetchTables();

        } catch (e: any) {
            throw e;
        }
    };

    const handleRenameTable = async (newName: string) => {
        if (!connection || !selectedDatabase || !renamingTable) return;

        try {
            const query = `RENAME TABLE ${selectedDatabase}.${renamingTable} TO ${selectedDatabase}.${newName}`;
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
                throw new Error(data.error);
            }

            fetchTables();
            setRenamingTable(null);
        } catch (e: any) {
            throw e;
        }
    };

    const handleDeleteTable = async () => {
        if (!connection || !selectedDatabase || !deletingTable) return;

        try {
            const query = `DROP TABLE ${selectedDatabase}.${deletingTable}`;
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
                throw new Error(data.error);
            }

            fetchTables();
            setDeletingTable(null);
        } catch (e: any) {
            throw e;
        }
    };

    const handleTruncateTable = async () => {
        if (!connection || !selectedDatabase || !truncatingTable) return;

        try {
            const query = `TRUNCATE TABLE ${selectedDatabase}.${truncatingTable}`;
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
                throw new Error(data.error);
            }

            setTruncatingTable(null);
        } catch (e: any) {
            throw e;
        }
    };

    const handleTableClick = (tableName: string) => {
        updateActiveTab({ query: `SELECT * FROM ${tableName} LIMIT 100` });
        setActiveView('query');
    };

    const handleFormat = () => {
        try {
            const formatted = format(activeTab.query, {
                language: 'clickhouse',
                keywordCase: 'upper',
            });
            updateActiveTab({ query: formatted });
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
                onDuplicateTable={setDuplicatingTable}
                onRenameTable={setRenamingTable}
                onTruncateTable={setTruncatingTable}
                onDeleteTable={setDeletingTable}
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
                        {/* Tabs Bar */}
                        <SqlTabs
                            tabs={tabs}
                            activeTabId={activeTabId}
                            onTabChange={setActiveTabId}
                            onCloseTab={handleCloseTab}
                            onAddTab={handleAddTab}
                        />

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
                            executing={activeTab.executing}
                            onRun={executeQuery}
                            onFormat={handleFormat}
                            onAnalyze={handleAnalyze}
                        />

                        {/* Split Panes: Editor & Results */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <QueryEditor
                                key={activeTab.id} // Important: remount editor when switching tabs to reset undo/redo stack if needed, or better, to just reset content correctly
                                query={activeTab.query}
                                onChange={(val) => updateActiveTab({ query: val })}
                                onRun={executeQuery}
                                onEditorMount={(editor) => { editorRef.current = editor; }}
                            />

                            {activeView === 'analyze' ? (
                                <QueryPlanViewer
                                    plan={activeTab.executionPlan || []}
                                    onClose={() => setActiveView('query')}
                                />
                            ) : (
                                <ResultsTable
                                    results={activeTab.results}
                                    error={activeTab.error}
                                    executing={activeTab.executing}
                                />
                            )}
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

            {duplicatingTable && (
                <DuplicateTableModal
                    isOpen={!!duplicatingTable}
                    onClose={() => setDuplicatingTable(null)}
                    tableName={duplicatingTable}
                    onDuplicate={executeDuplicateTable}
                />
            )}

            {renamingTable && (
                <RenameTableModal
                    isOpen={!!renamingTable}
                    onClose={() => setRenamingTable(null)}
                    currentName={renamingTable}
                    onRename={handleRenameTable}
                />
            )}

            {deletingTable && (
                <DeleteTableModal
                    isOpen={!!deletingTable}
                    onClose={() => setDeletingTable(null)}
                    tableName={deletingTable}
                    onDelete={handleDeleteTable}
                />
            )}

            {truncatingTable && (
                <TruncateTableModal
                    isOpen={!!truncatingTable}
                    onClose={() => setTruncatingTable(null)}
                    tableName={truncatingTable}
                    onTruncate={handleTruncateTable}
                />
            )}
        </div>
    );
}
