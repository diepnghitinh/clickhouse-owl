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

export function CreateDatabaseModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void; }) {
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
            setName('');
        }
    };

    const generateSQL = () => {
        if (!name.trim()) return '';
        return `CREATE DATABASE ${name};`;
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <>
                    <Database className="w-5 h-5 text-foreground" />
                    Create Database
                </>
            }
            description="Add a new database instance"
        >
            <div className="flex-1 overflow-auto space-y-6">
                <form id="create-db-form" onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="text-sm font-medium mb-1 block">Database Name</label>
                        <Input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. analytics_dw"
                            autoFocus
                            required
                            className="bg-background border-input ring-offset-background"
                        />
                        <p className="text-xs text-muted-foreground mt-1.5">
                            Unique identifier for the database.
                        </p>
                    </div>

                    <div className="bg-secondary/30 p-3 rounded-md border border-border/50">
                        <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            <Code2 className="w-3 h-3" />
                            <span>Preview SQL</span>
                        </div>
                        <pre className="font-mono text-xs text-brand/90 whitespace-pre-wrap">
                            {generateSQL() || '-- Enter name to see SQL'}
                        </pre>
                    </div>
                </form>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border bg-background shrink-0 mt-6">
                <Button variant="ghost" onClick={onClose} type="button">
                    Cancel
                </Button>
                <Button
                    onClick={() => handleSubmit()}
                    loading={loading}
                    disabled={loading || !name}
                    icon={<Plus className="w-4 h-4" />}
                >
                    Create
                </Button>
            </div>
        </Modal>
    );
}
