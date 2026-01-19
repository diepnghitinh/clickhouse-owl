import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface QueryEditorProps {
    query: string;
    onChange: (query: string) => void;
    onRun: () => void;
    className?: string;
}

export function QueryEditor({ query, onChange, onRun, className }: QueryEditorProps) {
    const [height, setHeight] = useState(300); // Default height in px
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const startY = useRef(0);
    const startHeight = useRef(0);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            onRun();
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        startY.current = e.clientY;
        startHeight.current = height;
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        const delta = e.clientY - startY.current;
        const newHeight = Math.max(100, Math.min(800, startHeight.current + delta)); // Min 100px, Max 800px
        setHeight(newHeight);
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    return (
        <div
            className={cn("flex flex-col border-b border-border bg-background relative shrink-0", className)}
            style={{ height }}
            ref={containerRef}
        >
            <div className="flex-1 min-h-0 relative">
                <textarea
                    className="w-full h-full bg-secondary/10 p-4 font-mono text-sm resize-none focus:outline-none focus:border-brand/50 custom-scrollbar"
                    value={query}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="SELECT * FROM table..."
                    spellCheck={false}
                />
            </div>

            {/* Drag Handle */}
            <div
                className="h-1.5 w-full bg-border hover:bg-brand/50 cursor-row-resize transition-colors absolute bottom-0 left-0 z-10 flex items-center justify-center group"
                onMouseDown={handleMouseDown}
            >
                <div className="w-8 h-1 rounded-full bg-muted-foreground/20 group-hover:bg-brand/50" />
            </div>
        </div>
    );
}
