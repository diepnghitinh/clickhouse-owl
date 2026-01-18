'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Table2, Database, Columns, Activity } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';

interface ColumnInfo {
    name: string;
    type: string;
}

export default function TableDetailPage() {
    const params = useParams();
    const connectionId = params.id as string;
    const databaseName = decodeURIComponent(params.database as string);
    const tableName = decodeURIComponent(params.table as string);

    const [columns, setColumns] = useState<ColumnInfo[]>([]);
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            // Get connection from localStorage
            let connectionStr = localStorage.getItem('clickhouse_connections');
            let connection: any = null;
            if (connectionStr) {
                const connections = JSON.parse(connectionStr);
                connection = connections.find((c: any) => c.id === connectionId);
            }

            try {
                // 1. Fetch Columns (Schema)
                const schemaQuery = `DESCRIBE "${databaseName}"."${tableName}"`;
                const schemaRes = await fetch('/api/query', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: schemaQuery, database: databaseName, connection })
                });

                if (schemaRes.ok) {
                    const schemaJson = await schemaRes.json();
                    setColumns(schemaJson.rows.map((r: any) => ({ name: r[0], type: r[1] })));
                }

                // 2. Fetch Preview Data
                const dataQuery = `SELECT * FROM "${databaseName}"."${tableName}" LIMIT 100`;
                const dataRes = await fetch('/api/query', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: dataQuery, database: databaseName, connection })
                });

                if (dataRes.ok) {
                    const dataJson = await dataRes.json();
                    setData(dataJson.rows);
                }

            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [databaseName, tableName, connectionId]);

    return (
        <div className="flex-1 h-full overflow-y-auto bg-background p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                <Breadcrumb />

                <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-secondary rounded-xl flex items-center justify-center">
                        <Table2 className="w-8 h-8 text-foreground" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">{tableName}</h1>
                        <div className="flex items-center gap-2 text-muted-foreground mt-1">
                            <Database className="w-4 h-4" />
                            <span>{databaseName}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Schema Sidebar */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                            <div className="p-3 border-b border-border bg-secondary/20 flex items-center gap-2 font-medium">
                                <Columns className="w-4 h-4" />
                                Schema
                            </div>
                            <div className="max-h-[500px] overflow-y-auto p-2 space-y-1">
                                {loading ? (
                                    <div className="p-4 text-center text-xs text-muted-foreground">Loading...</div>
                                ) : (
                                    columns.map((col) => (
                                        <div key={col.name} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-secondary/50 text-sm">
                                            <span className="font-medium truncate mr-2" title={col.name}>{col.name}</span>
                                            <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded font-mono truncate max-w-[100px]" title={col.type}>{col.type}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Data Preview */}
                    <div className="lg:col-span-3">
                        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col h-[600px]">
                            <div className="p-3 border-b border-border bg-secondary/20 flex items-center gap-2 font-medium">
                                <Activity className="w-4 h-4" />
                                Data Preview (100 rows)
                            </div>

                            <div className="flex-1 overflow-auto">
                                {loading ? (
                                    <div className="h-full flex items-center justify-center text-muted-foreground">Loading data...</div>
                                ) : data.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-muted-foreground">No data found</div>
                                ) : (
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 sticky top-0">
                                            <tr>
                                                {columns.map((col) => (
                                                    <th key={col.name} className="px-4 py-3 font-medium whitespace-nowrap">
                                                        {col.name}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {data.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-secondary/20">
                                                    {row.map((cell: any, cellIdx: number) => (
                                                        <td key={cellIdx} className="px-4 py-2 whitespace-nowrap max-w-[300px] truncate">
                                                            {typeof cell === 'object' ? JSON.stringify(cell) : String(cell)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
