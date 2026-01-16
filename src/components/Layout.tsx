import React from 'react';
import {
    LayoutDashboard,
    Settings,
    Table2,
    Database,
    MessageSquare,
    PanelLeftClose,
    Terminal
} from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
    children: React.ReactNode;
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export function Layout({
    children,
    activeTab,
    onTabChange
}: LayoutProps) {
    const NavItem = ({ icon: Icon, label, id }: { icon: any, label: string, id: string }) => (
        <button
            onClick={() => onTabChange(id)}
            className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium",
                activeTab === id
                    ? "text-foreground bg-secondary font-semibold"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            )}
        >
            <Icon className={cn("w-4 h-4", activeTab === id ? "text-foreground" : "text-muted-foreground")} />
            <span>{label}</span>
        </button>
    );

    const SectionHeader = ({ label }: { label: string }) => (
        <div className="px-3 mt-6 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {label}
        </div>
    );

    return (
        <div className="flex w-full h-screen bg-background text-foreground overflow-hidden font-sans">
            {/* Primary Sidebar */}
            <aside className="w-[240px] flex flex-col h-full border-r border-border bg-background shrink-0">
                {/* Header */}
                <div className="p-4 flex items-center gap-3 border-b border-border/40">
                    <div className="w-8 h-8 bg-gradient-to-tr from-brand to-accent rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
                        🦉
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">ClickHouse</div>
                        <div className="text-sm font-semibold text-foreground">Local Server</div>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-2 px-2 custom-scrollbar">
                    <SectionHeader label="General" />
                    <NavItem icon={LayoutDashboard} label="Dashboard" id="dashboard" />
                    <NavItem icon={Settings} label="Settings" id="settings" />

                    <SectionHeader label="Database" />
                    <NavItem icon={Table2} label="Tables" id="tables" />
                    <NavItem icon={Terminal} label="SQL Editor" id="query" />
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-border mt-auto">
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-md transition-colors">
                        <MessageSquare className="w-4 h-4" />
                        <span>Feedback</span>
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-md transition-colors mt-1">
                        <PanelLeftClose className="w-4 h-4" />
                        <span>Collapse menu</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden bg-background">
                {children}
            </main>
        </div>
    );
}

// Protected layout wrapper
export function ProtectedLayout({
    children,
    isAuthenticated,
    onLogout,
    currentTab,
    onTabChange
}: {
    children: React.ReactNode;
    isAuthenticated: boolean;
    onLogout: () => void;
    currentTab: string;
    onTabChange: (tab: string) => void;
}) {
    if (!isAuthenticated) return <>{children}</>;
    return (
        <Layout activeTab={currentTab} onTabChange={onTabChange}>
            {children}
        </Layout>
    );
}
