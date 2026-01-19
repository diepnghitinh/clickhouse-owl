import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Pencil, Loader2, AlertCircle } from 'lucide-react';

interface RenameTableModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentName: string;
    onRename: (newName: string) => Promise<void>;
}

export function RenameTableModal({
    isOpen,
    onClose,
    currentName,
    onRename
}: RenameTableModalProps) {
    const [newName, setNewName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setNewName(currentName);
            setError(null);
            setLoading(false);
        }
    }, [isOpen, currentName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || newName === currentName) return;

        setLoading(true);
        setError(null);

        try {
            await onRename(newName);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to rename table');
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
                    <Pencil className="w-5 h-5 text-brand" />
                    Rename Table
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-secondary/20 p-3 rounded-md text-sm text-muted-foreground border border-border">
                    Current Name: <span className="font-semibold text-foreground">{currentName}</span>
                </div>

                {error && (
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-sm font-medium">New Name</label>
                    <input
                        autoFocus
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
                        placeholder="new_table_name"
                    />
                </div>

                <div className="pt-4 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading || !newName.trim() || newName === currentName}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Rename
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
