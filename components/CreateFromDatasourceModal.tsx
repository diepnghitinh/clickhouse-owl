'use client';

import React, { useEffect, useState } from 'react';
import { X, Loader2, Database, Table2, ArrowRight, Link, Import } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { DataSource } from '@/components/DataSourceListItem';

interface CreateFromDatasourceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    targetDatabase: string;
}

interface Table {
    name: string;
    schema: string;
    columns: any[];
}

import { useEscapeKey } from '@/hooks/useEscapeKey';
import { Modal } from './ui/Modal';

export function CreateFromDatasourceModal({ isOpen, onClose, onSuccess, targetDatabase }: CreateFromDatasourceModalProps) {
    useEscapeKey(onClose, isOpen);
    const [step, setStep] = useState<1 | 2>(1);
    const [datasources, setDatasources] = useState<DataSource[]>([]);
    const [selectedDs, setSelectedDs] = useState<DataSource | null>(null);
    const [tables, setTables] = useState<Table[]>([]);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [mode, setMode] = useState<'link' | 'import'>('link');
    const [loading, setLoading] = useState(false);
    const [fetchingTables, setFetchingTables] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Load datasources
            const stored = localStorage.getItem('owl_datasources');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    setDatasources(parsed);
                } catch (e) {
                    console.error("Failed to parse datasources");
                }
            }
            // Reset state
            setStep(1);
            setSelectedDs(null);
            setTables([]);
            setSelectedTable(null);
            setMode('link');
            setError('');
        }
    }, [isOpen]);

    const handleSelectDatasource = async (ds: DataSource) => {
        setSelectedDs(ds);
        setFetchingTables(true);
        setError('');
        try {
            const res = await fetch('/api/tables', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ds)
            });
            if (res.ok) {
                const data = await res.json();
                setTables(data);
                setStep(2);
            } else {
                const err = await res.json();
                setError(err.error || 'Failed to fetch tables');
            }
        } catch (e) {
            setError('Failed to fetch tables');
        } finally {
            setFetchingTables(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedDs || !selectedTable) return;

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/tables/create-from-postgres', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceTable: selectedTable.name,
                    targetTable: selectedTable.name,
                    targetDatabase: targetDatabase,
                    connection: selectedDs,
                    mode
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create table');
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <>
                    <Database className="w-5 h-5 text-foreground" />
                    Create from Datasource
                </>
            }
            description={`into ${targetDatabase}`}
        >
            <div className="flex-1 overflow-auto space-y-4 min-h-[300px]">
                {error && (
                    <div className="p-3 mb-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md">
                        {error}
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Select a Source</h3>
                        {datasources.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No datasources found. Go to Data Sources page to add one.
                            </div>
                        ) : (
                            datasources.map(ds => (
                                <button
                                    key={ds.id}
                                    onClick={() => handleSelectDatasource(ds)}
                                    disabled={fetchingTables}
                                    className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                            <Database className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-foreground">{ds.name}</div>
                                            <div className="text-xs text-muted-foreground">{ds.host}:{ds.port}</div>
                                        </div>
                                    </div>
                                    {fetchingTables && selectedDs?.id === ds.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                    ) : (
                                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <button
                            onClick={() => { setStep(1); setSelectedTable(null); }}
                            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
                        >
                            <ArrowRight className="w-3 h-3 rotate-180" /> Back to Sources
                        </button>

                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-3">Select a Table from {selectedDs?.name}</h3>
                            <div className="border border-border rounded-lg max-h-[250px] overflow-y-auto divide-y divide-border">
                                {tables.map(table => (
                                    <button
                                        key={table.name}
                                        onClick={() => setSelectedTable(table)}
                                        className={cn(
                                            "w-full flex items-center justify-between p-3 text-left hover:bg-secondary/50 transition-colors",
                                            selectedTable?.name === table.name && "bg-secondary"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Table2 className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-sm font-medium">{table.name}</span>
                                        </div>
                                        {selectedTable?.name === table.name && (
                                            <div className="w-2 h-2 rounded-full bg-brand" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedTable && (
                            <div className="bg-secondary/20 p-4 rounded-lg border border-border space-y-3">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setMode('link')}
                                        className={cn(
                                            "flex-1 p-3 rounded-lg border-2 text-left transition-all",
                                            mode === 'link' ? "border-brand bg-brand/5" : "border-border hover:border-border/80"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <Link className="w-4 h-4" />
                                            <span className="font-semibold text-sm">Link Table</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Creates a live Proxy table (ENGINE = PostgreSQL). No data is copied.</p>
                                    </button>

                                    <button
                                        onClick={() => setMode('import')}
                                        className={cn(
                                            "flex-1 p-3 rounded-lg border-2 text-left transition-all",
                                            mode === 'import' ? "border-brand bg-brand/5" : "border-border hover:border-border/80"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <Import className="w-4 h-4" />
                                            <span className="font-semibold text-sm">Import Data</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Copies data into ClickHouse (ENGINE = MergeTree). Good for snapshots.</p>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border bg-background shrink-0">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                >
                    Cancel
                </button>
                {step === 2 && (
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !selectedTable}
                        className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium rounded-md hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Create Table
                    </button>
                )}
            </div>
        </Modal>
    );
}
