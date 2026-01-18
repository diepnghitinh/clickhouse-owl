'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { cn } from '@/lib/utils';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    description?: React.ReactNode;
    children: React.ReactNode;
    className?: string; // For customized content width/layout
}

export function Modal({ isOpen, onClose, title, description, children, className }: ModalProps) {
    useEscapeKey(onClose, isOpen);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className={cn(
                    "bg-card border border-border rounded-xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]",
                    className || "w-full max-w-md p-6" // Default width/padding if not overridden
                )}
            >
                <Button
                    variant="ghost"
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-0 w-8 h-8 rounded-md z-10"
                    icon={<X className="w-5 h-5" />}
                />

                {(title || description) && (
                    <div className={cn("mb-6", !title && !description && "hidden")}>
                        {title && (
                            <div className="text-xl font-bold flex items-center gap-2 pr-8">
                                {title}
                            </div>
                        )}
                        {description && (
                            <p className="text-sm text-muted-foreground mt-1">
                                {description}
                            </p>
                        )}
                    </div>
                )}

                <div className="flex-1 overflow-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}
