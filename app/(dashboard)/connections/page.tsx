'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Server, CheckCircle2 } from 'lucide-react';
import { AddConnectionModal, ConnectionConfig } from '@/components/AddConnectionModal';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';

export default function ConnectionsPage() {
    const router = useRouter();
    const [connections, setConnections] = React.useState<any[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);

    React.useEffect(() => {
        const stored = localStorage.getItem('clickhouse_connections');
        if (stored) {
            setConnections(JSON.parse(stored));
        }
    }, []);

    const handleSaveConnection = (connection: ConnectionConfig) => {
        const newConnections = [...connections, connection];
        setConnections(newConnections);
        localStorage.setItem('clickhouse_connections', JSON.stringify(newConnections));

        // Auto-switch/redirect?
        // Maybe just refresh list
    };

    const handleSelectConnection = async (conn: any) => {
        // Also switch the "backend session" just in case, though we rely on URL params now mostly.
        // But purely for legacy / mix compatibility:
        try {
            await fetch('/api/connection/switch', {
                method: 'POST',
                body: JSON.stringify(conn)
            });
        } catch (e) { console.error('Failed to switch session', e) }

        const id = encodeURIComponent(conn.name.toLowerCase().replace(/\s+/g, '-'));
        router.push(`/connection/${id}`);
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
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-brand text-white font-medium rounded-lg hover:bg-brand/90 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        New Connection
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {connections.map((conn, idx) => (
                        <div
                            key={idx}
                            onClick={() => handleSelectConnection(conn)}
                            className="group relative bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-brand/50"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <Server className="w-6 h-6" />
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <CheckCircle2 className="w-5 h-5 text-brand" />
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
                        onClick={() => setIsAddModalOpen(true)}
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
                    onClose={() => setIsAddModalOpen(false)}
                    onAdd={handleSaveConnection}
                />
            </div>
        </div>
    );
}
