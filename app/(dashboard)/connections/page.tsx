'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Server, CheckCircle2, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { AddConnectionModal, ConnectionConfig } from '@/components/AddConnectionModal';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Dropdown } from '@/components/ui/Dropdown';

export default function ConnectionsPage() {
    const router = useRouter();
    const [connections, setConnections] = React.useState<ConnectionConfig[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
    const [editingConnection, setEditingConnection] = React.useState<ConnectionConfig | undefined>(undefined);

    React.useEffect(() => {
        const stored = localStorage.getItem('clickhouse_connections');
        if (stored) {
            try {
                let parsed: ConnectionConfig[] = JSON.parse(stored);
                // Backward compatibility: Ensure IDs
                let modified = false;
                parsed = parsed.map(c => {
                    if (!c.id) {
                        modified = true;
                        return { ...c, id: crypto.randomUUID() };
                    }
                    return c;
                });

                setConnections(parsed);
                if (modified) {
                    localStorage.setItem('clickhouse_connections', JSON.stringify(parsed));
                }
            } catch (e) {
                console.error("Failed to parse connections", e);
            }
        }
    }, []);

    const handleSaveConnection = (connection: ConnectionConfig) => {
        let newConnections: ConnectionConfig[];

        if (editingConnection) {
            // Edit mode: replace by ID
            newConnections = connections.map(c => c.id === connection.id ? connection : c);
        } else {
            // Add mode: append
            newConnections = [...connections, connection];
        }

        setConnections(newConnections);
        localStorage.setItem('clickhouse_connections', JSON.stringify(newConnections));

        setIsAddModalOpen(false);
        setEditingConnection(undefined);
    };

    const handleDeleteConnection = (conn: ConnectionConfig) => {
        if (confirm(`Are you sure you want to delete "${conn.name}"?`)) {
            const newConnections = connections.filter(c => c.id !== conn.id);
            setConnections(newConnections);
            localStorage.setItem('clickhouse_connections', JSON.stringify(newConnections));
        }
    };

    const handleEditConnection = (conn: ConnectionConfig) => {
        setEditingConnection(conn);
        setIsAddModalOpen(true);
    };

    const handleSelectConnection = async (conn: ConnectionConfig) => {
        try {
            await fetch('/api/connection/switch', {
                method: 'POST',
                body: JSON.stringify(conn)
            });
        } catch (e) { console.error('Failed to switch session', e) }

        if (conn.id) {
            router.push(`/connection/${conn.id}`);
        } else {
            // Fallback
            const id = encodeURIComponent(conn.name.toLowerCase().replace(/\s+/g, '-'));
            router.push(`/connection/${id}`);
        }
    };

    const [testingId, setTestingId] = React.useState<string | null>(null);
    const [testResults, setTestResults] = React.useState<Record<string, 'success' | 'error' | null>>({});

    const handleTestConnection = async (conn: ConnectionConfig, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!conn.id) return;

        const connId = conn.id;
        setTestingId(connId);
        setTestResults(prev => ({ ...prev, [connId]: null })); // Reset

        try {
            const res = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: 'SELECT 1',
                    connection: conn
                })
            });

            const data = await res.json();

            if (data.error) {
                setTestResults(prev => ({ ...prev, [connId]: 'error' }));
                alert(`Connection failed: ${data.error}`);
            } else {
                setTestResults(prev => ({ ...prev, [connId]: 'success' }));

                // Clear success status after 3 seconds
                setTimeout(() => {
                    setTestResults(prev => ({ ...prev, [connId]: null }));
                }, 3000);
            }
        } catch (err: any) {
            setTestResults(prev => ({ ...prev, [connId]: 'error' }));
            alert(`Connection failed: ${err.message}`);
        } finally {
            setTestingId(null);
        }
    };

    return (
        <div className="flex-1 h-full bg-background p-8 overflow-y-auto">
            <div className="max-w-5xl mx-auto">
                <Breadcrumb />

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">Connections</h1>
                        <p className="text-muted-foreground mt-1">Manage your ClickHouse server connections</p>
                    </div>
                    <button
                        onClick={() => { setEditingConnection(undefined); setIsAddModalOpen(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-brand text-white font-medium rounded-lg hover:bg-brand/90 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        New Connection
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {connections.map((conn) => (
                        <div
                            key={conn.id}
                            onClick={() => handleSelectConnection(conn)}
                            className="group relative bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-brand/50"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <Server className="w-6 h-6" />
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Test / Status Indicator */}
                                    <div className="flex items-center">
                                        {conn.id && testingId === conn.id && (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand mr-2" />
                                        )}
                                        {conn.id && testResults[conn.id] === 'success' && (
                                            <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 animate-in fade-in" />
                                        )}
                                        {conn.id && testResults[conn.id] === 'error' && (
                                            <div className="w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center mr-2">!</div>
                                        )}

                                        {conn.id && !testingId && !testResults[conn.id] && (
                                            <button
                                                onClick={(e) => handleTestConnection(conn, e)}
                                                className="mr-2 opacity-0 group-hover:opacity-100 text-xs bg-secondary hover:bg-secondary/80 px-2 py-1 rounded transition-all text-muted-foreground hover:text-foreground"
                                            >
                                                Test
                                            </button>
                                        )}
                                    </div>

                                    <div className="relative z-10" onClick={(e) => e.stopPropagation()}>
                                        <Dropdown
                                            items={[
                                                { label: 'Edit', icon: <Edit2 className="w-3 h-3" />, onClick: () => handleEditConnection(conn) },
                                                { label: 'Delete', icon: <Trash2 className="w-3 h-3" />, danger: true, onClick: () => handleDeleteConnection(conn) }
                                            ]}
                                            trigger={
                                                <button className="p-1 rounded-md text-muted-foreground hover:bg-secondary transition-colors hover:text-foreground">
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-lg font-semibold mb-1 group-hover:text-brand transition-colors">{conn.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono bg-secondary/50 px-2 py-1 rounded w-fit">
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                {conn.url}
                            </div>

                            <div className="absolute inset-0 border-2 border-brand rounded-xl opacity-0 scale-95 group-hover:opacity-10 group-hover:scale-100 transition-all pointer-events-none" />
                        </div>
                    ))}

                    <button
                        onClick={() => { setEditingConnection(undefined); setIsAddModalOpen(true); }}
                        className="flex flex-col items-center justify-center gap-4 bg-secondary/20 border-2 border-dashed border-border rounded-xl p-6 hover:bg-secondary/40 hover:border-brand/40 transition-all group h-[200px]"
                    >
                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Plus className="w-6 h-6 text-muted-foreground group-hover:text-foreground" />
                        </div>
                        <span className="font-medium text-muted-foreground group-hover:text-foreground">Add Connection</span>
                    </button>
                </div>

                <AddConnectionModal
                    isOpen={isAddModalOpen}
                    onClose={() => { setIsAddModalOpen(false); setEditingConnection(undefined); }}
                    onAdd={handleSaveConnection}
                    initialData={editingConnection} // Pass editing data
                />
            </div>
        </div>
    );
}
