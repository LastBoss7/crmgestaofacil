import { useState, useEffect } from 'react';
import { useOperatorStatus } from '@/hooks/useOperatorStatus';
import { OperatorStatus, OPERATOR_STATUS_LABELS, OPERATOR_STATUS_COLORS } from '@/types/database';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Phone, Coffee, UtensilsCrossed, Circle, PhoneOff, ChevronDown, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_ICONS: Record<OperatorStatus, React.ReactNode> = {
  DISPONIVEL: <Circle className="h-3 w-3 fill-current" />,
  EM_LIGACAO: <Phone className="h-3 w-3" />,
  PAUSA: <Coffee className="h-3 w-3" />,
  ALMOCO: <UtensilsCrossed className="h-3 w-3" />,
  OFFLINE: <PhoneOff className="h-3 w-3" />,
  CADASTRO_VENDA: <ClipboardList className="h-3 w-3" />,
};

export function StatusSelector() {
  const { currentStatus, statusStartedAt, changeStatus, loading } = useOperatorStatus();
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - statusStartedAt.getTime()) / 1000);
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      setElapsedTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [statusStartedAt]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted animate-pulse">
        <div className="h-3 w-3 rounded-full bg-muted-foreground/20" />
        <div className="h-4 w-20 rounded bg-muted-foreground/20" />
      </div>
    );
  }

  const handleStatusChange = async (newStatus: OperatorStatus) => {
    if (newStatus !== currentStatus) {
      await changeStatus(newStatus);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "gap-2 min-w-[180px] justify-between",
            currentStatus === 'DISPONIVEL' && "border-green-500/50 bg-green-500/10 hover:bg-green-500/20",
            currentStatus === 'EM_LIGACAO' && "border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20",
            currentStatus === 'PAUSA' && "border-yellow-500/50 bg-yellow-500/10 hover:bg-yellow-500/20",
            currentStatus === 'ALMOCO' && "border-orange-500/50 bg-orange-500/10 hover:bg-orange-500/20",
            currentStatus === 'OFFLINE' && "border-gray-500/50 bg-gray-500/10 hover:bg-gray-500/20",
            currentStatus === 'CADASTRO_VENDA' && "border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20"
          )}
        >
          <div className="flex items-center gap-2">
            <span className={cn(
              "flex items-center justify-center w-5 h-5 rounded-full text-white",
              OPERATOR_STATUS_COLORS[currentStatus]
            )}>
              {STATUS_ICONS[currentStatus]}
            </span>
            <div className="flex flex-col items-start">
              <span className="text-xs font-medium">{OPERATOR_STATUS_LABELS[currentStatus]}</span>
              <span className="text-[10px] text-muted-foreground font-mono">{elapsedTime}</span>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        {(Object.keys(OPERATOR_STATUS_LABELS) as OperatorStatus[]).map((status) => (
          <DropdownMenuItem
            key={status}
            onClick={() => handleStatusChange(status)}
            className={cn(
              "gap-2 cursor-pointer",
              currentStatus === status && "bg-accent"
            )}
          >
            <span className={cn(
              "flex items-center justify-center w-5 h-5 rounded-full text-white",
              OPERATOR_STATUS_COLORS[status]
            )}>
              {STATUS_ICONS[status]}
            </span>
            <span>{OPERATOR_STATUS_LABELS[status]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
