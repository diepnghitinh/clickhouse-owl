'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Table2, Terminal, Plus, Pencil, Trash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddConnectionModal, ConnectionConfig } from '@/components/AddConnectionModal';
import { Dropdown } from '@/components/ui/Dropdown';

export function Sidebar({ username }: { username: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const [isConnectionModalOpen, setIsConnectionModalOpen] = React.useState(false);
  const [connections, setConnections] = React.useState<any[]>([]);
  const [editingConnection, setEditingConnection] = React.useState<ConnectionConfig | undefined>(undefined);

  React.useEffect(() => {
    const stored = localStorage.getItem('clickhouse_connections');
    if (stored) {
      setConnections(JSON.parse(stored));
    }
  }, []);

  const handleSaveConnection = (connection: ConnectionConfig) => {
    let newConnections;
    if (editingConnection) {
      // Update existing
      newConnections = connections.map(c => c.name === editingConnection.name ? connection : c);
    } else {
      // Add new
      newConnections = [...connections, connection];
    }

    setConnections(newConnections);
    localStorage.setItem('clickhouse_connections', JSON.stringify(newConnections));
    setEditingConnection(undefined); // Reset edit state
  };

  const handleEdit = (conn: any) => {
    setEditingConnection(conn);
    setIsConnectionModalOpen(true);
  };

  const handleRemove = (conn: any) => {
    if (confirm(`Are you sure you want to remove ${conn.name}?`)) {
      const newConnections = connections.filter(c => c.name !== conn.name);
      setConnections(newConnections);
      localStorage.setItem('clickhouse_connections', JSON.stringify(newConnections));
    }
  };

  const openAddModal = () => {
    setEditingConnection(undefined);
    setIsConnectionModalOpen(true);
  };

  const handleSwitchConnection = async (conn: any) => {
    try {
      const res = await fetch('/api/connection/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conn)
      });

      if (res.ok) {
        // Redirect to detail page to view/manage this connection's databases
        // We can treat the connection name or index as an ID, or generate one.
        // For now, let's use a safe-url version of the name or just "default" if it's the first one.
        // Actually, simply reloading to dashboard is default behavior, but user asked for "redirect to detail".
        // Let's create a URL safe ID from name (or random ID if we had one).
        const id = encodeURIComponent(conn.name.toLowerCase().replace(/\s+/g, '-'));
        window.location.href = `/connection/${id}`;
      } else {
        alert("Failed to switch connection");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to switch connection");
    }
  };

  return (
    <>
      <AddConnectionModal
        isOpen={isConnectionModalOpen}
        onClose={() => setIsConnectionModalOpen(false)}
        onAdd={handleSaveConnection}
        initialData={editingConnection}
      />
      <aside className="w-[240px] flex flex-col h-full border-r border-border bg-background shrink-0">
        <div className="p-4 flex items-center gap-3 border-b border-border/40">
          <div className="w-8 h-8 bg-gradient-to-tr from-brand to-accent rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
            🦉
          </div>
          <div>
            <div className="text-xs text-muted-foreground">ClickHouse</div>
            <div className="text-sm font-semibold text-foreground">Local Server</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2 custom-scrollbar">
          <div className="px-3 mt-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            General
          </div>
          <Link
            href="/"
            className={cn(
              "w-full flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium",
              pathname === '/' ? "text-foreground bg-secondary font-semibold" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link
            href="/tables"
            className={cn(
              "w-full flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium",
              pathname === '/tables' ? "text-foreground bg-secondary font-semibold" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            )}
          >
            <Table2 className="w-4 h-4" />
            Tables
          </Link>
          <Link
            href="/query"
            className={cn(
              "w-full flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium",
              pathname === '/query' ? "text-foreground bg-secondary font-semibold" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            )}
          >
            <Terminal className="w-4 h-4" />
            SQL Editor
          </Link>

          <div className="px-3 mt-6 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Connections
          </div>
          <div className="space-y-1">
            {connections.map((conn, idx) => (
              <div key={idx} className="group flex items-center gap-1 pr-2 rounded-md hover:bg-secondary/50 transition-colors">
                <button
                  onClick={() => handleSwitchConnection(conn)}
                  className="flex-1 flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground text-left overflow-hidden"
                >
                  <div className="w-2 h-2 rounded-full bg-green-500/50 group-hover:bg-green-500 shrink-0" />
                  <span className="truncate">{conn.name}</span>
                </button>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Dropdown
                    items={[
                      { label: 'Edit', onClick: () => handleEdit(conn), icon: <Pencil className="w-3 h-3" /> },
                      { label: 'Remove', onClick: () => handleRemove(conn), danger: true, icon: <Trash className="w-3 h-3" /> }
                    ]}
                  />
                </div>
              </div>
            ))}
            <button
              onClick={openAddModal}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground border border-dashed border-border/50 hover:border-brand/50 mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Connection</span>
            </button>
          </div>
        </div>

        <div className="p-3 border-t border-border mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-md transition-colors"
          >
            Logout ({username})
          </button>
        </div>
      </aside>
    </>
  );
}
