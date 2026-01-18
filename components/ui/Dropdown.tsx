import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownItem {
    label: string;
    onClick: () => void;
    danger?: boolean;
    icon?: React.ReactNode;
}

interface DropdownProps {
    items: DropdownItem[];
    trigger?: React.ReactNode;
    menuWidth?: string;
}

export function Dropdown({ items, trigger, menuWidth = "w-48" }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownRef]);

    return (
        <div className="relative" ref={dropdownRef}>
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-secondary"
            >
                {trigger || <MoreHorizontal className="w-4 h-4" />}
            </div>

            {isOpen && (
                <div className={cn(
                    "absolute right-0 top-full mt-1 bg-white dark:bg-dark-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right",
                    menuWidth
                )}>
                    <div className="py-1">
                        {items.map((item, idx) => (
                            <button
                                key={idx}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    item.onClick();
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-secondary",
                                    item.danger ? "text-red-500 hover:bg-red-500/10" : "text-foreground"
                                )}
                            >
                                {item.icon && <span className="w-3 h-3">{item.icon}</span>}
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
