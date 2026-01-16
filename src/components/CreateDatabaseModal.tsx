import { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { X, Database, Plus, Code2, Play } from 'lucide-react';
import { executeQuery } from '../api/client';

interface CreateDatabaseModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export function CreateDatabaseModal({ onClose, onSuccess }: CreateDatabaseModalProps) {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        setError(null);

        const result = await executeQuery(`CREATE DATABASE ${name}`);
        setLoading(false);

        if (result.error) {
            setError(result.error);
        } else {
            onSuccess();
            onClose();
        }
    };

    const generateSQL = () => {
        if (!name.trim()) return '';
        return `CREATE DATABASE ${name};`;
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-foreground">Create Database</h2>
                        <p className="text-sm text-muted-foreground">Add a new database instance</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Database Name</label>
                            <Input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g., analytics_dw"
                                autoFocus
                                required
                                className="bg-secondary/50 border-input"
                            />
                        </div>

                        <div className="mt-6 bg-secondary/50 p-4 rounded-lg border border-border">
                            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                                <Code2 className="w-3 h-3" />
                                <span>Generated SQL</span>
                            </div>
                            <pre className="font-mono text-xs text-brand whitespace-pre-wrap overflow-x-auto">
                                {generateSQL() || '-- Enter name to see SQL'}
                            </pre>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border bg-secondary/10 flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={() => handleSubmit()}
                        loading={loading}
                        icon={<Play className="w-4 h-4" />}
                    >
                        Create
                    </Button>
                </div>
            </div>
        </div>
    );
}
