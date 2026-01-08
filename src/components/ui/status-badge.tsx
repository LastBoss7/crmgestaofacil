import { cn } from '@/lib/utils';
import { SaleStatus, SALE_STATUS_LABELS } from '@/types/database';
import { 
  FileSearch, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  Zap, 
  XCircle 
} from 'lucide-react';

interface StatusBadgeProps {
  status: SaleStatus;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const statusConfig: Record<SaleStatus, { 
  className: string; 
  icon: typeof FileSearch;
  gradient: string;
}> = {
  PRE_ANALISE: { 
    className: 'status-pre_analise',
    icon: FileSearch,
    gradient: 'from-blue-500/20 to-blue-600/10'
  },
  AGUARDANDO_AUDITORIA: { 
    className: 'status-aguardando_auditoria',
    icon: Clock,
    gradient: 'from-amber-500/20 to-amber-600/10'
  },
  PENDENCIA: { 
    className: 'status-pendencia',
    icon: AlertTriangle,
    gradient: 'from-orange-500/20 to-orange-600/10'
  },
  VENDA_AUDITADA: { 
    className: 'status-venda_auditada',
    icon: CheckCircle2,
    gradient: 'from-violet-500/20 to-violet-600/10'
  },
  INSTALACAO_MARCADA: { 
    className: 'status-instalacao_marcada',
    icon: Calendar,
    gradient: 'from-purple-500/20 to-purple-600/10'
  },
  INSTALADA: { 
    className: 'status-instalada',
    icon: Zap,
    gradient: 'from-purple-500/20 to-purple-600/10'
  },
  CANCELADA: { 
    className: 'status-cancelada',
    icon: XCircle,
    gradient: 'from-red-500/20 to-red-600/10'
  },
};

const sizeStyles = {
  sm: 'text-xs px-2.5 py-1 gap-1',
  md: 'text-xs px-3 py-1.5 gap-1.5',
  lg: 'text-sm px-4 py-2 gap-2',
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
};

export function StatusBadge({ status, className, size = 'md', showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border backdrop-blur-sm transition-all duration-200',
        `bg-gradient-to-r ${config.gradient}`,
        config.className,
        sizeStyles[size],
        className
      )}
    >
      {showIcon && <Icon className={cn(iconSizes[size], 'opacity-80')} />}
      {SALE_STATUS_LABELS[status]}
    </span>
  );
}
