import React, { useState } from 'react';
import { Database, Search, Plus, FilePlus, Import, Loader2, Table2, Bot, Copy, MoreVertical, Info, Pencil, Trash2 } from 'lucide-react';
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
    onRenameTable: (tableName: string) => void;
    onDeleteTable: (tableName: string) => void;
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
    onDuplicateTable,
    onRenameTable,
    onDeleteTable
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

                                <div onClick={(e) => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 transition-all">
                                    <Dropdown
                                        menuWidth="w-48"
                                        trigger={
                                            <button className="p-1 text-muted-foreground hover:text-foreground hover:bg-background rounded">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        }
                                        items={[
                                            {
                                                label: 'Inspect Schema',
                                                icon: <Info className="w-4 h-4" />,
                                                onClick: () => onInspectTable(table.name)
                                            },
                                            {
                                                label: 'Duplicate Table',
                                                icon: <Copy className="w-4 h-4" />,
                                                onClick: () => onDuplicateTable(table.name)
                                            },
                                            {
                                                label: 'Rename Table',
                                                icon: <Pencil className="w-4 h-4" />,
                                                onClick: () => onRenameTable(table.name)
                                            },
                                            {
                                                label: 'Delete Table',
                                                icon: <Trash2 className="w-4 h-4 text-destructive" />,
                                                className: 'text-destructive focus:text-destructive',
                                                onClick: () => onDeleteTable(table.name)
                                            }
                                        ]}
                                    />
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
