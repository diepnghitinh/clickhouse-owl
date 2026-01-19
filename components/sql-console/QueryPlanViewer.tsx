import React from 'react';
import { ArrowRight, Box, MoveDown } from 'lucide-react';

interface PlanNode {
    "Node Type": string;
    description?: string;
    Plans?: PlanNode[];
    [key: string]: any;
}

interface QueryPlanViewerProps {
    plan: PlanNode[];
    onClose: () => void;
}

function PlanNodeView({ node, depth = 0 }: { node: PlanNode; depth?: number }) {
    return (
        <div className="flex flex-col items-center">
            <div className={`
                flex flex-col gap-1 p-3 rounded-lg border shadow-sm min-w-[200px] text-center relative bg-card
                ${depth === 0 ? 'border-brand/50 bg-brand/5' : 'border-border'}
            `}>
                <span className="text-xs font-bold text-foreground">{node["Node Type"]}</span>
                {(node.description || node.Description) && (
                    <span className="text-[10px] text-muted-foreground max-w-[250px]">
                        {node.description || node.Description}
                    </span>
                )}

                {/* Render other interesting properties */}
                <div className="flex flex-col gap-0.5 mt-2">
                    {Object.entries(node).map(([key, value]) => {
                        if (key === "Node Type" || key === "Plans" || key === "description" || key === "Description") return null;
                        if (typeof value === 'object') return null;
                        return (
                            <div key={key} className="text-[10px] grid grid-cols-2 gap-2 text-left">
                                <span className="text-muted-foreground truncate" title={key}>{key}:</span>
                                <span className="font-mono truncate" title={String(value)}>{String(value)}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {node.Plans && node.Plans.length > 0 && (
                <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-2">
                    <MoveDown className="w-4 h-4 text-border my-2" />
                    <div className="flex gap-8 items-start">
                        {node.Plans.map((child, i) => (
                            <PlanNodeView key={i} node={child} depth={depth + 1} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export function QueryPlanViewer({ plan, onClose }: QueryPlanViewerProps) {
    if (!plan || plan.length === 0) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                No execution plan available.
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto p-8 bg-secondary/5 min-h-[500px] flex justify-center">
            {/* We typically only have one root node, but the API returns an array */}
            <div className="flex gap-8">
                {plan.map((root, i) => (
                    <PlanNodeView key={i} node={root} />
                ))}
            </div>
        </div>
    );
}
