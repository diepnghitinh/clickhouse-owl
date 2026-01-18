'use client';

import React, { useEffect, useState } from 'react';
import { Play, Database, Server, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Connection {
  id: string;
  name: string;
  url: string;
  user: string;
  password?: string;
  database?: string;
}

export default function QueryPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [query, setQuery] = useState('SELECT 1');
  const [results, setResults] = useState<{ columns: string[], rows: any[][] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load connections from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('clickhouse_connections');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setConnections(parsed);
        if (parsed.length > 0) {
          setSelectedConnection(parsed[0]);
        }
      } catch (e) {
        console.error("Failed to parse connections", e);
      }
    }
  }, []);

  // Load databases when connection changes
  useEffect(() => {
    if (!selectedConnection) return;

    const fetchDatabases = async () => {
      setLoading(true);
      setDatabases([]);
      try {
        // Determine implicit database from connection string or default
        const initialDb = selectedConnection.database || 'default';
        setSelectedDatabase(initialDb);

        const res = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'SHOW DATABASES',
            connection: selectedConnection
          })
        });

        if (res.ok) {
          const data = await res.json();
          // map rows to strings
          const dbs = data.rows.map((r: any[]) => r[0]);
          setDatabases(dbs);
        } else {
          console.error("Failed to fetch databases");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchDatabases();
  }, [selectedConnection]);

  const executeQuery = async () => {
    if (!selectedConnection || !selectedDatabase) return;

    setExecuting(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          database: selectedDatabase,
          connection: selectedConnection
        })
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setResults(data);
      }
    } catch (e: any) {
      setError(e.message || "An error occurred");
    } finally {
      setExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      executeQuery();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-border bg-card p-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-muted-foreground" />
          <select
            className="bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 min-w-[200px]"
            value={selectedConnection?.id || ''}
            onChange={(e) => {
              const conn = connections.find(c => c.id === e.target.value);
              setSelectedConnection(conn || null);
            }}
          >
            <option value="" disabled>Select Connection</option>
            {connections.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-muted-foreground" />
          <select
            className="bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 min-w-[200px]"
            value={selectedDatabase}
            onChange={(e) => setSelectedDatabase(e.target.value)}
            disabled={loading}
          >
            {loading ? (
              <option>Loading...</option>
            ) : (
              databases.map(db => (
                <option key={db} value={db}>{db}</option>
              ))
            )}
          </select>
        </div>

        <div className="h-6 w-px bg-border mx-2" />

        <Button
          onClick={executeQuery}
          disabled={executing || !selectedConnection}
          loading={executing}
          icon={<Play className="w-4 h-4 fill-current" />}
          className="gap-2"
        >
          Run Query
        </Button>
        <span className="text-xs text-muted-foreground ml-2">(Cmd+Enter)</span>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="h-1/2 border-b border-border p-4 relative">
          <textarea
            className="w-full h-full bg-secondary/20 p-4 font-mono text-sm resize-none focus:outline-none rounded-lg border border-border focus:border-brand/50"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="SELECT * FROM table..."
            spellCheck={false}
          />
        </div>

        {/* Results Area */}
        <div className="h-1/2 bg-card overflow-auto p-4">
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 font-mono text-sm whitespace-pre-wrap">
              {error}
            </div>
          )}

          {results && (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="bg-secondary/30 px-4 py-2 text-xs font-semibold text-muted-foreground border-b border-border">
                {results.rows.length} rows, {results.columns.length} columns
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                    <tr>
                      {results.columns.map((col, i) => (
                        <th key={i} className="px-4 py-3 font-medium whitespace-nowrap border-b border-border">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
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
    </div>
  );
}
