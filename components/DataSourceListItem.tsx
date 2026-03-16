import React from 'react';
import { Edit2, Trash2, MoreVertical, Database, Server, Leaf } from 'lucide-react';
import { Dropdown } from '@/components/ui/Dropdown';
import { cn } from '@/lib/utils';

function DataSourceIcon({ engine, isActive }: { engine: string; isActive: boolean }) {
    const base = "w-8 h-8 rounded flex items-center justify-center shrink-0";
    if (engine === 'MongoDB') {
        return (
            <div className={cn(base, isActive ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-green-100 dark:bg-green-900/25 text-green-700 dark:text-green-400")}>
                <Leaf className="w-4 h-4" />
            </div>
        );
    }
    if (engine === 'MySQL') {
        return (
            <div className={cn(base, isActive ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-amber-100 dark:bg-amber-900/25 text-amber-700 dark:text-amber-400")}>
                <Server className="w-4 h-4" />
            </div>
        );
    }
    return (
        <div className={cn(base, isActive ? "bg-brand/10 text-brand" : "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400")}>
            <Database className="w-4 h-4" />
        </div>
    );
}

export interface DataSource {
    id: string;
    name: string;
    engine: string;
    details: string;
    host?: string;
    port?: string | number;
    username?: string;
    password?: string;
    database?: string;
    ssl?: boolean;
    /** MongoDB only: authentication database (e.g. admin) */
    authSource?: string;
}

interface DataSourceListItemProps {
    dataSource: DataSource;
    isActive: boolean;
    onConnect: (ds: DataSource) => void;
    onEdit: (ds: DataSource) => void;
    onDelete: (ds: DataSource) => void;
}

export function DataSourceListItem({
    dataSource,
    isActive,
    onConnect,
    onEdit,
    onDelete
}: DataSourceListItemProps) {
    return (
        <div
            onClick={() => onConnect(dataSource)}
            className={cn(
                "group w-full flex items-center justify-between gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer relative",
                isActive
                    ? "bg-secondary border-brand/50 ring-1 ring-brand/20 shadow-sm"
                    : "bg-card border-border hover:bg-secondary/50 hover:border-border/80"
            )}
        >
            <div className="flex items-center gap-3">
                <DataSourceIcon engine={dataSource.engine} isActive={isActive} />
                <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{dataSource.name}</div>
                    <div className="text-xs text-muted-foreground truncate opacity-70">{dataSource.engine}</div>
                </div>
            </div>

            <div className="relative z-10" onClick={(e) => e.stopPropagation()}>
                <Dropdown
                    items={[
                        { label: 'Edit', icon: <Edit2 className="w-3 h-3" />, onClick: () => onEdit(dataSource) },
                        { label: 'Delete', icon: <Trash2 className="w-3 h-3" />, danger: true, onClick: () => onDelete(dataSource) }
                    ]}
                    trigger={
                        <div className={cn(
                            "p-1 rounded-md text-muted-foreground hover:bg-background transition-all",
                            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}>
                            <MoreVertical className="w-4 h-4" />
                        </div>
                    }
                />
            </div>
        </div>
    );
}
