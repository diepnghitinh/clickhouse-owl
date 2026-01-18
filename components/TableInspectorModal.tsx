'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from './ui/Modal';
import { Loader2, Table2, Database, FileText, LayoutList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConnectionConfig } from './AddConnectionModal'; // Reuse type or define locally

interface TableInspectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    tableName: string;
    database: string;
    connection: any; // Using any or ConnectionConfig
}

type Tab = 'schema' | 'preview';

export function TableInspectorModal({ isOpen, onClose, tableName, database, connection }: TableInspectorModalProps) {
    const [activeTab, setActiveTab] = useState<Tab>('schema');
    const [loading, setLoading] = useState(false);
    const [schema, setSchema] = useState<any[]>([]); // Columns info
    const [previewData, setPreviewData] = useState<{ columns: string[], rows: any[][] } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setActiveTab('schema');
            fetchSchema();
            setPreviewData(null);
            setError(null);
        }
    }, [isOpen, tableName, database]);

    const fetchSchema = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `DESCRIBE "${database}"."${tableName}"`,
                    connection
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            // Map describe results: name, type, default_type, default_expression, comment, codec_expression, ttl_expression
            setSchema(data.rows.map((r: any[]) => ({
                name: r[0],
                type: r[1],
                default_type: r[2],
                default_expression: r[3],
                comment: r[4],
                codec_expression: r[5],
                ttl_expression: r[6]
            })));
        } catch (e: any) {
            setError(e.message || 'Failed to fetch schema');
        } finally {
            setLoading(false);
        }
    };

    const fetchPreview = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `SELECT * FROM "${database}"."${tableName}" LIMIT 50`,
                    connection
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setPreviewData({
                columns: data.columns,
                rows: data.rows
            });
        } catch (e: any) {
            setError(e.message || 'Failed to fetch preview');
        } finally {
            setLoading(false);
        }
    };

    // Effect to switch data loading when tab changes
    useEffect(() => {
        if (!isOpen) return;
        if (activeTab === 'schema' && schema.length === 0) fetchSchema();
        if (activeTab === 'preview' && !previewData) fetchPreview();
    }, [activeTab, isOpen]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-secondary rounded-md">
                        <Table2 className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-lg">{tableName}</h2>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <Database className="w-3 h-3" />
                            <span>{database}</span>
                        </div>
                    </div>
                </div>
            }
            className="w-[800px] max-h-[85vh] h-[600px] flex flex-col"
        >
            <div className="flex border-b border-border mb-4 shrink-0">
                <button
                    onClick={() => setActiveTab('schema')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                        activeTab === 'schema'
                            ? "border-brand text-brand"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                >
                    <LayoutList className="w-4 h-4" />
                    Schema
                </button>
                <button
                    onClick={() => setActiveTab('preview')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                        activeTab === 'preview'
                            ? "border-brand text-brand"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                >
                    <FileText className="w-4 h-4" />
                    Preview Data
                </button>
            </div>

            <div className="flex-1 overflow-hidden min-h-0 relative">
                {activeTab === 'schema' && (
                    <div className="h-full overflow-auto custom-scrollbar">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 font-medium border-b border-border">Column</th>
                                    <th className="px-4 py-3 font-medium border-b border-border">Type</th>
                                    <th className="px-4 py-3 font-medium border-b border-border">Default</th>
                                    <th className="px-4 py-3 font-medium border-b border-border">Comment</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {schema.map((col, i) => (
                                    <tr key={i} className="hover:bg-secondary/20">
                                        <td className="px-4 py-2 font-mono font-medium">{col.name}</td>
                                        <td className="px-4 py-2 font-mono text-brand/80">{col.type}</td>
                                        <td className="px-4 py-2 text-muted-foreground italic">
                                            {col.default_expression || '-'}
                                        </td>
                                        <td className="px-4 py-2 text-muted-foreground">{col.comment || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'preview' && (
                    <div className="h-full overflow-auto custom-scrollbar">
                        {previewData ? (
                            <div className="inline-block min-w-full align-top">
                                <table className="min-w-full text-sm text-left">
                                    <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 sticky top-0">
                                        <tr>
                                            {previewData.columns.map((col, i) => (
                                                <th key={i} className="px-4 py-3 font-medium whitespace-nowrap border-b border-border bg-secondary/50">
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border bg-card">
                                        {previewData.rows.map((row, i) => (
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
                        ) : !loading && !error && (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                No data loaded
                            </div>
                        )}
                    </div>
                )}

                {loading && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center pb-20">
                        <Loader2 className="w-8 h-8 animate-spin text-brand" />
                    </div>
                )}

                {error && (
                    <div className="absolute inset-x-4 top-4 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg">
                        {error}
                    </div>
                )}
            </div>
        </Modal>
    );
}
