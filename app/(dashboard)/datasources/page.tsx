'use client';

import React from 'react';
import { Database, Plus, Table2, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { AddDataSourceModal } from '@/components/AddDataSourceModal';

interface DataSource {
    name: string;
    engine: string;
    details: string;
}

interface Table {
    name: string;
    schema: string;
    columns: any[];
}

export default function DataSourcesPage() {
    const [datasources, setDatasources] = React.useState<DataSource[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
    const [selectedSource, setSelectedSource] = React.useState<string | null>(null);
    const [tables, setTables] = React.useState<Table[]>([]);
    const [loadingTables, setLoadingTables] = React.useState(false);
    const [importingTable, setImportingTable] = React.useState<string | null>(null);

    const fetchDatasources = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/datasources/postgres');
            if (res.ok) {
                const data = await res.json();
                setDatasources(data);
            }
        } catch (error) {
            console.error('Failed to fetch datasources', error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchDatasources();
    }, []);

    const fetchTables = async (dbName: string) => {
        setLoadingTables(true);
        setTables([]);
        try {
            const res = await fetch(`/api/tables?db=${dbName}`);
            if (res.ok) {
                const data = await res.json();
                setTables(data);
            }
        } catch (error) {
            console.error('Failed to fetch tables', error);
        } finally {
            setLoadingTables(false);
        }
    };

    React.useEffect(() => {
        if (selectedSource) {
            fetchTables(selectedSource);
        } else {
            setTables([]);
        }
    }, [selectedSource]);

    const handleImport = async (table: Table) => {
        if (!selectedSource) return;
        setImportingTable(table.name);
        try {
            const res = await fetch('/api/tables/create-from-postgres', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceDatabase: selectedSource,
                    sourceTable: table.name,
                    targetTable: table.name,
                }),
            });

            if (res.ok) {
                alert(`Table ${table.name} imported successfully!`);
            } else {
                const err = await res.json();
                alert(`Failed to import table: ${err.error}`);
            }
        } catch (error) {
            alert('Failed to import table');
        } finally {
            setImportingTable(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background/50">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
                <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-brand" />
                    <h1 className="text-xl font-semibold">Data Sources</h1>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-brand text-white text-sm font-medium rounded-md hover:bg-brand/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add PostgreSQL Source
                </button>
            </div>

            <div className="flex-1 overflow-hidden flex">
                {/* Left: Sources List */}
                <div className="w-[300px] border-r border-border overflow-y-auto p-4 bg-background/30">
                    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        Connected Sources
                    </h2>
                    {loading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {datasources.length === 0 ? (
                                <div className="text-sm text-muted-foreground text-center py-4">No sources connected</div>
                            ) : (
                                datasources.map((ds) => (
                                    <button
                                        key={ds.name}
                                        onClick={() => setSelectedSource(ds.name)}
                                        className={
                                            `w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all
                      ${selectedSource === ds.name
                                                ? 'bg-secondary border-brand/50 ring-1 ring-brand/20 shadow-sm'
                                                : 'bg-card border-border hover:bg-secondary/50 hover:border-border/80'}`
                                        }
                                    >
                                        <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                                            <div className="text-lg">🐘</div>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-medium text-sm truncate">{ds.name}</div>
                                            <div className="text-xs text-muted-foreground truncate opacity-70">PostgreSQL</div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Right: Details / Tables */}
                <div className="flex-1 overflow-y-auto p-6 bg-background/50">
                    {selectedSource ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold flex items-center gap-2">
                                        <Database className="w-4 h-4 text-muted-foreground" />
                                        {selectedSource}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">Select a table to import into ClickHouse</p>
                                </div>
                                <button
                                    onClick={() => fetchTables(selectedSource)}
                                    className="p-2 hover:bg-secondary rounded-md text-muted-foreground transition-colors"
                                    title="Refresh tables"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loadingTables ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            {loadingTables ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                    <p>Loading tables...</p>
                                </div>
                            ) : tables.length === 0 ? (
                                <div className="text-center py-12 border border-dashed border-border rounded-lg bg-card/50">
                                    <Table2 className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                                    <p className="text-muted-foreground">No tables found in this database.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {tables.map((table) => (
                                        <div key={table.name} className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Table2 className="w-4 h-4 text-brand/80" />
                                                    <h3 className="font-medium truncate" title={table.name}>{table.name}</h3>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground mb-4 line-clamp-2 h-8">
                                                Columns: {table.columns.map(c => c.name).join(', ')}
                                            </div>
                                            <button
                                                onClick={() => handleImport(table)}
                                                disabled={importingTable === table.name}
                                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                                            >
                                                {importingTable === table.name ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <ArrowRight className="w-3 h-3" />
                                                )}
                                                Import to ClickHouse
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                            <Database className="w-12 h-12 mb-4" />
                            <p className="text-lg">Select a data source to view tables</p>
                        </div>
                    )}
                </div>
            </div>

            <AddDataSourceModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={() => {
                    fetchDatasources();
                }}
            />
        </div>
    );
}
