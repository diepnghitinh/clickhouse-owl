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

import { Modal } from './ui/Modal';

export function EditDataSourceModal({ isOpen, onClose, onEdit, initialData }: EditDataSourceModalProps) {
    // useEscapeKey handled by Generic Modal
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
        ssl: false,
        authSource: 'admin'
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
                ssl: initialData.ssl || false,
                authSource: initialData.authSource ?? 'admin',
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
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <>
                    <Database className="w-5 h-5 text-brand" />
                    Edit Connection
                </>
            }
            className="w-full max-w-xl p-6 sm:p-8"
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {error && (
                    <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-md flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}

                <div className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Engine</label>
                        <select
                            name="engine"
                            value={formData.engine}
                            onChange={(e) => {
                                const engine = e.target.value;
                                const port = engine === 'MongoDB' ? '27017' : engine === 'MySQL' ? '3306' : '5432';
                                setFormData(prev => ({ ...prev, engine, port }));
                            }}
                            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            <option value="PostgreSQL">PostgreSQL</option>
                            <option value="MySQL">MySQL</option>
                            <option value="MongoDB">MongoDB</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Connection Name (Identifier)</label>
                        <Input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="bg-background"
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
                                required={formData.engine !== 'MongoDB'}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Password</label>
                            <Input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required={formData.engine !== 'MongoDB'}
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

                    {formData.engine === 'MongoDB' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Authentication database</label>
                            <Input
                                name="authSource"
                                value={formData.authSource ?? 'admin'}
                                onChange={handleChange}
                                placeholder="admin"
                            />
                            <p className="text-[10px] text-muted-foreground">Auth source for the user (e.g. admin)</p>
                        </div>
                    )}

                    <div className="flex items-center space-x-2 pt-1">
                        <input
                            type="checkbox"
                            id="edit-ssl"
                            name="ssl"
                            checked={formData.ssl}
                            onChange={(e) => setFormData(prev => ({ ...prev, ssl: e.target.checked }))}
                            className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                        />
                        <label htmlFor="edit-ssl" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Use SSL (Required for cloud databases)
                        </label>
                    </div>
                </div>

                <div className="flex justify-end pt-2 gap-3 border-t border-border mt-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Update Connection
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
