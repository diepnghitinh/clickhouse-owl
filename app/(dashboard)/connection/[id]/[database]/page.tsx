'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Table2, ArrowRight, Database, Search, Plus, Trash } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Breadcrumb } from '@/components/Breadcrumb';
import { CreateTableModal } from '@/components/CreateTableModal';
import { CreateFromDatasourceModal } from '@/components/CreateFromDatasourceModal';
import { Dropdown } from '@/components/ui/Dropdown';

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
    const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);

    const [connectionName, setConnectionName] = useState<string>('');

    const fetchTables = async () => {
        setLoading(true);
        try {
            // Get connection from localStorage
            let connectionStr = localStorage.getItem('clickhouse_connections');
            let connection: any = null;
            if (connectionStr) {
                const connections = JSON.parse(connectionStr);
                connection = connections.find((c: any) => c.id === connectionId);
                if (connection) {
                    setConnectionName(connection.name);
                }
            }

            // Fallback: If not found, maybe we can rely on session (backwards compat)
            // But prefer explicit connection if available.

            const res = await fetch(`/connection/${connectionId}/tables?db=${databaseName}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-ClickHouse-Connection': connection ? JSON.stringify(connection) : ''
                },
            });

            if (res.ok) {
                const data = await res.json();
                // Map columns/rows to TableInfo.
                // Note: Previous generic API might have returned array of objects.
                // queryClickHouse returns { columns: [], rows: [] } usually.
                // But the previous implementation expected array of objects from /api/tables
                // so we need to map it.

                // Also, system.tables doesn't give us columns in the same query unless we join.
                // For list view, we might not need all columns immediately?
                // The UI shows "table.columns.length columns".
                // We can query system.columns or just show "N/A" for count to speed it up.
                // Or do a second query.

                // Let's do a join or separate query for columns count?
                // Or just system.tables is enough for names.
                // Existing UI expects: name, schema, columns[].

                const tableRows = data.rows || [];
                let tables: TableInfo[] = tableRows.map((r: any) => ({
                    name: r[0],
                    schema: databaseName,
                    columns: [] // Placeholder init
                }));

                // Fetch column counts
                if (tables.length > 0) {
                    try {
                        const countRes = await fetch('/api/query', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                query: `SELECT table, count() FROM system.columns WHERE database = '${databaseName}' GROUP BY table`,
                                connection: connection
                            })
                        });

                        if (countRes.ok) {
                            const countData = await countRes.json();
                            const counts: Record<string, number> = {};
                            // Handle both array of arrays (rows) and array of objects (if legacy)
                            // Assuming standard format from our API which returns { rows: [[table, count], ...] }
                            const rows = countData.rows || [];
                            rows.forEach((row: any[]) => {
                                counts[row[0]] = parseInt(row[1]);
                            });

                            tables = tables.map(t => ({
                                ...t,
                                columns: new Array(counts[t.name] || 0).fill(null) // Create dummy array of correct length to satisfy .length usage
                            }));
                        }
                    } catch (err) {
                        console.error("Failed to fetch column counts", err);
                    }
                }

                setTables(tables);
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

    const toggleTable = (name: string) => {
        const newSelected = new Set(selectedTables);
        if (newSelected.has(name)) {
            newSelected.delete(name);
        } else {
            newSelected.add(name);
        }
        setSelectedTables(newSelected);
    };

    const toggleAll = () => {
        if (selectedTables.size === filteredTables.length) {
            setSelectedTables(new Set());
        } else {
            setSelectedTables(new Set(filteredTables.map(t => t.name)));
        }
    };

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
                                Database in <span className="font-semibold">{connectionName || decodeURIComponent(connectionId).replace(/-/g, ' ')}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Dropdown
                            trigger={
                                <Button icon={<Plus className="w-4 h-4" />}>
                                    New Table
                                </Button>
                            }
                            items={[
                                { label: 'Empty Table', icon: <Table2 className="w-4 h-4" />, onClick: () => setIsCreateModalOpen(true) },
                                { label: 'From Datasource', icon: <Database className="w-4 h-4" />, onClick: () => setIsSourceModalOpen(true) },
                            ]}
                        />
                    </div>
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
                            {/* Header Row */}
                            <div className="p-4 flex items-center gap-3 bg-secondary/10 border-b border-border text-sm font-medium text-muted-foreground">
                                <input
                                    type="checkbox"
                                    checked={filteredTables.length > 0 && selectedTables.size === filteredTables.length}
                                    onChange={toggleAll}
                                    className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                                />
                                <span>{selectedTables.size > 0 ? `${selectedTables.size} selected` : 'Name'}</span>
                            </div>
                            {filteredTables.map((table) => (
                                <div key={table.name} className="p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedTables.has(table.name)}
                                            onChange={() => toggleTable(table.name)}
                                            className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                                        />
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

                <CreateFromDatasourceModal
                    isOpen={isSourceModalOpen}
                    onClose={() => setIsSourceModalOpen(false)}
                    onSuccess={() => {
                        setIsSourceModalOpen(false);
                        fetchTables();
                    }}
                    targetDatabase={databaseName}
                />
            </div>
        </div>
    );
}
