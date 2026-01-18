'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Database, RefreshCw, Loader2, Table2, ArrowRight } from 'lucide-react';
import { useDatasources } from '@/components/datasources/DatasourceContext';
import { DataSource } from '@/components/DataSourceListItem';

interface Table {
    name: string;
    schema: string;
    columns: any[];
}

export default function DatasourceDetailPage() {
    const { id } = useParams();
    const { datasources, loading: contextLoading } = useDatasources();

    const [activeSource, setActiveSource] = useState<DataSource | null>(null);
    const [tables, setTables] = useState<Table[]>([]);
    const [loadingTables, setLoadingTables] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [importingTable, setImportingTable] = useState<string | null>(null);

    // Find source when ID or datasources change
    useEffect(() => {
        if (!contextLoading && datasources.length > 0) {
            const found = datasources.find(ds => ds.id === id);
            if (found) {
                setActiveSource(found);
                // Auto-connect/fetch tables if not already fetched?
                // Or just wait for user interaction. 
                // Let's auto-fetch for better UX since they clicked on it.
                if (found.id !== activeSource?.id) {
                    handleConnect(found);
                }
            } else {
                setActiveSource(null);
            }
        }
    }, [id, datasources, contextLoading]);

    const handleConnect = async (ds: DataSource) => {
        setIsConnecting(true);
        setTables([]);

        try {
            // 1. Establish Link in ClickHouse (Backend still might need NAME, but mostly uses connection params)
            const res = await fetch('/api/datasources/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ds)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Connection failed');
            }

            // 2. Fetch Tables
            await fetchTables(ds);

        } catch (error: any) {
            console.error(error);
            // alert(`Failed to connect: ${error.message}`);
            // Show error in UI instead of alert?
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
                setTables([]);
            }
        } catch (error) {
            console.error('Failed to fetch tables', error);
            setTables([]);
        } finally {
            setLoadingTables(false);
        }
    };

    const handleImport = async (table: Table, mode: 'import' | 'link' = 'import') => {
        if (!activeSource) return;

        setImportingTable(table.name);
        try {
            const res = await fetch('/api/tables/create-from-postgres', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceTable: table.name,
                    targetTable: table.name, // Default to same name
                    connection: activeSource,
                    mode
                }),
            });

            if (res.ok) {
                alert(`Table ${table.name} ${mode === 'link' ? 'linked' : 'imported'} successfully!`);
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


    if (contextLoading) return <div className="p-6">Loading...</div>;

    if (!activeSource) {
        return (
            <div className="p-6 text-center text-muted-foreground">
                Datasource not found.
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
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
                    {!isConnecting && (
                        <button onClick={() => handleConnect(activeSource)} className="mt-2 text-brand hover:underline text-sm">
                            Try Connecting Again
                        </button>
                    )}
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
                            <div className="text-xs text-muted-foreground line-clamp-5 h-8">
                                Columns: {table.columns.map(c => c.name).join(', ')}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
