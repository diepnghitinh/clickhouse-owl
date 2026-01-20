import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Eraser, Loader2, AlertTriangle, AlertCircle } from 'lucide-react';

interface TruncateTableModalProps {
    isOpen: boolean;
    onClose: () => void;
    tableName: string;
    onTruncate: () => Promise<void>;
}

export function TruncateTableModal({
    isOpen,
    onClose,
    tableName,
    onTruncate
}: TruncateTableModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await onTruncate();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to truncate table');
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-500">
                    <Eraser className="w-5 h-5" />
                    Empty Table
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 p-4 rounded-md flex items-start gap-3 border border-orange-200 dark:border-orange-800/50">
                    <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                    <div className="text-sm">
                        <p className="font-medium">Are you sure?</p>
                        <p className="mt-1 opacity-90">
                            This will delete <span className="font-bold">ALL DATA</span> from the table <span className="font-bold">{tableName}</span>.
                        </p>
                        <p className="mt-1 font-semibold">
                            The table structure will remain intact. This action cannot be undone.
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
                        className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/20"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Eraser className="w-4 h-4 mr-2" />}
                        Empty Table
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
