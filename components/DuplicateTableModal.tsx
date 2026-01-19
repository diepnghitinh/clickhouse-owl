import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Copy, Loader2, AlertCircle } from 'lucide-react';
import { COMMON_ENGINES } from '@/lib/clickhouse-constants';

interface DuplicateTableModalProps {
    isOpen: boolean;
    onClose: () => void;
    tableName: string;
    description?: string; // e.g. "Create a copy of the table structure"
    onDuplicate: (newName: string, engine: string, copyData: boolean) => Promise<void>;
}

export function DuplicateTableModal({
    isOpen,
    onClose,
    tableName,
    onDuplicate
}: DuplicateTableModalProps) {
    const [newName, setNewName] = useState('');
    const [engine, setEngine] = useState('MergeTree');
    const [copyData, setCopyData] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setNewName(`${tableName}_copy`);
            setEngine('MergeTree');
            setCopyData(false);
            setError(null);
            setLoading(false);
        }
    }, [isOpen, tableName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || !engine) return;

        setLoading(true);
        setError(null);

        try {
            await onDuplicate(newName, engine, copyData);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to duplicate table');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Copy className="w-5 h-5 text-brand" />
                    Duplicate Table
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-secondary/20 p-3 rounded-md text-sm text-muted-foreground border border-border">
                    Duplicate schema from <span className="font-semibold text-foreground">{tableName}</span>
                </div>

                {error && (
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-sm font-medium">New Table Name</label>
                    <input
                        autoFocus
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
                        placeholder="new_table_name"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Target Engine</label>
                    <select
                        value={engine}
                        onChange={(e) => setEngine(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
                    >
                        {COMMON_ENGINES.map((eng) => (
                            <option key={eng} value={eng}>{eng}</option>
                        ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                        The new table will have the same structure but use this engine.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        id="copy-data"
                        type="checkbox"
                        checked={copyData}
                        onChange={(e) => setCopyData(e.target.checked)}
                        className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                    />
                    <label htmlFor="copy-data" className="text-sm font-medium cursor-pointer">
                        Copy Data (INSERT INTO ... SELECT * FROM ...)
                    </label>
                </div>

                <div className="pt-4 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading || !newName.trim()}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {copyData ? 'Duplicate & Copy Data' : 'Create Duplicate'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
