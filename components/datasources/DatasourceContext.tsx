'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { DataSource } from '@/components/DataSourceListItem';

interface DatasourceContextType {
    datasources: DataSource[];
    loading: boolean;
    addDatasource: (ds: DataSource) => void;
    updateDatasource: (ds: DataSource) => void;
    removeDatasource: (id: string) => void;
}

const DatasourceContext = createContext<DatasourceContextType | undefined>(undefined);

export function DatasourceProvider({ children }: { children: React.ReactNode }) {
    const [datasources, setDatasources] = useState<DataSource[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('owl_datasources');
        if (stored) {
            try {
                let parsed: DataSource[] = JSON.parse(stored);
                // Backward compatibility
                parsed = parsed.map(ds => {
                    if (!ds.id) return { ...ds, id: crypto.randomUUID() };
                    return ds;
                });
                setDatasources(parsed);
            } catch (e) {
                console.error("Failed to parse datasources", e);
            }
        }
        setLoading(false);
    }, []);

    const save = (newList: DataSource[]) => {
        setDatasources(newList);
        localStorage.setItem('owl_datasources', JSON.stringify(newList));
    };

    const addDatasource = (ds: DataSource) => {
        save([...datasources, ds]);
    };

    const updateDatasource = (updatedDs: DataSource) => {
        save(datasources.map(ds => ds.id === updatedDs.id ? updatedDs : ds));
    };

    const removeDatasource = (id: string) => {
        save(datasources.filter(ds => ds.id !== id));
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
