'use client';

import React from 'react';
import { Activity, Cpu, HardDrive, AlertCircle } from 'lucide-react';

export default function MonitoringPage() {
    return (
        <div className="flex-1 h-full bg-background p-8 overflow-y-auto">
            <div className="max-w-5xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold">Monitoring</h1>
                    <p className="text-muted-foreground mt-1">Real-time metrics and system health</p>
                </div>

                {/* Service Health */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-green-500" />
                        Service Health
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-secondary/30 rounded-lg">
                            <div className="text-sm text-muted-foreground">Status</div>
                            <div className="text-2xl font-bold text-green-500">Healthy</div>
                        </div>
                        <div className="p-4 bg-secondary/30 rounded-lg">
                            <div className="text-sm text-muted-foreground">Uptime</div>
                            <div className="text-2xl font-bold text-foreground">14d 2h 12m</div>
                        </div>
                        <div className="p-4 bg-secondary/30 rounded-lg">
                            <div className="text-sm text-muted-foreground">Version</div>
                            <div className="text-2xl font-bold text-foreground">23.8.2.7</div>
                        </div>
                    </div>
                </div>

                {/* Resource Utilization */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-blue-500" />
                        Resource Utilization
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>CPU Usage</span>
                                <span className="font-mono">45%</span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 w-[45%]" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Memory Usage</span>
                                <span className="font-mono">12.4 GB / 32 GB</span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 w-[38%]" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Query Insights */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <HardDrive className="w-5 h-5 text-orange-500" />
                        Query Insights (Last 24h)
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border">
                            <div className="flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                <span className="font-medium">Total Queries</span>
                            </div>
                            <span className="font-mono font-bold">1,245,392</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border">
                            <div className="flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                <span className="font-medium">Failed Queries</span>
                            </div>
                            <span className="font-mono font-bold">234</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 p-4 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-500/20">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-sm">This is a mock view. Real metric integration coming soon.</p>
                </div>
            </div>
        </div>
    );
}
