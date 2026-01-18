'use client';

import React, { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { DataSourceListItem } from '@/components/DataSourceListItem';
import { useDatasources } from '@/components/datasources/DatasourceContext';
import { AddDataSourceModal } from '@/components/AddDataSourceModal';
import { EditDataSourceModal } from '@/components/EditDataSourceModal';
import { useParams, useRouter, usePathname } from 'next/navigation';

export function Sidebar() {
    const { datasources, loading, addDatasource, updateDatasource, removeDatasource } = useDatasources();
    const router = useRouter();
    const pathname = usePathname();
    const params = useParams();
    const activeId = params.id as string;

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [sourceToEdit, setSourceToEdit] = useState<any>(null);

    const handleAdd = (data: any) => {
        const newSource = {
            ...data,
            details: `${data.engine}('${data.host}:${data.port}', '${data.database}')`
        };
        addDatasource(newSource);
    };

    const handleEdit = (data: any) => {
        updateDatasource(data);
        setIsEditModalOpen(false);
        setSourceToEdit(null);
    };

    const handleDelete = (ds: any) => {
        if (confirm(`Are you sure you want to delete "${ds.name}"?`)) {
            removeDatasource(ds.id);
            if (activeId === ds.id) {
                router.push('/datasources');
            }
        }
    };

    const handleSelect = (ds: any) => {
        router.push(`/datasources/${ds.id}`);
    };

    return (
        <div className="w-[300px] border-r border-border overflow-y-auto p-4 bg-background/30 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Saved Connections
                </h2>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="p-1 hover:bg-secondary rounded-md text-muted-foreground transition-colors"
                    title="Add Source"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="space-y-2">
                    {datasources.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-4">No sources saved.</div>
                    ) : (
                        datasources.map((ds) => (
                            <DataSourceListItem
                                key={ds.id}
                                dataSource={ds}
                                isActive={activeId === ds.id}
                                onConnect={handleSelect}
                                onEdit={(d) => { setSourceToEdit(d); setIsEditModalOpen(true); }}
                                onDelete={handleDelete}
                            />
                        ))
                    )}
                </div>
            )}

            <AddDataSourceModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAdd}
            />

            <EditDataSourceModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onEdit={handleEdit}
                initialData={sourceToEdit}
            />
        </div>
    );
}
