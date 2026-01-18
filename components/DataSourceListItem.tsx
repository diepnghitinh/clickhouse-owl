import React from 'react';
import { Settings2, Edit2, Trash2, MoreVertical, Database } from 'lucide-react';
import { Dropdown } from '@/components/ui/Dropdown';
import { cn } from '@/lib/utils';

export interface DataSource {
    id: string;
    name: string;
    engine: string;
    details: string;
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
                <div className={cn(
                    "w-8 h-8 rounded flex items-center justify-center shrink-0",
                    isActive ? "bg-brand/10 text-brand" : "bg-blue-100 dark:bg-blue-900/20"
                )}>
                    {isActive ? <Database className="w-4 h-4" /> : <div className="text-lg">🐘</div>}
                </div>
                <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{dataSource.name}</div>
                    <div className="text-xs text-muted-foreground truncate opacity-70">PostgreSQL</div>
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
