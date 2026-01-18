'use client';

import React from 'react';
import { Database } from 'lucide-react';

export default function DataSourcesPage() {
    return (
        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
            <Database className="w-12 h-12 mb-4" />
            <p className="text-lg">Select a data source to connect</p>
        </div>
    );
}
