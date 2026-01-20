import React from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export interface QueryTab {
    id: string;
    title: string;
    query: string;
    results: any | null;
    error: string | null;
    executing: boolean;
    executionPlan?: any[];
}

interface SqlTabsProps {
    tabs: QueryTab[];
    activeTabId: string;
    onTabChange: (id: string) => void;
    onCloseTab: (id: string) => void;
    onAddTab: () => void;
}

export function SqlTabs({ tabs, activeTabId, onTabChange, onCloseTab, onAddTab }: SqlTabsProps) {
    return (
        <div className="flex items-center border-b border-border bg-muted/40 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
                <div
                    key={tab.id}
                    className={cn(
                        "group flex items-center min-w-[120px] max-w-[200px] h-9 px-3 border-r border-border cursor-pointer select-none text-sm transition-colors",
                        activeTabId === tab.id
                            ? "bg-background text-foreground font-medium border-t-2 border-t-brand"
                            : "bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                    onClick={() => onTabChange(tab.id)}
                >
                    <span className="truncate flex-1 mr-2">{tab.title}</span>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onCloseTab(tab.id);
                        }}
                        className={cn(
                            "opacity-0 group-hover:opacity-100 p-0.5 rounded-sm hover:bg-muted-foreground/20 transition-opacity",
                            tabs.length === 1 ? "hidden" : "" // Don't allow closing the last tab
                        )}
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ))}

            <button
                onClick={onAddTab}
                className="flex items-center justify-center w-9 h-9 border-r border-border hover:bg-muted/60 text-muted-foreground transition-colors"
                title="New Tab"
            >
                <Plus className="w-4 h-4" />
            </button>
        </div>
    );
}
