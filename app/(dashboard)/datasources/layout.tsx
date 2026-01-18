'use client';

import React from 'react';
import { Database, Plus } from 'lucide-react';
import { DatasourceProvider } from '@/components/datasources/DatasourceContext';
import { Sidebar } from './Sidebar';

export default function DatasourcesLayout({ children }: { children: React.ReactNode }) {
    return (
        <DatasourceProvider>
            <div className="flex flex-col h-full bg-background/50">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
                    <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-brand" />
                        <h1 className="text-xl font-semibold">Data Sources</h1>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex">
                    <Sidebar />
                    <div className="flex-1 overflow-y-auto bg-background/50">
                        {children}
                    </div>
                </div>
            </div>
        </DatasourceProvider>
    );
}
