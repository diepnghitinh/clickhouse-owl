'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Table2, Terminal, Plus, Pencil, Trash, Database, Server } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar({ username }: { username: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  /* Connection management logic moved to /connections page */

  return (
    <>
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
            href="/connections"
            className={cn(
              "w-full flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium",
              pathname === '/connections' || pathname === '/' ? "text-foreground bg-secondary font-semibold" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            )}
          >
            <Server className="w-4 h-4" />
            Connections
          </Link>
          <Link
            href="/datasources"
            className={cn(
              "w-full flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium",
              pathname === '/datasources' ? "text-foreground bg-secondary font-semibold" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            )}
          >
            <Database className="w-4 h-4" />
            Data Sources
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

          {/* Connections list removed in favor of /connections page */}
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
