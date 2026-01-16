import { useState } from 'react';
import { X, Plus, Trash2, Code2, Play } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { executeQuery } from '../api/client';

interface CreateTableModalProps {
    onClose: () => void;
    onSuccess: () => void;
    database: string;
}

interface ColumnDef {
    id: string; // for key
    name: string;
    type: string;
    nullable: boolean;
    isPrimaryKey: boolean;
}

export function CreateTableModal({ onClose, onSuccess, database }: CreateTableModalProps) {
    const [tableName, setTableName] = useState('');
    const [columns, setColumns] = useState<ColumnDef[]>([
        { id: '1', name: 'id', type: 'UInt64', nullable: false, isPrimaryKey: true }
    ]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addColumn = () => {
        setColumns([
            ...columns,
            { id: Math.random().toString(36).substr(2, 9), name: '', type: 'String', nullable: true, isPrimaryKey: false }
        ]);
    };

    const removeColumn = (id: string) => {
        if (columns.length > 1) {
            setColumns(columns.filter(c => c.id !== id));
        }
    };

    const updateColumn = (id: string, updates: Partial<ColumnDef>) => {
        setColumns(columns.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    const generateSQL = () => {
        if (!tableName.trim()) return '';

        const colDefs = columns.map(c => {
            let def = `${c.name} ${c.type}`;
            if (c.isPrimaryKey) {
                def += ' PRIMARY KEY';
            } else if (!c.nullable) {
                def += ' NOT NULL';
            }
            return def;
        });

        return `CREATE TABLE ${tableName} (\n  ${colDefs.join(',\n  ')}\n);`;
    };

    const handleCreate = async () => {
        setError(null);
        if (!tableName.trim()) {
            setError('Table name is required');
            return;
        }
        if (columns.some(c => !c.name.trim())) {
            setError('All columns must have a name');
            return;
        }

        setLoading(true);
        const sql = generateSQL();

        try {
            const res = await executeQuery(sql, database);
            if (res.error) {
                setError(res.error);
            } else {
                onSuccess();
                onClose();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create table');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-foreground">Create New Table</h2>
                        <p className="text-sm text-muted-foreground">Define schema for {database}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    {error && (
                        <div className="mb-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="mb-6">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Table Name</label>
                        <Input
                            value={tableName}
                            onChange={e => setTableName(e.target.value)}
                            placeholder="e.g. users, orders"
                            autoFocus
                            className="bg-secondary/50 border-input"
                        />
                    </div>

                    <div className="mb-2 flex items-center justify-between">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Columns</label>
                        <Button size="sm" variant="ghost" onClick={addColumn} icon={<Plus className="w-3 h-3" />}>Add Column</Button>
                    </div>

                    <div className="space-y-3">
                        {columns.map((col, index) => (
                            <div key={col.id} className="flex gap-3 items-start animate-fade-in bg-secondary/30 p-3 rounded-lg border border-border hover:border-brand/30 transition-colors">
                                <div className="w-8 h-10 flex items-center justify-center text-muted-foreground text-xs font-mono pt-1">
                                    {index + 1}
                                </div>
                                <div className="flex-1 space-y-3 sm:space-y-0 sm:flex sm:gap-3">
                                    <Input
                                        value={col.name}
                                        onChange={e => updateColumn(col.id, { name: e.target.value })}
                                        placeholder="Column Name"
                                        className="flex-[2] bg-secondary/50 border-input h-9"
                                    />
                                    <select
                                        value={col.type}
                                        onChange={e => updateColumn(col.id, { type: e.target.value })}
                                        className="flex-1 bg-secondary/50 border border-input text-sm rounded-md h-9 px-2 text-foreground focus:border-brand/50 focus:ring-1 focus:ring-brand/50 outline-none"
                                    >
                                        <optgroup label="Integer">
                                            <option value="UInt8">UInt8</option>
                                            <option value="UInt16">UInt16</option>
                                            <option value="UInt32">UInt32</option>
                                            <option value="UInt64">UInt64</option>
                                            <option value="Int8">Int8</option>
                                            <option value="Int16">Int16</option>
                                            <option value="Int32">Int32</option>
                                            <option value="Int64">Int64</option>
                                        </optgroup>
                                        <optgroup label="Float">
                                            <option value="Float32">Float32</option>
                                            <option value="Float64">Float64</option>
                                        </optgroup>
                                        <optgroup label="String">
                                            <option value="String">String</option>
                                            <option value="FixedString(N)">FixedString(N)</option>
                                        </optgroup>
                                        <optgroup label="Date/Time">
                                            <option value="Date">Date</option>
                                            <option value="Date32">Date32</option>
                                            <option value="DateTime">DateTime</option>
                                            <option value="DateTime64">DateTime64</option>
                                        </optgroup>
                                        <optgroup label="Other">
                                            <option value="UUID">UUID</option>
                                            <option value="IPv4">IPv4</option>
                                            <option value="IPv6">IPv6</option>
                                            <option value="Boolean">Boolean</option>
                                            <option value="Decimal(P,S)">Decimal(P,S)</option>
                                        </optgroup>
                                    </select>
                                    <div className="flex items-center gap-3 pt-2 sm:pt-0">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={col.isPrimaryKey}
                                                onChange={e => updateColumn(col.id, { isPrimaryKey: e.target.checked, nullable: e.target.checked ? false : col.nullable })}
                                                className="w-4 h-4 rounded border-input bg-secondary text-brand focus:ring-brand accent-brand"
                                            />
                                            <span className="text-xs text-muted-foreground">PK</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={col.nullable}
                                                disabled={col.isPrimaryKey}
                                                onChange={e => updateColumn(col.id, { nullable: e.target.checked })}
                                                className="w-4 h-4 rounded border-input bg-secondary text-brand focus:ring-brand accent-brand disabled:opacity-50"
                                            />
                                            <span className="text-xs text-muted-foreground">Null</span>
                                        </label>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeColumn(col.id)}
                                    disabled={columns.length === 1}
                                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-0.5"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 bg-secondary/50 p-4 rounded-lg border border-border">
                        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                            <Code2 className="w-3 h-3" />
                            <span>Generated SQL</span>
                        </div>
                        <pre className="font-mono text-xs text-brand whitespace-pre-wrap overflow-x-auto">
                            {generateSQL() || '-- Define table to see SQL'}
                        </pre>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border bg-secondary/10 flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleCreate} loading={loading} icon={<Play className="w-4 h-4" />}>Create Table</Button>
                </div>
            </div>
        </div>
    );
}
