'use client';

import React from 'react';
import { X, Loader2, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddDataSourceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: () => void;
}

export function AddDataSourceModal({ isOpen, onClose, onAdd }: AddDataSourceModalProps) {
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    const [formData, setFormData] = React.useState({
        name: '',
        host: '',
        port: '5432',
        username: '',
        password: '',
        database: '',
        schema: 'public'
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/datasources/postgres', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to add data source');
            }

            onAdd();
            onClose();
            // Reset form
            setFormData({
                name: '',
                host: '',
                port: '5432',
                username: '',
                password: '',
                database: '',
                schema: 'public'
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-background border border-border rounded-lg shadow-lg w-[500px] max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-lg">Add PostgreSQL Data Source</h2>
                            <p className="text-sm text-muted-foreground">Connect external PostgreSQL database</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-secondary rounded-md transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {error && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Local Database Name</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. my_postgres_db"
                                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">This will be the database name within ClickHouse.</p>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                                <label className="text-sm font-medium mb-1 block">Host</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="localhost or IP"
                                    className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={formData.host}
                                    onChange={e => setFormData({ ...formData, host: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Port</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="5432"
                                    className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={formData.port}
                                    onChange={e => setFormData({ ...formData, port: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Username</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Password</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Postgres Database</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="postgres"
                                    className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={formData.database}
                                    onChange={e => setFormData({ ...formData, database: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Schema</label>
                                <input
                                    type="text"
                                    placeholder="public"
                                    className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={formData.schema}
                                    onChange={e => setFormData({ ...formData, schema: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-border mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium rounded-md hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Connect Data Source
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
