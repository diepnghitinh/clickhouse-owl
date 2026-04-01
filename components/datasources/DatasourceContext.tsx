'use client';

import React, { createContext, useContext, useState } from 'react';
import { DataSource } from '@/components/DataSourceListItem';
import { generateId } from '@/lib/utils';

interface DatasourceContextType {
    datasources: DataSource[];
    loading: boolean;
    addDatasource: (ds: DataSource) => void;
    updateDatasource: (ds: DataSource) => void;
    removeDatasource: (id: string) => void;
}

const DatasourceContext = createContext<DatasourceContextType | undefined>(undefined);
const STORAGE_KEY = 'owl_datasources';

function loadDatasources(): DataSource[] {
    if (typeof window === 'undefined') {
        return [];
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        return [];
    }

    try {
        const parsed = JSON.parse(stored);
        const normalized = Array.isArray(parsed)
            ? parsed
                .map((ds) => normalizeDatasource(ds))
                .filter((ds): ds is DataSource => ds !== null)
            : [];

        if (normalized.length !== parsed.length || JSON.stringify(normalized) !== JSON.stringify(parsed)) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        }

        return normalized;
    } catch (e) {
        console.error("Failed to parse datasources", e);
        return [];
    }
}

function normalizeDatasource(ds: Partial<DataSource>): DataSource | null {
    if (!ds || typeof ds.name !== 'string' || typeof ds.engine !== 'string') {
        return null;
    }

    const host = typeof ds.host === 'string' ? ds.host : '';
    const port = typeof ds.port === 'string' || typeof ds.port === 'number' ? ds.port : '';
    const database = typeof ds.database === 'string' ? ds.database : '';
    const details = typeof ds.details === 'string' && ds.details.trim().length > 0
        ? ds.details
        : `${ds.engine}('${host}:${port}', '${database}')`;

    return {
        id: typeof ds.id === 'string' && ds.id.trim().length > 0 ? ds.id : generateId(),
        name: ds.name,
        engine: ds.engine,
        details,
        host,
        port,
        username: typeof ds.username === 'string' ? ds.username : '',
        password: typeof ds.password === 'string' ? ds.password : '',
        database,
        ssl: Boolean(ds.ssl),
        authSource: typeof ds.authSource === 'string' ? ds.authSource : undefined,
    };
}

export function DatasourceProvider({ children }: { children: React.ReactNode }) {
    const [datasources, setDatasources] = useState<DataSource[]>(loadDatasources);
    const [loading] = useState(false);

    const save = (newList: DataSource[]) => {
        setDatasources(newList);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    };

    const addDatasource = (ds: DataSource) => {
        const normalized = normalizeDatasource(ds);
        if (!normalized) return;

        setDatasources((current) => {
            const next = [...current, normalized];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    };

    const updateDatasource = (updatedDs: DataSource) => {
        const normalized = normalizeDatasource(updatedDs);
        if (!normalized) return;

        setDatasources((current) => {
            const next = current.map((ds) => ds.id === normalized.id ? normalized : ds);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    };

    const removeDatasource = (id: string) => {
        setDatasources((current) => {
            const next = current.filter((ds) => ds.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    };

    return (
        <DatasourceContext.Provider value={{ datasources, loading, addDatasource, updateDatasource, removeDatasource }}>
            {children}
        </DatasourceContext.Provider>
    );
}

export function useDatasources() {
    const context = useContext(DatasourceContext);
    if (!context) {
        throw new Error('useDatasources must be used within a DatasourceProvider');
    }
    return context;
}
