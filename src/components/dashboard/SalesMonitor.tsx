import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Activity, TrendingUp, Clock, Users, Zap, AlertTriangle, CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { SALE_STATUS_LABELS, SaleStatus } from '@/types/database';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, subDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface RealtimeSale {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  valor_mensal: number;
  status: SaleStatus;
  created_at: string;
  seller_name?: string;
}

interface SalesStats {
  total: number;
  totalValue: number;
  thisHour: number;
  pending: number;
  avgPerHour: number;
}

export const SalesMonitor = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [recentSales, setRecentSales] = useState<RealtimeSale[]>([]);
  const [stats, setStats] = useState<SalesStats>({
    total: 0,
    totalValue: 0,
    thisHour: 0,
    pending: 0,
    avgPerHour: 0,
  });
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const formatDateForQuery = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const fetchStats = useCallback(async () => {
    const now = new Date();
    const queryDate = formatDateForQuery(selectedDate);
    const isViewingToday = isToday(selectedDate);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    // Fetch sales for selected date using data_venda
    const { data: salesData, error } = await supabase
      .from('sales')
      .select('id, valor_mensal, status, created_at, data_venda')
      .eq('data_venda', queryDate);

    if (!error && salesData) {
      const totalValue = salesData.reduce((sum, s) => sum + Number(s.valor_mensal), 0);
      // Only calculate "this hour" for today
      const thisHourSales = isViewingToday 
        ? salesData.filter(s => s.created_at && s.created_at >= oneHourAgo)
        : [];
      const pendingSales = salesData.filter(s => s.status === 'PENDENCIA' || s.status === 'AGUARDANDO_AUDITORIA');
      
      // Calculate average per hour
      const hoursElapsed = isViewingToday ? Math.max(1, now.getHours() + 1) : 10; // Assume 10h workday for past dates
      const avgPerHour = salesData.length / hoursElapsed;

      setStats({
        total: salesData.length,
        totalValue,
        thisHour: thisHourSales.length,
        pending: pendingSales.length,
        avgPerHour: Math.round(avgPerHour * 10) / 10,
      });
    }

    // Fetch sales with seller info for selected date
    const { data: recentData } = await supabase
      .from('sales')
      .select('id, razao_social, nome_fantasia, valor_mensal, status, created_at, seller_id, data_venda')
      .eq('data_venda', queryDate)
      .order('created_at', { ascending: false })
      .limit(20);

    if (recentData) {
      const sellerIds = [...new Set(recentData.map(s => s.seller_id).filter(Boolean))];
      let sellersMap: Record<string, string> = {};
      
      if (sellerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', sellerIds);
        
        if (profiles) {
          sellersMap = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p.nome }), {});
        }
      }

      setRecentSales(recentData.map(s => ({
        ...s,
        status: s.status as SaleStatus,
        seller_name: s.seller_id ? sellersMap[s.seller_id] : undefined,
      })));
    }

    setLastUpdate(new Date());
  }, [selectedDate]);

  useEffect(() => {
    fetchStats();

    // Subscribe to realtime changes only when viewing today
    const isViewingToday = isToday(selectedDate);
    
    if (isViewingToday) {
      const channel = supabase
        .channel('sales-monitor')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sales' },
          () => {
            fetchStats();
            setIsLive(true);
          }
        )
        .subscribe();

      // Refresh every 30 seconds when viewing today
      const interval = setInterval(fetchStats, 30000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(interval);
      };
    }
  }, [fetchStats, selectedDate]);

  const handlePreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    const tomorrow = addDays(selectedDate, 1);
    if (tomorrow <= new Date()) {
      setSelectedDate(tomorrow);
    }
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatTime = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getStatusColor = (status: SaleStatus) => {
    const colors: Record<SaleStatus, string> = {
      PRE_ANALISE: 'bg-blue-500/20 text-blue-400',
      AGUARDANDO_AUDITORIA: 'bg-yellow-500/20 text-yellow-400',
      PENDENCIA: 'bg-orange-500/20 text-orange-400',
      VENDA_AUDITADA: 'bg-green-500/20 text-green-400',
      INSTALACAO_MARCADA: 'bg-purple-500/20 text-purple-400',
      INSTALADA: 'bg-emerald-500/20 text-emerald-400',
      CANCELADA: 'bg-red-500/20 text-red-400',
      ACEITE_ENVIADO: 'bg-teal-500/20 text-teal-400',
      CHAMADO_EM_ABERTO: 'bg-indigo-500/20 text-indigo-400',
      DESCONECTADO: 'bg-gray-500/20 text-gray-400',
    };
    return colors[status];
  };

  const isViewingToday = isToday(selectedDate);

  return (
    <div className="space-y-6">
      {/* Header with Date Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-3 w-3 rounded-full",
            isViewingToday && isLive ? 'bg-green-500 animate-pulse' : 'bg-muted'
          )} />
          <span className="text-sm text-muted-foreground">
            {isViewingToday 
              ? (isLive ? 'Monitoramento em tempo real' : 'Conectando...') 
              : 'Visualizando histórico'
            }
          </span>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handlePreviousDay}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                  "min-w-[180px] justify-start text-left font-normal",
                  !isViewingToday && "border-primary text-primary"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {isViewingToday 
                  ? 'Hoje' 
                  : format(selectedDate, "dd 'de' MMM, yyyy", { locale: ptBR })
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setCalendarOpen(false);
                  }
                }}
                disabled={(date) => date > new Date()}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleNextDay}
            disabled={isViewingToday}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {!isViewingToday && (
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleToday}
              className="ml-2"
            >
              Voltar para Hoje
            </Button>
          )}
        </div>
      </div>

      {/* Date indicator for past dates */}
      {!isViewingToday && (
        <div className="bg-muted/50 border rounded-lg p-3 flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            Exibindo vendas de <strong>{format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</strong>
          </span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Card className="border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 flex-shrink-0">
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">
                  {isViewingToday ? 'Vendas Hoje' : 'Total'}
                </p>
                <p className="text-xl font-bold truncate">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 flex-shrink-0">
                <Activity className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">
                  {isViewingToday ? 'Valor Hoje' : 'Valor'}
                </p>
                <p className="text-lg font-bold truncate">{formatCurrency(stats.totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isViewingToday && (
          <Card className="border-violet-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/10 flex-shrink-0">
                  <Clock className="h-4 w-4 text-violet-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">Última Hora</p>
                  <p className="text-xl font-bold truncate">{stats.thisHour}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10 flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Pendentes</p>
                <p className="text-xl font-bold truncate">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 flex-shrink-0">
                <Zap className="h-4 w-4 text-cyan-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Média/Hora</p>
                <p className="text-xl font-bold truncate">{stats.avgPerHour}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {isViewingToday ? 'Feed de Vendas em Tempo Real' : `Vendas do Dia`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <AnimatePresence>
              {recentSales.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhuma venda encontrada</p>
                  <p className="text-sm">
                    {isViewingToday 
                      ? 'Aguardando novas vendas...' 
                      : `Não há vendas registradas em ${format(selectedDate, "dd/MM/yyyy")}`
                    }
                  </p>
                </div>
              ) : (
                recentSales.map((sale, index) => (
                  <motion.div
                    key={sale.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {sale.nome_fantasia || sale.razao_social}
                        </p>
                        <Badge className={getStatusColor(sale.status)} variant="secondary">
                          {SALE_STATUS_LABELS[sale.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Users className="h-3 w-3" />
                        <span>{sale.seller_name || 'Vendedor'}</span>
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(sale.created_at)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-400">
                        {formatCurrency(Number(sale.valor_mensal))}
                      </p>
                      <p className="text-xs text-muted-foreground">/mês</p>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Last update info */}
      <div className="text-right">
        <span className="text-xs text-muted-foreground">
          Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
        </span>
      </div>
    </div>
  );
};
