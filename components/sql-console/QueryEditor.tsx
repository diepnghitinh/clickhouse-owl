import React, { useRef, useState, useEffect } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { cn } from '@/lib/utils';

interface QueryEditorProps {
    query: string;
    onChange: (query: string) => void;
    onRun: () => void;
    className?: string;
    onEditorMount?: (editor: any) => void;
}

export function QueryEditor({ query, onChange, onRun, className, onEditorMount }: QueryEditorProps) {
    const [height, setHeight] = useState(300); // Default height in px
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const startY = useRef(0);
    const startHeight = useRef(0);

    // Resize Logic
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

    // Monaco Configuration
    const handleEditorDidMount = (editor: any, monaco: any) => {
        if (onEditorMount) {
            onEditorMount(editor);
        }
        // Add execute shortcut (Cmd+Enter)
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            onRun();
        });
    };

    return (
        <div
            className={cn("flex flex-col border-b border-border bg-background relative shrink-0", className)}
            style={{ height }}
            ref={containerRef}
        >
            <div className="flex-1 min-h-0 relative">
                <Editor
                    height="100%"
                    defaultLanguage="sql"
                    value={query}
                    onChange={(value) => onChange(value || '')}
                    theme="vs-dark" // Assuming dark mode based on previous UI
                    onMount={handleEditorDidMount}
                    options={{
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 14,
                        fontFamily: 'monospace',
                        automaticLayout: true,
                        padding: { top: 16, bottom: 16 },
                    }}
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
