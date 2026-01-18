'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Play, Database, Server, Loader2, Save, Table2, Plus, Search, FilePlus, Import } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CreateTableModal } from '@/components/CreateTableModal';
import { CreateFromDatasourceModal } from '@/components/CreateFromDatasourceModal';
import { Dropdown } from '@/components/ui/Dropdown';
import { cn } from '@/lib/utils';

interface Connection {
    id: string;
    name: string;
    url: string;
    user: string;
    password?: string;
    database?: string;
}

export default function ConnectionSqlPage() {
    const params = useParams();
    const connectionId = params.id as string;

    const [connection, setConnection] = useState<Connection | null>(null);
    const [databases, setDatabases] = useState<string[]>([]);
    const [selectedDatabase, setSelectedDatabase] = useState<string>('');

    // Table browser state
    const [tables, setTables] = useState<string[]>([]);
    const [loadingTables, setLoadingTables] = useState(false);
    const [tableSearch, setTableSearch] = useState('');

    // Query state
    const [query, setQuery] = useState('SELECT 1');
    const [results, setResults] = useState<{ columns: string[], rows: any[][] } | null>(null);
    const [executing, setExecuting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modals
    const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

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

    const fetchTables = async () => {
        setLoadingTables(true);
        try {
            const res = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: 'SHOW TABLES',
                    database: selectedDatabase,
                    connection: connection
                })
            });

            if (res.ok) {
                const data = await res.json();
                setTables(data.rows.map((r: any[]) => r[0]));
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

    const filteredTables = tables.filter(t => t.toLowerCase().includes(tableSearch.toLowerCase()));

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
                                onClick: () => setIsCreateTableOpen(true)
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
                                <button
                                    key={table}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary/50 rounded-md transition-colors group text-left"
                                    onClick={() => setQuery(`SELECT * FROM ${table} LIMIT 100`)}
                                >
                                    <Table2 className="w-4 h-4 text-muted-foreground group-hover:text-brand" />
                                    <span className="truncate">{table}</span>
                                </button>
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

            {/* Main Content - Query Editor */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="border-b border-border bg-card p-4 flex items-center justify-between gap-4">
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
                                <span className="text-xs text-muted-foreground">
                                    {results.rows.length} rows • {results.columns.length} columns
                                </span>
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

            {/* Modals */}
            <CreateTableModal
                isOpen={isCreateTableOpen}
                onClose={() => setIsCreateTableOpen(false)}
                onSuccess={() => {
                    setIsCreateTableOpen(false);
                    fetchTables();
                }}
                database={selectedDatabase}
            />

            <CreateFromDatasourceModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={() => {
                    setIsImportModalOpen(false);
                    fetchTables();
                }}
                targetDatabase={selectedDatabase}
            />
        </div>
    );
}
