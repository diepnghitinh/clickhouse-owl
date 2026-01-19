import React from 'react';
import { Play } from 'lucide-react';

interface ResultsTableProps {
    results: {
        columns: string[];
        rows: any[][];
        statistics?: { elapsed: number; rows_read: number; bytes_read: number; };
    } | null;
    error: string | null;
    executing: boolean;
}

export function ResultsTable({ results, error, executing }: ResultsTableProps) {
    return (
        <div className="flex-1 bg-card overflow-hidden flex flex-col min-h-0">
            <div className="border-b border-border px-4 py-2 bg-secondary/10 flex items-center justify-between shrink-0">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Results</span>
                {results && (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                            {results.rows.length} rows • {results.columns.length} columns
                        </span>
                        {results.statistics && (
                            <>
                                <span className="w-px h-3 bg-border" />
                                <span>{results.statistics.elapsed.toFixed(3)}s</span>
                                <span className="w-px h-3 bg-border" />
                                <span>{results.statistics.rows_read} rows read</span>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                {error && (
                    <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 font-mono text-sm whitespace-pre-wrap">
                        {error}
                    </div>
                )}

                {results && (
                    <div className="rounded-lg border border-border overflow-hidden inline-block min-w-full align-top">
                        <table className="min-w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 sticky top-0">
                                <tr>
                                    {results.columns.map((col, i) => (
                                        <th key={i} className="px-4 py-3 font-medium whitespace-nowrap border-b border-border bg-secondary/50">
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-card">
                                {results.rows.map((row, i) => (
                                    <tr key={i} className="hover:bg-secondary/20">
                                        {row.map((cell, j) => (
                                            <td key={j} className="px-4 py-2 whitespace-nowrap max-w-[300px] truncate border-r border-border/50 last:border-r-0 font-mono text-xs">
                                                {typeof cell === 'object' ? JSON.stringify(cell) : String(cell)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!results && !error && !executing && (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                        <Play className="w-12 h-12 mb-4 stroke-1" />
                        <p>Run a query to see results</p>
                    </div>
                )}
            </div>
        </div>
    );
}
