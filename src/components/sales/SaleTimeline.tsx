import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { SALE_STATUS_LABELS, SaleStatus, ROLE_LABELS, AppRole } from '@/types/database';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  ArrowRight,
  MessageSquare,
  RefreshCw,
  FileEdit,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface TimelineEvent {
  id: string;
  type: 'status_change' | 'comment' | 'field_change';
  timestamp: string;
  user_name: string;
  user_role?: string;
  // For status changes
  old_status?: string | null;
  new_status?: string | null;
  // For comments
  message?: string;
  // For field changes
  field?: string;
  old_value?: string | null;
  new_value?: string | null;
}

interface SaleTimelineProps {
  saleId: string;
}

const STATUS_ICONS: Partial<Record<SaleStatus, React.ReactNode>> = {
  PRE_ANALISE: <Clock className="h-4 w-4" />,
  AGUARDANDO_AUDITORIA: <RefreshCw className="h-4 w-4" />,
  PENDENCIA: <AlertTriangle className="h-4 w-4" />,
  VENDA_AUDITADA: <CheckCircle className="h-4 w-4" />,
  CANCELADA: <XCircle className="h-4 w-4" />,
};

const STATUS_COLORS: Partial<Record<SaleStatus, string>> = {
  PRE_ANALISE: 'bg-slate-500',
  AGUARDANDO_AUDITORIA: 'bg-blue-500',
  PENDENCIA: 'bg-amber-500',
  VENDA_AUDITADA: 'bg-emerald-500',
  INSTALACAO_MARCADA: 'bg-purple-500',
  INSTALADA: 'bg-green-600',
  CANCELADA: 'bg-red-500',
  ACEITE_ENVIADO: 'bg-cyan-500',
  CHAMADO_EM_ABERTO: 'bg-orange-500',
  DESCONECTADO: 'bg-gray-500',
};

export function SaleTimeline({ saleId }: SaleTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimelineData();
  }, [saleId]);

  const fetchTimelineData = async () => {
    try {
      // Fetch sale history
      const { data: historyData, error: historyError } = await supabase
        .from('sale_history')
        .select('*')
        .eq('sale_id', saleId)
        .order('changed_at', { ascending: false });

      if (historyError) throw historyError;

      // Fetch sale comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('sale_comments')
        .select('*')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: false });

      if (commentsError) throw commentsError;

      // Convert history to timeline events
      const historyEvents: TimelineEvent[] = (historyData || []).map((h) => ({
        id: h.id,
        type: h.field_changed === 'status' ? 'status_change' : 'field_change',
        timestamp: h.changed_at,
        user_name: h.changed_by_name,
        old_status: h.field_changed === 'status' ? h.old_value : undefined,
        new_status: h.field_changed === 'status' ? h.new_value : undefined,
        field: h.field_changed !== 'status' ? h.field_changed : undefined,
        old_value: h.field_changed !== 'status' ? h.old_value : undefined,
        new_value: h.field_changed !== 'status' ? h.new_value : undefined,
      }));

      // Convert comments to timeline events
      const commentEvents: TimelineEvent[] = (commentsData || []).map((c) => ({
        id: c.id,
        type: 'comment',
        timestamp: c.created_at,
        user_name: c.user_name,
        user_role: c.user_role,
        message: c.message,
      }));

      // Merge and sort all events
      const allEvents = [...historyEvents, ...commentEvents].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setEvents(allEvents);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return format(new Date(timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getStatusLabel = (status: string | null | undefined) => {
    if (!status) return 'Desconhecido';
    return SALE_STATUS_LABELS[status as SaleStatus] || status;
  };

  const getRoleLabel = (role: string | undefined) => {
    if (!role) return '';
    return ROLE_LABELS[role as AppRole] || role;
  };

  const isPendenciaRelated = (event: TimelineEvent) => {
    if (event.type === 'status_change') {
      return event.new_status === 'PENDENCIA' || 
             (event.old_status === 'PENDENCIA' && event.new_status === 'AGUARDANDO_AUDITORIA');
    }
    if (event.type === 'comment') {
      const msg = event.message?.toLowerCase() || '';
      return msg.includes('pendência') || msg.includes('correç') || msg.includes('corrigid');
    }
    return false;
  };

  const renderEventIcon = (event: TimelineEvent) => {
    if (event.type === 'comment') {
      return <MessageSquare className="h-4 w-4" />;
    }
    if (event.type === 'field_change') {
      return <FileEdit className="h-4 w-4" />;
    }
    if (event.type === 'status_change' && event.new_status) {
      return STATUS_ICONS[event.new_status as SaleStatus] || <ArrowRight className="h-4 w-4" />;
    }
    return <ArrowRight className="h-4 w-4" />;
  };

  const getEventColor = (event: TimelineEvent) => {
    if (event.type === 'status_change' && event.new_status) {
      return STATUS_COLORS[event.new_status as SaleStatus] || 'bg-muted';
    }
    if (event.type === 'comment') {
      return 'bg-blue-500';
    }
    return 'bg-muted';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Nenhum histórico encontrado</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-4">
          {events.map((event, index) => (
            <div
              key={event.id}
              className={cn(
                "relative flex gap-4 pl-2",
                isPendenciaRelated(event) && "animate-pulse-once"
              )}
            >
              {/* Timeline dot */}
              <div
                className={cn(
                  "relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-white shrink-0",
                  getEventColor(event)
                )}
              >
                {renderEventIcon(event)}
              </div>

              {/* Event content */}
              <div
                className={cn(
                  "flex-1 rounded-lg border p-3",
                  isPendenciaRelated(event) && event.new_status === 'PENDENCIA'
                    ? "border-amber-500/30 bg-amber-500/5"
                    : event.old_status === 'PENDENCIA' && event.new_status === 'AGUARDANDO_AUDITORIA'
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "bg-card"
                )}
              >
                {/* Status Change */}
                {event.type === 'status_change' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {getStatusLabel(event.old_status)}
                      </Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          event.new_status === 'PENDENCIA' && "border-amber-500 text-amber-600",
                          event.new_status === 'VENDA_AUDITADA' && "border-emerald-500 text-emerald-600",
                          event.new_status === 'AGUARDANDO_AUDITORIA' && "border-blue-500 text-blue-600"
                        )}
                      >
                        {getStatusLabel(event.new_status)}
                      </Badge>
                    </div>
                    {event.new_status === 'PENDENCIA' && (
                      <p className="text-sm text-amber-600 font-medium">
                        ⚠️ Venda devolvida para correção
                      </p>
                    )}
                    {event.old_status === 'PENDENCIA' && event.new_status === 'AGUARDANDO_AUDITORIA' && (
                      <p className="text-sm text-emerald-600 font-medium">
                        ✅ Venda corrigida e reenviada
                      </p>
                    )}
                  </div>
                )}

                {/* Comment */}
                {event.type === 'comment' && (
                  <div className="space-y-1">
                    <p className="text-sm">{event.message}</p>
                  </div>
                )}

                {/* Field Change */}
                {event.type === 'field_change' && (
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Campo alterado:</span>{' '}
                      <span className="font-medium">{event.field}</span>
                    </p>
                    <div className="text-xs text-muted-foreground">
                      <span className="line-through">{event.old_value || '(vazio)'}</span>
                      {' → '}
                      <span className="text-foreground">{event.new_value || '(vazio)'}</span>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span className="font-medium">{event.user_name}</span>
                  {event.user_role && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">
                      {getRoleLabel(event.user_role)}
                    </Badge>
                  )}
                  <span className="ml-auto">{formatTimestamp(event.timestamp)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
