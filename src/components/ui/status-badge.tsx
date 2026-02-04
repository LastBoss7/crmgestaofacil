import { cn } from '@/lib/utils';
import { SaleStatus, SALE_STATUS_LABELS } from '@/types/database';
import { 
  FileSearch, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  Zap, 
  XCircle,
  Send,
  Headphones,
  Unplug,
  Truck,
  FileCheck
} from 'lucide-react';

interface StatusBadgeProps {
  status: SaleStatus;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const statusConfig: Record<SaleStatus, { 
  bg: string;
  text: string;
  border: string;
  icon: typeof FileSearch;
}> = {
  PRE_ANALISE: { 
    bg: 'bg-slate-100 dark:bg-slate-500/15',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-500/25',
    icon: FileSearch,
  },
  AGUARDANDO_AUDITORIA: { 
    bg: 'bg-blue-50 dark:bg-blue-500/15',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-100 dark:border-blue-500/25',
    icon: Clock,
  },
  PENDENCIA: { 
    bg: 'bg-amber-50 dark:bg-amber-500/15',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-100 dark:border-amber-500/25',
    icon: AlertTriangle,
  },
  VENDA_AUDITADA: { 
    bg: 'bg-emerald-50 dark:bg-emerald-500/15',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-100 dark:border-emerald-500/25',
    icon: CheckCircle2,
  },
  INSTALACAO_MARCADA: { 
    bg: 'bg-purple-50 dark:bg-purple-500/15',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-100 dark:border-purple-500/25',
    icon: Calendar,
  },
  INSTALADA: { 
    bg: 'bg-teal-50 dark:bg-teal-500/15',
    text: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-100 dark:border-teal-500/25',
    icon: Zap,
  },
  CANCELADA: { 
    bg: 'bg-red-50 dark:bg-red-500/15',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-100 dark:border-red-500/25',
    icon: XCircle,
  },
  ACEITE_ENVIADO: { 
    bg: 'bg-cyan-50 dark:bg-cyan-500/15',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-100 dark:border-cyan-500/25',
    icon: Send,
  },
  CHAMADO_EM_ABERTO: { 
    bg: 'bg-orange-50 dark:bg-orange-500/15',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-100 dark:border-orange-500/25',
    icon: Headphones,
  },
  DESCONECTADO: { 
    bg: 'bg-gray-100 dark:bg-gray-500/15',
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-500/25',
    icon: Unplug,
  },
  ENVIADO_PARA_SAV: { 
    bg: 'bg-pink-50 dark:bg-pink-500/15',
    text: 'text-pink-600 dark:text-pink-400',
    border: 'border-pink-100 dark:border-pink-500/25',
    icon: Truck,
  },
  IMPUTADA: { 
    bg: 'bg-sky-50 dark:bg-sky-500/15',
    text: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-100 dark:border-sky-500/25',
    icon: FileCheck,
  },
};

const sizeStyles = {
  sm: 'text-[11px] px-2 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-1 gap-1.5',
  lg: 'text-sm px-3 py-1.5 gap-2',
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
        'inline-flex items-center font-medium rounded-lg border transition-all duration-200',
        config.bg,
        config.text,
        config.border,
        sizeStyles[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} strokeWidth={1.75} />}
      {SALE_STATUS_LABELS[status]}
    </span>
  );
}
