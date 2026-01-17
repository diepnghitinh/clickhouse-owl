'use client';

import { Database, Table as TableIcon, Activity as ActivityIcon, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface Activity {
    id: string;
    type: string;
    content: string;
    timestamp: Date;
    status: 'SUCCESS' | 'ERROR';
    duration?: number;
}

interface DashboardProps {
    databaseCount: number;
    tableCount: number;
    currentDatabase: string;
    activities: Activity[];
    onCreateDatabase: () => void;
    onCreateTable: () => void;
    onOpenSqlEditor: () => void;
}

export function Dashboard({
    databaseCount,
    tableCount,
    currentDatabase,
    activities,
    onCreateDatabase,
    onCreateTable,
    onOpenSqlEditor
}: DashboardProps) {
    return (
        <div className="flex-1 p-8 bg-background overflow-y-auto">
            <h1 className="text-2xl font-bold tracking-tight mb-6">Dashboard</h1>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium">Total Databases</h3>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold">{databaseCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">Active databases</p>
                </div>

                <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium">Tables</h3>
                        <TableIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold">{tableCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">In {currentDatabase}</p>
                </div>

                <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium">System Status</h3>
                        <ActivityIcon className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold text-green-500">Online</div>
                    <p className="text-xs text-muted-foreground mt-1">All systems operational</p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold tracking-tight mb-4">Quick Actions</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-secondary/50"
                        onClick={onCreateDatabase}
                    >
                        <div className="p-2 bg-primary/10 rounded-md">
                            <Database className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <div className="font-semibold">Create Database</div>
                            <div className="text-xs text-muted-foreground font-normal">Create a new database workspace</div>
                        </div>
                    </Button>

                    <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-secondary/50"
                        onClick={onCreateTable}
                    >
                        <div className="p-2 bg-primary/10 rounded-md">
                            <TableIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <div className="font-semibold">Create Table</div>
                            <div className="text-xs text-muted-foreground font-normal">Add a new table to {currentDatabase}</div>
                        </div>
                    </Button>

                    <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-secondary/50"
                        onClick={onOpenSqlEditor}
                    >
                        <div className="p-2 bg-primary/10 rounded-md">
                            <Terminal className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <div className="font-semibold">SQL Editor</div>
                            <div className="text-xs text-muted-foreground font-normal">Run custom SQL queries</div>
                        </div>
                    </Button>
                </div>
            </div>

            {/* Recent Activity */}
            <div>
                <h2 className="text-lg font-semibold tracking-tight mb-4">Recent Activity</h2>
                <div className="rounded-md border border-border bg-card">
                    {activities.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                            No recent activity to display.
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {activities.map((activity) => (
                                <div key={activity.id} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${activity.status === 'SUCCESS' ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-foreground truncate max-w-[300px] sm:max-w-md">
                                                {activity.content}
                                            </span>
                                            <span className="text-xs text-muted-foreground flex items-center gap-2">
                                                <span className="uppercase text-[10px] font-bold border border-border px-1 rounded">{activity.type}</span>
                                                {activity.timestamp.toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </div>
                                    {activity.duration && (
                                        <span className="text-xs font-mono text-muted-foreground mr-4">
                                            {activity.duration.toFixed(1)}ms
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
