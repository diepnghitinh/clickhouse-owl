'use client';

import React, { useEffect, useState } from 'react';
import { Database, Plus, Table2, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { AddDataSourceModal } from '@/components/AddDataSourceModal';
import { EditDataSourceModal } from '@/components/EditDataSourceModal';
import { DataSourceListItem, DataSource } from '@/components/DataSourceListItem';

interface Table {
    name: string;
    schema: string;
    columns: any[];
}

export default function DataSourcesPage() {
    // Datasources from LocalStorage
    const [datasources, setDatasources] = useState<DataSource[]>([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [sourceToEdit, setSourceToEdit] = useState<DataSource | null>(null);

    // Connection State
    const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null); // ID of active source
    const [isConnecting, setIsConnecting] = useState(false);

    // Table Data
    const [tables, setTables] = useState<Table[]>([]);
    const [loadingTables, setLoadingTables] = useState(false);
    const [importingTable, setImportingTable] = useState<string | null>(null);

    // Initial Load & Migration
    useEffect(() => {
        const stored = localStorage.getItem('owl_datasources');
        if (stored) {
            try {
                let parsed: DataSource[] = JSON.parse(stored);

                // BACKWARD COMPATIBILITY: Ensure every source has an ID
                let modified = false;
                parsed = parsed.map(ds => {
                    if (!ds.id) {
                        modified = true;
                        return { ...ds, id: crypto.randomUUID() };
                    }
                    return ds;
                });

                setDatasources(parsed);
                if (modified) {
                    localStorage.setItem('owl_datasources', JSON.stringify(parsed));
                }
            } catch (e) {
                console.error("Failed to parse datasources", e);
            }
        }
        setLoading(false);
    }, []);

    // Save Helper
    const saveDatasources = (newList: DataSource[]) => {
        setDatasources(newList);
        localStorage.setItem('owl_datasources', JSON.stringify(newList));
    };

    const handleAdd = (data: any) => {
        // Data contains { id, name, engine, ... } provided by modal
        const newSource = {
            ...data,
            // Fallback details string for legacy support
            details: `${data.engine}('${data.host}:${data.port}', '${data.database}', ...)`
        };

        const newList = [...datasources, newSource];
        saveDatasources(newList);
    };

    const handleEdit = (data: any) => {
        // Find and replace by ID
        const newList = datasources.map(ds => ds.id === data.id ? { ...ds, ...data } : ds);
        saveDatasources(newList);
        setIsEditModalOpen(false);
        setSourceToEdit(null);
    };

    const handleDelete = (ds: DataSource) => {
        if (confirm(`Are you sure you want to delete "${ds.name}"?`)) {
            const newList = datasources.filter(d => d.id !== ds.id);
            saveDatasources(newList);
            if (selectedSourceId === ds.id) {
                setSelectedSourceId(null);
                setTables([]);
            }
        }
    };

    const handleConnect = async (ds: DataSource) => {
        setIsConnecting(true);
        setSelectedSourceId(ds.id);
        setTables([]);

        try {
            // 1. Establish Link in ClickHouse (Backend still needs NAME)
            const res = await fetch('/api/datasources/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ds)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Connection failed');
            }

            // 2. Fetch Tables (pass connection details now as we don't store them on backend yet)
            await fetchTables(ds);

        } catch (error: any) {
            console.error(error);
            alert(`Failed to connect: ${error.message}`);
            setSelectedSourceId(null);
        } finally {
            setIsConnecting(false);
        }
    };

    const fetchTables = async (ds: DataSource) => {
        setLoadingTables(true);
        try {
            const res = await fetch('/api/tables', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ds)
            });
            if (res.ok) {
                const data = await res.json();
                setTables(data);
            } else {
                const err = await res.json();
                console.error("Failed to fetch tables", err);
                // clear tables on error
                setTables([]);
            }
        } catch (error) {
            console.error('Failed to fetch tables', error);
            setTables([]);
        } finally {
            setLoadingTables(false);
        }
    };

    const handleImport = async (table: Table) => {
        const activeSource = datasources.find(ds => ds.id === selectedSourceId);
        if (!activeSource) return;

        setImportingTable(table.name);
        try {
            const res = await fetch('/api/tables/create-from-postgres', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceTable: table.name,
                    targetTable: table.name,
                    connection: activeSource // Pass full connection details
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

    const activeSource = datasources.find(ds => ds.id === selectedSourceId);

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
                    Add Source
                </button>
            </div>

            <div className="flex-1 overflow-hidden flex">
                {/* Left: Sources List */}
                <div className="w-[300px] border-r border-border overflow-y-auto p-4 bg-background/30">
                    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        Saved Connections
                    </h2>
                    {loading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {datasources.length === 0 ? (
                                <div className="text-sm text-muted-foreground text-center py-4">No sources saved.</div>
                            ) : (
                                datasources.map((ds) => (
                                    <DataSourceListItem
                                        key={ds.id} // Use ID as key
                                        dataSource={ds}
                                        isActive={selectedSourceId === ds.id} // Use ID for active check
                                        onConnect={handleConnect}
                                        onEdit={(d) => { setSourceToEdit(d); setIsEditModalOpen(true); }}
                                        onDelete={handleDelete}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Right: Details / Tables */}
                <div className="flex-1 overflow-y-auto p-6 bg-background/50">
                    {activeSource ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold flex items-center gap-2">
                                        <Database className="w-4 h-4 text-muted-foreground" />
                                        {activeSource.name}
                                        {isConnecting && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">Select a table to query</p>
                                </div>
                                <button
                                    onClick={() => fetchTables(activeSource)}
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
                                    <p className="text-muted-foreground">No tables found or connection not active.</p>
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
                                                Connect Table
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                            <Database className="w-12 h-12 mb-4" />
                            <p className="text-lg">Select a data source to connect</p>
                        </div>
                    )}
                </div>
            </div>

            <AddDataSourceModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAdd}
            />

            <EditDataSourceModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onEdit={handleEdit}
                initialData={sourceToEdit}
            />
        </div>
    );
}
