'use client';

import React from 'react';
import { Loader2, Plus, Trash, Table2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface CreateTableFormProps {
    onCancel: () => void;
    onSuccess: () => void;
    database: string;
}

const COMMON_TYPES = [
    'UInt8', 'UInt16', 'UInt32', 'UInt64',
    'Int8', 'Int16', 'Int32', 'Int64',
    'Float32', 'Float64',
    'String', 'Date', 'DateTime', 'Bool', 'UUID'
];

export function CreateTableForm({ onCancel, onSuccess, database }: CreateTableFormProps) {
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    const [name, setName] = React.useState('');
    const [engine, setEngine] = React.useState('MergeTree');
    const [columns, setColumns] = React.useState([
        { name: 'id', type: 'UInt64' }
    ]);
    const [orderBy, setOrderBy] = React.useState<string[]>([]);

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
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-background">
            <div className="border-b border-border p-4 flex items-center gap-4 shrink-0">
                <Button variant="ghost" size="sm" onClick={onCancel}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
                <div>
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                        <Table2 className="w-5 h-5 text-muted-foreground" />
                        Create Table
                    </h2>
                    <p className="text-sm text-muted-foreground">in database <span className="font-mono text-foreground">{database}</span></p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {error && (
                        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-md flex items-center gap-2">
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Table Name</label>
                            <input
                                type="text"
                                required
                                placeholder="my_table"
                                className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">Unique identifier for the table.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Engine</label>
                            <select
                                className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50"
                                value={engine}
                                onChange={e => setEngine(e.target.value)}
                            >
                                <option value="MergeTree">MergeTree (Recommended)</option>
                                <option value="Log">Log</option>
                                <option value="TinyLog">TinyLog</option>
                                <option value="Memory">Memory</option>
                            </select>
                            <p className="text-xs text-muted-foreground">Storage engine determines how data is stored and accessed.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                            <div>
                                <h3 className="text-sm font-medium">Columns</h3>
                                <p className="text-xs text-muted-foreground">Define the schema for your table</p>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddColumn} icon={<Plus className="w-3 h-3" />}>
                                Add Column
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {columns.map((col, idx) => (
                                <div key={idx} className="flex gap-3 items-start group">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            placeholder="Column Name"
                                            className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm font-mono"
                                            value={col.name}
                                            onChange={e => handleColumnChange(idx, 'name', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="w-[180px] relative">
                                        <input
                                            list={`types-${idx}`}
                                            placeholder="Type"
                                            className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm font-mono"
                                            value={col.type}
                                            onChange={e => handleColumnChange(idx, 'type', e.target.value)}
                                            required
                                        />
                                        <datalist id={`types-${idx}`}>
                                            {COMMON_TYPES.map(t => <option key={t} value={t} />)}
                                        </datalist>
                                    </div>
                                    <div className="flex items-center gap-1 pt-0.5">
                                        <button
                                            type="button"
                                            className={cn(
                                                "p-2 rounded-md transition-colors border text-xs font-medium w-16 text-center",
                                                orderBy.includes(col.name) && col.name
                                                    ? "bg-brand/10 text-brand border-brand/20"
                                                    : "border-transparent text-muted-foreground hover:bg-secondary border-border/50"
                                            )}
                                            title="Toggle Primary Key (Order By)"
                                            onClick={() => col.name && toggleOrderBy(col.name)}
                                        >
                                            {orderBy.includes(col.name) ? "PK" : "Set PK"}
                                        </button>
                                        <button
                                            type="button"
                                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                            onClick={() => handleRemoveColumn(idx)}
                                            disabled={columns.length === 1}
                                        >
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-secondary/10 rounded-lg p-4 space-y-2 border border-border/50">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Sorting Key (ORDER BY)</span>
                            {orderBy.length > 0 ? (
                                <span className="font-mono text-xs bg-brand/10 text-brand px-2 py-1 rounded border border-brand/20">
                                    {orderBy.join(', ')}
                                </span>
                            ) : (
                                <span className="text-xs text-muted-foreground italic">None (tuple())</span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            MergeTree tables require an ordering key. Click "Set PK" on columns to add them to the sort order.
                            The Primary Key typically matches the Sorting Key.
                        </p>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onCancel}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={loading || !name}
                            loading={loading}
                        >
                            Create Table
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
