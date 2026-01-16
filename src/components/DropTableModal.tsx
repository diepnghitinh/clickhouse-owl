import { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import { executeQuery } from '../api/client';

interface DropTableModalProps {
    onClose: () => void;
    onSuccess: () => void;
    database: string;
    tableName: string;
}

export function DropTableModal({ onClose, onSuccess, database, tableName }: DropTableModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDrop = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await executeQuery(`DROP TABLE ${tableName}`, database);
            if (res.error) {
                setError(res.error);
            } else {
                onSuccess();
                onClose();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to drop table');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-destructive/5 rounded-t-xl">
                    <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-5 h-5" />
                        <h2 className="text-lg font-bold">Drop Table</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {error && (
                        <div className="mb-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <p className="text-foreground">
                        Are you sure you want to drop table <span className="font-mono font-bold bg-secondary px-1 py-0.5 rounded">{tableName}</span>?
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                        This action cannot be undone. All data in this table will be permanently lost.
                    </p>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border bg-secondary/10 flex justify-end gap-3 rounded-b-xl">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={handleDrop}
                        loading={loading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        icon={<Trash2 className="w-4 h-4" />}
                    >
                        Drop Table
                    </Button>
                </div>
            </div>
        </div>
    );
}
