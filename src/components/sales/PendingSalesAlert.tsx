import { useMemo } from 'react';
import { AlertTriangle, Clock, AlertCircle } from 'lucide-react';
import { Sale } from '@/types/database';
import { differenceInHours, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface PendingSalesAlertProps {
  sales: Sale[];
}

interface UrgencyLevel {
  label: string;
  count: number;
  icon: React.ElementType;
  className: string;
  bgClass: string;
}

export function PendingSalesAlert({ sales }: PendingSalesAlertProps) {
  const urgencyData = useMemo(() => {
    const now = new Date();
    
    // Filter pending sales (PRE_ANALISE, AGUARDANDO_AUDITORIA, PENDENCIA)
    const pendingSales = sales.filter(sale => 
      ['PRE_ANALISE', 'AGUARDANDO_AUDITORIA', 'PENDENCIA'].includes(sale.status)
    );

    if (pendingSales.length === 0) return null;

    // Categorize by urgency
    let critical = 0; // > 48 hours
    let high = 0;     // 24-48 hours
    let normal = 0;   // < 24 hours

    pendingSales.forEach(sale => {
      const hoursAgo = differenceInHours(now, new Date(sale.created_at));
      
      if (hoursAgo > 48) {
        critical++;
      } else if (hoursAgo > 24) {
        high++;
      } else {
        normal++;
      }
    });

    return {
      total: pendingSales.length,
      critical,
      high,
      normal,
      oldestSale: pendingSales.reduce((oldest, sale) => 
        new Date(sale.created_at) < new Date(oldest.created_at) ? sale : oldest
      ),
    };
  }, [sales]);

  if (!urgencyData) return null;

  const { total, critical, high, normal, oldestSale } = urgencyData;
  const daysAgo = differenceInDays(new Date(), new Date(oldestSale.created_at));

  // Determine overall urgency level for banner color
  const overallUrgency = critical > 0 ? 'critical' : high > 0 ? 'high' : 'normal';

  const urgencyStyles = {
    critical: {
      banner: 'bg-gradient-to-r from-red-500/15 to-red-600/10 border-red-500/30',
      text: 'text-red-700 dark:text-red-400',
      icon: 'text-red-500',
    },
    high: {
      banner: 'bg-gradient-to-r from-amber-500/15 to-orange-500/10 border-amber-500/30',
      text: 'text-amber-700 dark:text-amber-400',
      icon: 'text-amber-500',
    },
    normal: {
      banner: 'bg-gradient-to-r from-blue-500/10 to-blue-600/5 border-blue-500/20',
      text: 'text-blue-700 dark:text-blue-400',
      icon: 'text-blue-500',
    },
  };

  const styles = urgencyStyles[overallUrgency];

  return (
    <div className={cn(
      'rounded-lg border p-4 animate-fade-in',
      styles.banner
    )}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-full bg-background/50', styles.icon)}>
            {overallUrgency === 'critical' ? (
              <AlertTriangle className="h-5 w-5 animate-pulse" />
            ) : overallUrgency === 'high' ? (
              <AlertCircle className="h-5 w-5" />
            ) : (
              <Clock className="h-5 w-5" />
            )}
          </div>
          <div>
            <h3 className={cn('font-semibold', styles.text)}>
              {total} {total === 1 ? 'venda pendente' : 'vendas pendentes'} aguardando ação
            </h3>
            <p className="text-sm text-muted-foreground">
              {daysAgo > 0 
                ? `Venda mais antiga: ${daysAgo} ${daysAgo === 1 ? 'dia' : 'dias'} atrás`
                : 'Todas as vendas são de hoje'
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {critical > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30">
              <AlertTriangle className="h-3.5 w-3.5" />
              {critical} crítica{critical !== 1 ? 's' : ''} (&gt;48h)
            </span>
          )}
          {high > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
              <AlertCircle className="h-3.5 w-3.5" />
              {high} alta{high !== 1 ? 's' : ''} (24-48h)
            </span>
          )}
          {normal > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/30">
              <Clock className="h-3.5 w-3.5" />
              {normal} normal (&lt;24h)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
