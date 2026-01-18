import { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { X, Database, Plus, Code2, Play } from 'lucide-react';
import { executeQuery } from '@/src/api/client';

interface CreateDatabaseModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

import { Modal } from './ui/Modal';

export function CreateDatabaseModal({ onClose, onSuccess }: CreateDatabaseModalProps) {
    // useEscapeKey handled by Modal
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
        <Modal
            isOpen={true} // Parent controls mounting, but this component doesn't have isOpen prop? Ah, CreateDatabaseModal is conditionally rendered.
            // Wait, previous file had isOpen usually. Let's check props.
            // CreateDatabaseModal only has onClose and onSuccess. It's rendered via {isCreateDbOpen && <CreateDatabaseModal ... />}
            // So we can treat isOpen as true or pass it down if we refactor parent.
            // For now, assume it's open if mounted.
            isOpen={true}
            onClose={onClose}
            title="Create Database"
            description="Add a new database instance"
            className="w-full max-w-md"
        >
            <div className="py-2">
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

                    <div className="pt-4 flex justify-end gap-3">
                        <Button variant="ghost" onClick={onClose} type="button">
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
                </form>
            </div>
        </Modal>
    );
}
