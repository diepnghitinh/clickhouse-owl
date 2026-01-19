import React, { useState } from 'react';
import { Database, Search, Plus, FilePlus, Import, Loader2, Table2, Bot, Copy } from 'lucide-react';
import { Dropdown } from '@/components/ui/Dropdown';

export interface TableInfo {
    name: string;
    engine: string;
}

interface SqlSidebarProps {
    databases: string[];
    selectedDatabase: string;
    onSelectDatabase: (db: string) => void;
    tables: TableInfo[];
    loadingTables: boolean;
    onTableClick: (tableName: string) => void;
    onInspectTable: (tableName: string) => void;
    onCreateTable: () => void;
    onImportTable: () => void;
    onDuplicateTable: (tableName: string) => void;
}

export function SqlSidebar({
    databases,
    selectedDatabase,
    onSelectDatabase,
    tables,
    loadingTables,
    onTableClick,
    onInspectTable,
    onCreateTable,
    onImportTable,
    onDuplicateTable
}: SqlSidebarProps) {
    const [tableSearch, setTableSearch] = useState('');
    const filteredTables = tables.filter(t => t.name.toLowerCase().includes(tableSearch.toLowerCase()));

    return (
        <div className="w-[300px] border-r border-border bg-card flex flex-col shrink-0">
            <div className="p-4 border-b border-border space-y-4">
                {/* Database Selector */}
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Database</label>
                    <div className="relative">
                        <Database className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                        <select
                            className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 appearance-none"
                            value={selectedDatabase}
                            onChange={(e) => onSelectDatabase(e.target.value)}
                        >
                            {databases.map(db => (
                                <option key={db} value={db}>{db}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* New Table / Actions */}
                <Dropdown
                    menuWidth="w-56"
                    trigger={
                        <button className="w-full flex items-center justify-center gap-2 bg-foreground text-background hover:bg-foreground/90 py-2 rounded-md text-sm font-medium transition-colors">
                            <Plus className="w-4 h-4" />
                            <span>New Table</span>
                        </button>
                    }
                    items={[
                        {
                            label: 'Empty Table',
                            icon: <FilePlus className="w-4 h-4" />,
                            onClick: onCreateTable
                        },
                        {
                            label: 'From Datasource',
                            icon: <Import className="w-4 h-4" />,
                            onClick: onImportTable
                        }
                    ]}
                />

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search tables..."
                        className="w-full pl-8 pr-3 py-2 bg-secondary/30 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
                        value={tableSearch}
                        onChange={e => setTableSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {loadingTables ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        <div className="px-3 py-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
                            <span>Tables ({tables.length})</span>
                        </div>
                        {filteredTables.map(table => (
                            <div
                                key={table.name}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary/50 rounded-md transition-colors group cursor-pointer"
                                onClick={() => onTableClick(table.name)}
                            >
                                <Table2 className="w-4 h-4 text-muted-foreground group-hover:text-brand shrink-0" />
                                <span className="truncate flex-1">{table.name}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${table.engine === 'PostgreSQL'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                    : table.engine.includes('MergeTree')
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                        : 'bg-secondary text-muted-foreground'
                                    }`}>
                                    {table.engine === 'PostgreSQL' ? 'PSQL' : table.engine}
                                </span>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDuplicateTable(table.name);
                                        }}
                                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-background rounded"
                                        title="Duplicate Table Schema"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onInspectTable(table.name);
                                        }}
                                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-background rounded"
                                        title="Inspect Table Schema & Data"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {filteredTables.length === 0 && (
                            <div className="text-center py-8 text-sm text-muted-foreground">
                                No tables found
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
