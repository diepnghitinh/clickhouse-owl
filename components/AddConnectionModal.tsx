import React, { useState } from 'react';
import { Database, Lock, User, Plus, X, Server } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface AddConnectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (connection: ConnectionConfig) => void;
    initialData?: ConnectionConfig;
}

export interface ConnectionConfig {
    id?: string;
    name: string;
    url: string;
    user: string;
    password?: string; // Optional if not saving, but better to keep consistent with interface
    database: string;
}

export function AddConnectionModal({ isOpen, onClose, onAdd, initialData }: AddConnectionModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<ConnectionConfig>({
        name: '',
        url: 'http://localhost:8123',
        user: 'default',
        password: '',
        database: 'default',
    });

    React.useEffect(() => {
        if (isOpen && initialData) {
            setFormData(initialData);
        } else if (isOpen && !initialData) {
            setFormData({
                name: '',
                url: 'http://localhost:8123',
                user: 'default',
                password: '',
                database: 'default',
            });
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate validation or test connection could go here
        setTimeout(() => {
            const connectionToAdd = {
                ...formData,
                id: formData.id || crypto.randomUUID()
            };
            onAdd(connectionToAdd);
            setLoading(false);
            onClose();
        }, 500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Server className="w-6 h-6 text-brand" />
                        {initialData ? 'Edit Connection' : 'Add Connection'}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {initialData ? 'Update connection details.' : 'Configure a new ClickHouse server connection.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block ml-1">Friendly Name</label>
                        <Input
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Production Analytics"
                            required
                            className="bg-secondary/50"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block ml-1">URL</label>
                            <Input
                                value={formData.url}
                                onChange={e => setFormData({ ...formData, url: e.target.value })}
                                placeholder="http://localhost:8123"
                                required
                                className="bg-secondary/50"
                                icon={<Database className="w-4 h-4 text-muted-foreground" />}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block ml-1">User</label>
                            <Input
                                value={formData.user}
                                onChange={e => setFormData({ ...formData, user: e.target.value })}
                                placeholder="default"
                                required
                                className="bg-secondary/50"
                                icon={<User className="w-4 h-4 text-muted-foreground" />}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block ml-1">Database</label>
                            <Input
                                value={formData.database}
                                onChange={e => setFormData({ ...formData, database: e.target.value })}
                                placeholder="default"
                                required
                                className="bg-secondary/50"
                                icon={<Database className="w-4 h-4 text-muted-foreground" />}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block ml-1">Password</label>
                        <Input
                            type="password"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            placeholder="••••••••"
                            className="bg-secondary/50"
                            icon={<Lock className="w-4 h-4 text-muted-foreground" />}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button variant="ghost" type="button" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={loading} iconRight={!initialData && <Plus className="w-4 h-4" />}>
                            {initialData ? 'Save Changes' : 'Add Connection'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
