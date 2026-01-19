import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Trash2, Loader2, AlertTriangle, AlertCircle } from 'lucide-react';

interface DeleteTableModalProps {
    isOpen: boolean;
    onClose: () => void;
    tableName: string;
    onDelete: () => Promise<void>;
}

export function DeleteTableModal({
    isOpen,
    onClose,
    tableName,
    onDelete
}: DeleteTableModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await onDelete();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to delete table');
            setLoading(false); // Only stop loading on error, otherwise modal closes
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2 text-destructive">
                    <Trash2 className="w-5 h-5" />
                    Delete Table
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-destructive/10 text-destructive-foreground p-4 rounded-md flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                    <div className="text-sm">
                        <p className="font-medium">Are you sure?</p>
                        <p className="mt-1 opacity-90">
                            This will permanently delete the table <span className="font-bold">{tableName}</span> and all its data. This action cannot be undone.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="pt-4 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="destructive" // Assuming Button has variant prop, otherwise just className styles
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Delete Table
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
