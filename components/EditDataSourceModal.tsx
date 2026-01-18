'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Database, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface EditDataSourceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEdit: (data: any) => void;
    initialData: any;
}

export function EditDataSourceModal({ isOpen, onClose, onEdit, initialData }: EditDataSourceModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        id: '',
        name: '',
        engine: 'PostgreSQL',
        host: '',
        port: '',
        username: '',
        password: '',
        database: '',
    });

    useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                id: initialData.id,
                name: initialData.name,
                engine: initialData.engine || 'PostgreSQL',
                host: initialData.host || '',
                port: initialData.port || '',
                username: initialData.username || '',
                password: initialData.password || '',
                database: initialData.database || '',
            });
        }
    }, [isOpen, initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        onEdit(formData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Database className="w-5 h-5 text-brand" />
                        Edit Connection
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-secondary rounded-md text-muted-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-md flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Engine</label>
                            <select
                                name="engine"
                                value={formData.engine}
                                onChange={handleChange}
                                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="PostgreSQL">PostgreSQL</option>
                                <option value="MySQL">MySQL</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Connection Name (Identifier)</label>
                            <Input
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                readOnly // Name change might require drop/create which is complex, for now keep readOnly or let them create new
                                className="bg-secondary/50"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Host</label>
                                <Input
                                    name="host"
                                    value={formData.host}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Port</label>
                                <Input
                                    name="port"
                                    value={formData.port}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Username</label>
                                <Input
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Password</label>
                                <Input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Database Name</label>
                            <Input
                                name="database"
                                value={formData.database}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 gap-3">
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Update Connection
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
