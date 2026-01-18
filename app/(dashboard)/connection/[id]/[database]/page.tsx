'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Table2, ArrowRight, Database, Search, Plus, Trash } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Breadcrumb } from '@/components/Breadcrumb';
import { CreateTableModal } from '@/components/CreateTableModal';

interface TableInfo {
    name: string;
    schema: string;
    columns: any[];
}

export default function DatabaseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const connectionId = params.id as string;
    const databaseName = decodeURIComponent(params.database as string);

    const [tables, setTables] = useState<TableInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const fetchTables = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/tables?db=${databaseName}`);
            if (res.ok) {
                const data = await res.json();
                setTables(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTables();
    }, [databaseName]);

    const handleDeleteTable = async (tableName: string) => {
        if (!confirm(`Are you sure you want to delete table "${tableName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const query = `DROP TABLE "${databaseName}"."${tableName}"`;
            const res = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, database: databaseName })
            });

            if (res.ok) {
                fetchTables();
            } else {
                const err = await res.json();
                alert(`Failed to delete table: ${err.error}`);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to delete table");
        }
    };

    const filteredTables = tables.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex-1 h-full overflow-y-auto bg-background p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                <Breadcrumb />

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                            <Database className="w-8 h-8 text-brand" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">{databaseName}</h1>
                            <div className="text-muted-foreground mt-1">
                                Database in <span className="font-semibold">{decodeURIComponent(connectionId).replace(/-/g, ' ')}</span>
                            </div>
                        </div>
                    </div>
                    <Button onClick={() => setIsCreateModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
                        Create Table
                    </Button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search tables..."
                        className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Tables List */}
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                    {loading ? (
                        <div className="p-8 text-center text-muted-foreground">Loading tables...</div>
                    ) : filteredTables.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">No tables found.</div>
                    ) : (
                        <div className="divide-y divide-border">
                            {filteredTables.map((table) => (
                                <div key={table.name} className="p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
                                            <Table2 className="w-4 h-4 text-foreground" />
                                        </div>
                                        <div>
                                            <span className="font-medium text-foreground block">{table.name}</span>
                                            <span className="text-xs text-muted-foreground">{table.columns.length} columns</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="sm" onClick={() => router.push(`/connection/${connectionId}/${databaseName}/${table.name}`)}>
                                            View Data
                                        </Button>
                                        <Button variant="ghost" size="sm" iconRight={<ArrowRight className="w-4 h-4" />}>
                                            Structure
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDeleteTable(table.name)}
                                            icon={<Trash className="w-4 h-4" />}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <CreateTableModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                        fetchTables();
                    }}
                    database={databaseName}
                />
            </div>
        </div>
    );
}
