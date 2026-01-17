'use client';

import { useState } from 'react';
import { Database, Lock, User, ArrowRight, Sparkles, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface LoginProps {
  onLoginSuccess: () => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, password }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error || 'Login failed');
    } else {
      onLoginSuccess();
    }
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Left side - Branding (Keep Dark/Colorful) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden bg-slate-900">
        {/* Animated Background decorations */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-brand/30 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-accent/30 rounded-full blur-[120px] animate-pulse-slow delay-1000" />

        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-24">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-gradient-to-tr from-brand to-accent rounded-xl flex items-center justify-center shadow-lg shadow-brand/20">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">ClickHouse <span className="text-brand">Owl</span></h1>
              <p className="text-sm text-slate-400">ClickHouse Admin Management</p>
            </div>
          </div>

          <h2 className="text-5xl font-bold text-white leading-tight mb-8">
            Manage your<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-accent">ClickHouse clusters</span>
          </h2>

          <p className="text-lg text-slate-300 max-w-lg mb-12 leading-relaxed">
            Modern admin interface for ClickHouse. Monitor, query, and manage your OLAP database with ease.
          </p>

          <div className="space-y-6">
            <Feature icon={<Zap className="w-5 h-5" />} title="Real-time Queries">
              Execute SQL queries and view results instantly
            </Feature>
            <Feature icon={<Shield className="w-5 h-5" />} title="Database Management">
              Create and manage databases, tables, and schemas
            </Feature>
            <Feature icon={<Sparkles className="w-5 h-5" />} title="Activity Monitoring">
              Track queries, performance, and system health
            </Feature>
          </div>
        </div>
      </div>

      {/* Right side - Login form (Light Theme Aware) */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative bg-background">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-brand/5 pointer-events-none" />

        <div className="w-full max-w-md bg-card p-8 rounded-2xl shadow-xl border border-border relative z-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Welcome Back</h2>
            <p className="text-muted-foreground text-sm">Sign in to access your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive text-center">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block ml-1">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    placeholder="Enter username"
                    required
                    autoComplete="username"
                    autoFocus
                    className="pl-10 bg-secondary/50 border-input focus:border-brand/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    autoComplete="current-password"
                    className="pl-10 bg-secondary/50 border-input focus:border-brand/50"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              loading={loading}
              className="w-full h-11 text-base shadow-sm"
              iconRight={!loading && <ArrowRight className="w-4 h-4" />}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              Default: <code className="text-brand font-mono">default</code> / <code className="text-brand font-mono">clickhouse</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 group">
      <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-brand group-hover:bg-brand group-hover:text-black transition-all duration-300 shadow-lg shadow-black/20">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-white text-sm">{title}</h3>
        <p className="text-xs text-slate-400">{children}</p>
      </div>
    </div>
  );
}
