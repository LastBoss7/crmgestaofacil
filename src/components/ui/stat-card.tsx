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
    icon: 'from-violet-500 to-purple-600',
    glow: 'shadow-violet-500/20'
  },
  primary: {
    icon: 'from-violet-500 to-purple-600',
    glow: 'shadow-violet-500/20'
  },
  success: {
    icon: 'from-violet-500 to-purple-600',
    glow: 'shadow-violet-500/20'
  },
  warning: {
    icon: 'from-amber-500 to-orange-600',
    glow: 'shadow-amber-500/20'
  },
  danger: {
    icon: 'from-red-500 to-rose-600',
    glow: 'shadow-red-500/20'
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
      'group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/20 hover:shadow-md',
      className
    )}>
      {/* Glow effect */}
      <div className={cn(
        "absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500",
        `bg-gradient-to-br ${styles.icon}`
      )} />
      
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-2xl font-bold text-foreground tracking-tight truncate">
              {value}
            </p>
            {trend && trendValue && (
              <span className={cn(
                'text-xs font-medium',
                trend === 'up' && 'text-emerald-500',
                trend === 'down' && 'text-red-500',
                trend === 'neutral' && 'text-muted-foreground'
              )}>
                {trend === 'up' && '↑'}
                {trend === 'down' && '↓'}
                {trendValue}
              </span>
            )}
          </div>
          {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
        </div>
        
        {Icon && (
          <div className={cn(
            "flex-shrink-0 p-2.5 rounded-lg bg-gradient-to-br",
            styles.icon,
            "text-white"
          )}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
    </div>
  );
}