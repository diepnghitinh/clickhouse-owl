'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { LayoutDashboard, Table2, Terminal, Plus, Database, Server, Activity, ChevronDown, ArrowLeft, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddConnectionModal, ConnectionConfig } from './AddConnectionModal';

export function Sidebar({ username }: { username: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const connectionId = params.id as string | undefined;

  const [connections, setConnections] = useState<ConnectionConfig[]>([]);
  const [currentConnection, setCurrentConnection] = useState<ConnectionConfig | null>(null);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Load connections safely on mount
  useEffect(() => {
    const stored = localStorage.getItem('clickhouse_connections');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setConnections(parsed);
      } catch (e) {
        console.error("Failed to parse connections", e);
      }
    }
  }, []);

  // Determine current connection based on URL params
  useEffect(() => {
    if (connectionId && connections.length > 0) {
      const match = connections.find(c =>
        c.id === connectionId ||
        encodeURIComponent(c.name.toLowerCase().replace(/\s+/g, '-')) === connectionId
      );
      setCurrentConnection(match || null);
    } else {
      setCurrentConnection(null);
    }
  }, [connectionId, connections]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleSwitchConnection = async (conn: ConnectionConfig) => {
    setIsSwitcherOpen(false);
    try {
      await fetch('/api/connection/switch', {
        method: 'POST',
        body: JSON.stringify(conn)
      });
    } catch (e) { console.error(e); }

    if (conn.id) {
      router.push(`/connection/${conn.id}`);
    } else {
      const slug = encodeURIComponent(conn.name.toLowerCase().replace(/\s+/g, '-'));
      router.push(`/connection/${slug}`);
    }
  };

  const handleAddConnection = (newConn: ConnectionConfig) => {
    const newConnections = [...connections, newConn];
    setConnections(newConnections);
    localStorage.setItem('clickhouse_connections', JSON.stringify(newConnections));
    setIsAddModalOpen(false);
    handleSwitchConnection(newConn);
  };

  const isGlobal = !connectionId;

  return (
    <>
      <aside className="w-[260px] flex flex-col h-full border-r border-border bg-background shrink-0 transition-all duration-300">
        {/* Header / Brand */}
        <div className="p-4 flex items-center gap-3 border-b border-border/40">
          <Link href="/connections" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-tr from-brand to-accent rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
              🦉
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">ClickHouse Owl</div>
              <div className="text-sm font-bold text-foreground">Admin Console</div>
            </div>
          </Link>
        </div>

        {/* Connection Switcher (Visible in Connection Mode) */}
        {!isGlobal && (
          <div className="px-3 pt-4 pb-2">
            <div className="relative">
              <button
                onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                className="w-full flex items-center justify-between p-2 pl-3 bg-secondary/50 hover:bg-secondary border border-border rounded-lg transition-all group"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-2 h-2 rounded-full bg-green-500 shrink-0 animate-pulse" />
                  <span className="font-semibold text-sm truncate">{currentConnection?.name || 'Select Connection'}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
              </button>

              {isSwitcherOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsSwitcherOpen(false)} />
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="max-h-[200px] overflow-y-auto py-1">
                      <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Switch to...</div>
                      {connections.map(conn => (
                        <button
                          key={conn.id}
                          onClick={() => handleSwitchConnection(conn)}
                          className={cn(
                            "w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-secondary transition-colors",
                            currentConnection?.id === conn.id ? "bg-secondary font-medium text-brand" : "text-foreground"
                          )}
                        >
                          <Server className="w-3 h-3 text-muted-foreground" />
                          {conn.name}
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-border p-1 bg-secondary/30">
                      <button
                        onClick={() => { setIsSwitcherOpen(false); setIsAddModalOpen(true); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-brand hover:bg-brand/10 rounded-md transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Add New Connection
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-2 px-2 custom-scrollbar space-y-1">
          {isGlobal ? (
            /* Global Menu */
            <>
              <div className="px-3 mt-4 mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Global
              </div>
              <Link
                href="/connections"
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                  pathname === '/connections' || pathname === '/' ? "text-foreground bg-secondary font-semibold" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <Server className="w-4 h-4" />
                Connections
              </Link>
              <Link
                href="/datasources"
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                  pathname === '/datasources' ? "text-foreground bg-secondary font-semibold" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <Database className="w-4 h-4" />
                Data Sources
              </Link>
            </>
          ) : (
            /* Connection Menu */
            <>
              <div className="px-3 mt-2 mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Manage
              </div>
              <Link
                href={`/connection/${connectionId}`}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                  pathname === `/connection/${connectionId}` ? "text-foreground bg-secondary font-semibold" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <LayoutDashboard className="w-4 h-4" />
                Overview
              </Link>
              <Link
                href={`/connection/${connectionId}/sql`}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                  pathname?.includes('/sql') ? "text-foreground bg-secondary font-semibold" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <Terminal className="w-4 h-4" />
                SQL Console
              </Link>
              <Link
                href={`/connection/${connectionId}/monitoring`}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                  pathname?.includes('/monitoring') ? "text-foreground bg-secondary font-semibold" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <Activity className="w-4 h-4" />
                Monitoring
              </Link>

              <div className="my-4 border-t border-border mx-2" />

              <Link
                href="/connections"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to All Connections
              </Link>
            </>
          )}

        </div>

        <div className="p-3 border-t border-border mt-auto">
          <div className="px-3 py-2 mb-2 bg-secondary/20 rounded-lg flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-brand/20 text-brand flex items-center justify-center text-xs font-bold">
              {username ? username[0].toUpperCase() : 'U'}
            </div>
            <div className="text-xs font-medium truncate">{username}</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Reused Add Modal for the Sidebar + button */}
      <AddConnectionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddConnection}
      />
    </>
  );
}
