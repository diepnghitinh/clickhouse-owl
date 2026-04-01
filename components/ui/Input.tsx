'use client';

import { type InputHTMLAttributes, forwardRef, type ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
            {label}
          </label>
        )}
        <div className="relative group">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-brand transition-colors pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={twMerge(
              'w-full border border-input rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all disabled:opacity-50',
              icon ? 'pl-10 pr-4 py-2.5' : 'px-4 py-2.5',
              error && 'border-destructive focus:border-destructive focus:ring-destructive',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-400 pl-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
