'use client';

import React, { useState } from 'react';
import { X, Loader2, Database, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface AddDataSourceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (data: any) => void;
}

import { Modal } from './ui/Modal';

export function AddDataSourceModal({ isOpen, onClose, onAdd }: AddDataSourceModalProps) {
    // useEscapeKey handled by Modal
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        engine: 'PostgreSQL',
        host: '',
        port: '5432',
        username: '',
        password: '',
        database: '',
        ssl: false
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const newId = crypto.randomUUID();
        onAdd({ ...formData, id: newId });
        onClose();

        // Reset form
        setFormData({
            name: '',
            engine: 'PostgreSQL',
            host: '',
            port: '5432',
            username: '',
            password: '',
            database: '',
            ssl: false
        });
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <>
                    <Database className="w-5 h-5 text-brand" />
                    Add Connection
                </>
            }
            className="w-full max-w-md"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
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
                            placeholder="my_postgres_db"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                        <p className="text-[10px] text-muted-foreground">Unique identifier for this connection (no spaces)</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Host</label>
                            <Input
                                name="host"
                                placeholder="localhost"
                                value={formData.host}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Port</label>
                            <Input
                                name="port"
                                placeholder="5432"
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
                                placeholder="postgres"
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
                                placeholder="••••••••"
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
                            placeholder="production_db"
                            value={formData.database}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <input
                            type="checkbox"
                            id="ssl"
                            name="ssl"
                            checked={formData.ssl}
                            onChange={(e) => setFormData(prev => ({ ...prev, ssl: e.target.checked }))}
                            className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                        />
                        <label htmlFor="ssl" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Use SSL (Required for cloud databases)
                        </label>
                    </div>
                </div>

                <div className="flex justify-end pt-4 gap-3">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Save Connection
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
