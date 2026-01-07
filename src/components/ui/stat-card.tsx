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
    glow: 'shadow-violet-500/20',
  },
  primary: {
    icon: 'from-violet-500 to-purple-600',
    glow: 'shadow-violet-500/20',
  },
  success: {
    icon: 'from-emerald-500 to-teal-600',
    glow: 'shadow-emerald-500/20',
  },
  warning: {
    icon: 'from-amber-500 to-orange-600',
    glow: 'shadow-amber-500/20',
  },
  danger: {
    icon: 'from-red-500 to-rose-600',
    glow: 'shadow-red-500/20',
  },
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  className,
  variant = 'default',
}: StatCardProps) {
  const styles = variantStyles[variant];
  
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-card to-card/50 p-6 transition-all duration-300 hover:border-white/[0.1] hover:shadow-lg',
        className
      )}
    >
      {/* Glow effect */}
      <div className={cn(
        "absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-500",
        `bg-gradient-to-br ${styles.icon}`
      )} />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-white/50 uppercase tracking-wider">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-white tracking-tight">
              {value}
            </p>
            {trend && trendValue && (
              <span
                className={cn(
                  'text-sm font-medium',
                  trend === 'up' && 'text-emerald-400',
                  trend === 'down' && 'text-red-400',
                  trend === 'neutral' && 'text-white/40'
                )}
              >
                {trend === 'up' && '↑'}
                {trend === 'down' && '↓'}
                {trendValue}
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm text-white/40">{description}</p>
          )}
        </div>
        
        <div className={cn(
          "p-3 rounded-xl bg-gradient-to-br shadow-lg",
          styles.icon,
          styles.glow
        )}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}
