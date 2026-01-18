'use client';

import React from 'react';
import { X, Loader2, Plus, Trash, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface CreateTableModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    database: string;
}

const COMMON_TYPES = [
    'UInt8', 'UInt16', 'UInt32', 'UInt64',
    'Int8', 'Int16', 'Int32', 'Int64',
    'Float32', 'Float64',
    'String', 'Date', 'DateTime', 'Bool', 'UUID'
];

export function CreateTableModal({ isOpen, onClose, onSuccess, database }: CreateTableModalProps) {
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    const [name, setName] = React.useState('');
    const [engine, setEngine] = React.useState('MergeTree');
    const [columns, setColumns] = React.useState([
        { name: 'id', type: 'UInt64' }
    ]);
    const [orderBy, setOrderBy] = React.useState<string[]>([]);

    if (!isOpen) return null;

    const handleAddColumn = () => {
        setColumns([...columns, { name: '', type: 'String' }]);
    };

    const handleRemoveColumn = (idx: number) => {
        const newCols = [...columns];
        newCols.splice(idx, 1);
        setColumns(newCols);
    };

    const handleColumnChange = (idx: number, field: 'name' | 'type', value: string) => {
        const newCols = [...columns];
        newCols[idx] = { ...newCols[idx], [field]: value };
        setColumns(newCols);
    };

    const toggleOrderBy = (colName: string) => {
        if (orderBy.includes(colName)) {
            setOrderBy(orderBy.filter(c => c !== colName));
        } else {
            setOrderBy([...orderBy, colName]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/tables/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    database,
                    name,
                    engine,
                    columns,
                    orderBy: orderBy.length > 0 ? orderBy : undefined
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create table');
            }

            onSuccess();
            // Reset defaults
            setName('');
            setColumns([{ name: 'id', type: 'UInt64' }]);
            setOrderBy([]);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-background border border-border rounded-lg shadow-lg w-[600px] max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-secondary rounded-md">
                            <Table2 className="w-5 h-5 text-foreground" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-lg">Create Table</h2>
                            <p className="text-sm text-muted-foreground">in {database}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-secondary rounded-md transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-6">
                    {error && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Table Name</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. users"
                                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Engine</label>
                            <select
                                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                value={engine}
                                onChange={e => setEngine(e.target.value)}
                            >
                                <option value="MergeTree">MergeTree</option>
                                <option value="Log">Log</option>
                                <option value="TinyLog">TinyLog</option>
                                <option value="Memory">Memory</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium">Columns</label>
                            <Button type="button" variant="ghost" size="sm" onClick={handleAddColumn} icon={<Plus className="w-3 h-3" />}>
                                Add Column
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {columns.map((col, idx) => (
                                <div key={idx} className="flex gap-2 items-start">
                                    <input
                                        type="text"
                                        placeholder="Column Name"
                                        className="flex-1 px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                                        value={col.name}
                                        onChange={e => handleColumnChange(idx, 'name', e.target.value)}
                                        required
                                    />
                                    <div className="w-[140px] relative">
                                        <input
                                            list={`types-${idx}`}
                                            placeholder="Type"
                                            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                                            value={col.type}
                                            onChange={e => handleColumnChange(idx, 'type', e.target.value)}
                                            required
                                        />
                                        <datalist id={`types-${idx}`}>
                                            {COMMON_TYPES.map(t => <option key={t} value={t} />)}
                                        </datalist>
                                    </div>
                                    <button
                                        type="button"
                                        className={cn(
                                            "p-2 rounded-md transition-colors border border-transparent",
                                            orderBy.includes(col.name) && col.name ? "bg-brand/10 text-brand border-brand/20" : "text-muted-foreground hover:bg-secondary"
                                        )}
                                        title="Toggle Primary Key (Order By)"
                                        onClick={() => col.name && toggleOrderBy(col.name)}
                                    >
                                        <div className="text-[10px] font-bold">PK</div>
                                    </button>
                                    <button
                                        type="button"
                                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                        onClick={() => handleRemoveColumn(idx)}
                                        disabled={columns.length === 1}
                                    >
                                        <Trash className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Click <b>PK</b> to add a column to the ORDER BY clause. MergeTree tables require an ordering key (or tuple()).
                        </p>
                    </div>

                    {orderBy.length > 0 && (
                        <div className="text-sm">
                            <span className="font-medium text-muted-foreground">Order By: </span>
                            <span className="font-mono bg-secondary px-1 py-0.5 rounded">{orderBy.join(', ')}</span>
                        </div>
                    )}

                </form>

                <div className="flex justify-end gap-2 p-4 border-t border-border bg-background shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium rounded-md hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Create Table
                    </button>
                </div>
            </div>
        </div>
    );
}
