import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

const variantStyles = {
  default: {
    icon: 'bg-primary/10 text-primary',
    iconDark: 'dark:bg-primary/15'
  },
  primary: {
    icon: 'bg-primary/10 text-primary',
    iconDark: 'dark:bg-primary/15'
  },
  success: {
    icon: 'bg-emerald-500/10 text-emerald-600',
    iconDark: 'dark:bg-emerald-500/15 dark:text-emerald-400'
  },
  warning: {
    icon: 'bg-amber-500/10 text-amber-600',
    iconDark: 'dark:bg-amber-500/15 dark:text-amber-400'
  },
  danger: {
    icon: 'bg-red-500/10 text-red-600',
    iconDark: 'dark:bg-red-500/15 dark:text-red-400'
  }
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  className,
  variant = 'default'
}: StatCardProps) {
  const styles = variantStyles[variant];
  
  return (
    <div className={cn(
      'group relative overflow-hidden rounded-2xl border border-border/40 bg-card p-6 transition-all duration-300 ease-premium shadow-premium hover:shadow-premium-lg',
      className
    )}>
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-xs font-medium text-muted-foreground tracking-wide">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-semibold text-foreground tracking-tight leading-none truncate max-w-full">
              {value}
            </p>
            {trend && trendValue && (
              <span className={cn(
                'text-xs font-medium flex-shrink-0 px-1.5 py-0.5 rounded-md',
                trend === 'up' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                trend === 'down' && 'bg-red-500/10 text-red-600 dark:text-red-400',
                trend === 'neutral' && 'bg-secondary text-muted-foreground'
              )}>
                {trend === 'up' && '↑ '}
                {trend === 'down' && '↓ '}
                {trendValue}
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground truncate">{description}</p>
          )}
        </div>
        
        {Icon && (
          <div className={cn(
            "flex-shrink-0 p-3 rounded-xl transition-transform duration-300 group-hover:scale-105",
            styles.icon,
            styles.iconDark
          )}>
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>
        )}
      </div>
    </div>
  );
}
