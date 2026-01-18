'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Breadcrumb() {
    const pathname = usePathname();
    const segments = pathname.split('/').filter(Boolean);

    // Map segments to breadcrumb items
    // Structure: /connection/[id]/[database]/[table]
    // or /connections

    if (segments.length === 0 || segments[0] === 'login') return null;

    const items: { label: string; href: string; icon?: React.ReactNode }[] = [
        { label: 'Home', href: '/connections', icon: <Home className="w-4 h-4" /> }
    ];

    let currentPath = '';

    // Custom logic to build breadcrumbs based on known routes
    if (segments[0] === 'connection') {
        // 1. Connection
        if (segments[1]) {
            const connectionId = segments[1];
            // Decode ID to get a readable name (assuming ID is derived from name for now)
            const connectionName = decodeURIComponent(connectionId).replace(/-/g, ' ');
            currentPath += `/connection/${connectionId}`;
            items.push({
                label: connectionName,
                href: currentPath
            });

            // 2. Database
            if (segments[2]) {
                const dbName = decodeURIComponent(segments[2]);
                currentPath += `/${segments[2]}`;
                items.push({
                    label: dbName,
                    href: currentPath
                });

                // 3. Table
                if (segments[3]) {
                    const tableName = decodeURIComponent(segments[3]);
                    currentPath += `/${segments[3]}`;
                    items.push({
                        label: tableName,
                        href: currentPath,
                        icon: undefined
                    });
                }
            }
        }
    } else if (segments[0] === 'connections') {
        // Already at Home/Connections, do nothing or just show Home
    } else if (segments[0] === 'datasources') {
        items.push({ label: 'Data Sources', href: '/datasources' });
    }

    return (
        <nav className="flex items-center text-sm text-muted-foreground mb-4">
            {items.map((item, index) => {
                const isLast = index === items.length - 1;
                return (
                    <React.Fragment key={item.href}>
                        {index > 0 && <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground/50" />}
                        <Link
                            href={item.href}
                            className={cn(
                                "flex items-center gap-1 hover:text-foreground transition-colors",
                                isLast && "font-semibold text-foreground pointer-events-none"
                            )}
                        >
                            {item.icon}
                            <span className="capitalize">{item.label}</span>
                        </Link>
                    </React.Fragment>
                );
            })}
        </nav>
    );
}
