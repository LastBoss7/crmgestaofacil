import { cn } from '@/lib/utils';
import { SaleStatus, SALE_STATUS_LABELS } from '@/types/database';

interface StatusBadgeProps {
  status: SaleStatus;
  className?: string;
}

const statusStyles: Record<SaleStatus, string> = {
  NOVA: 'status-nova',
  EM_ANALISE: 'status-em_analise',
  PENDENCIA: 'status-pendencia',
  APROVADA: 'status-aprovada',
  INSTALADA: 'status-instalada',
  CANCELADA: 'status-cancelada',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        statusStyles[status],
        className
      )}
    >
      {SALE_STATUS_LABELS[status]}
    </span>
  );
}
