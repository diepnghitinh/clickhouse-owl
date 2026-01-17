import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, icon, iconRight, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-brand hover:brightness-110 text-brand-foreground shadow-lg shadow-brand/20 border border-brand/20',
      secondary: 'bg-secondary hover:bg-secondary/80 text-secondary-foreground',
      ghost: 'bg-transparent hover:bg-white/5 text-muted-foreground hover:text-primary',
      outline: 'bg-transparent border border-white/10 hover:border-white/20 text-muted-foreground hover:text-primary',
      danger: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg shadow-destructive/20',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={twMerge(
          'relative inline-flex items-center justify-center gap-2 font-medium transition-all rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {!loading && icon}
        <span>{children}</span>
        {!loading && iconRight}
      </button>
    );
  }
);

Button.displayName = 'Button';
