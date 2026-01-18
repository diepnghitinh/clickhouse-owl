'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Database, Server, Table2, Plus, ArrowRight, Settings } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CreateDatabaseModal } from '@/components/CreateDatabaseModal';
import { AddConnectionModal, ConnectionConfig } from '@/components/AddConnectionModal';

interface DatabaseInfo {
    name: string;
}



import { Breadcrumb } from '@/components/Breadcrumb';

export default function ConnectionDetailPage() {
    const params = useParams();
    const router = useRouter();
    // Decode ID back to something usable if we were using it for lookup, 
    // but here we just rely on the session (current connection). 
    // However, users might expect to see details of *that* specific connection from the URL.
    // Since we switch connection on sidebar click, the session *should* match the URL implied connection.

    const [databases, setDatabases] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [connection, setConnection] = useState<ConnectionConfig | null>(null);
    const [isCreateDbOpen, setIsCreateDbOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const handleEditConnection = async (updatedConn: ConnectionConfig) => {
        // 1. Update localStorage
        const stored = localStorage.getItem('clickhouse_connections');
        if (stored && connection) {
            let conns = JSON.parse(stored);
            const index = conns.findIndex((c: any) => c.name === connection.name); // Find by old name

            if (index !== -1) {
                conns[index] = updatedConn;
                localStorage.setItem('clickhouse_connections', JSON.stringify(conns));
                setConnection(updatedConn);

                // 2. Switch session to new details
                try {
                    await fetch('/api/connection/switch', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatedConn)
                    });
                    // 3. Redirect if name changed, otherwise just reload or stay
                    // 3. No redirect needed since ID is constant
                    window.location.reload();
                } catch (e) {
                    console.error("Failed to update session", e);
                }
            }
        }
        setIsEditModalOpen(false);
    };

    useEffect(() => {
        // 1. Fetch current connection details (from session or local storage matching the ID)
        // For now, let's look up the connection from localStorage using the ID logic we defined in Sidebar
        // This is a bit disjointed because backend session vs frontend view.
        // Ideally we fetch "current connection" from an API.
        // Let's assume the session is already switched.

        // Find connection meta from localStorage to display name/url
        const id = params.id as string;
        const stored = localStorage.getItem('clickhouse_connections');
        if (stored) {
            const conns = JSON.parse(stored);
            const match = conns.find((c: any) => c.id === id);
            // Fallback for legacy slug links (optional, but good for transition)
            if (!match) {
                const slugMatch = conns.find((c: any) =>
                    encodeURIComponent(c.name.toLowerCase().replace(/\s+/g, '-')) === id
                );
                if (slugMatch) setConnection(slugMatch);
            } else {
                setConnection(match);
            }
        }

        fetchDatabases();
    }, [params.id]);

    const fetchDatabases = async () => {
        try {
            const res = await fetch('/api/databases');
            if (res.ok) {
                const data = await res.json();
                setDatabases(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 h-full overflow-y-auto bg-background p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                <Breadcrumb />

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center">
                            <Server className="w-8 h-8 text-foreground" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">{connection?.name || 'Connection'}</h1>
                            <div className="flex items-center gap-2 text-muted-foreground mt-1">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-sm font-mono">{connection?.url}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" icon={<Settings className="w-4 h-4" />} onClick={() => setIsEditModalOpen(true)}>Configure</Button>
                        <Button variant="danger">Remove</Button>
                    </div>
                </div>

                {/* Stats / Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 text-muted-foreground mb-2">
                            <Database className="w-5 h-5" />
                            <span className="text-sm font-medium">Databases</span>
                        </div>
                        <div className="text-3xl font-bold text-foreground">{databases.length}</div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 text-muted-foreground mb-2">
                            <Settings className="w-5 h-5" />
                            <span className="text-sm font-medium">User</span>
                        </div>
                        <div className="text-xl font-bold text-foreground truncate">{connection?.user}</div>
                    </div>
                </div>

                {/* Databases List */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-foreground">Databases</h2>
                        <Button onClick={() => setIsCreateDbOpen(true)} icon={<Plus className="w-4 h-4" />}>
                            New Database
                        </Button>
                    </div>

                    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                        {loading ? (
                            <div className="p-8 text-center text-muted-foreground">Loading databases...</div>
                        ) : (
                            <div className="divide-y divide-border">
                                {databases.map((db) => (
                                    <div key={db} className="p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <Database className="w-5 h-5 text-brand" />
                                            <span className="font-medium text-foreground">{db}</span>
                                            {db === connection?.database && (
                                                <span className="px-2 py-0.5 rounded-full bg-brand/10 text-brand text-xs font-medium">Default</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="sm" onClick={() => router.push(`/connection/${params.id}/${db}`)}>
                                                View Tables
                                            </Button>
                                            <Button variant="ghost" size="sm" iconRight={<ArrowRight className="w-4 h-4" />}>
                                                Query
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <CreateDatabaseModal
                    isOpen={isCreateDbOpen}
                    onClose={() => setIsCreateDbOpen(false)}
                    onSuccess={() => {
                        setIsCreateDbOpen(false);
                        fetchDatabases();
                    }}
                />

                {connection && (
                    <AddConnectionModal
                        isOpen={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                        onAdd={handleEditConnection}
                        initialData={connection}
                    />
                )}
            </div>
        </div>
    );
}
