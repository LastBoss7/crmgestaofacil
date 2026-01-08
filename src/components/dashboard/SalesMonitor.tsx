import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, TrendingUp, Clock, Users, Zap, AlertTriangle } from 'lucide-react';
import { SALE_STATUS_LABELS, SaleStatus } from '@/types/database';
import { motion, AnimatePresence } from 'framer-motion';

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
  today: number;
  todayValue: number;
  thisHour: number;
  pending: number;
  avgPerHour: number;
}

export const SalesMonitor = () => {
  const [recentSales, setRecentSales] = useState<RealtimeSale[]>([]);
  const [stats, setStats] = useState<SalesStats>({
    today: 0,
    todayValue: 0,
    thisHour: 0,
    pending: 0,
    avgPerHour: 0,
  });
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchStats = async () => {
    const now = new Date();
    // Get today's date in local timezone (YYYY-MM-DD format)
    const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    // Fetch today's sales using data_venda (which is a DATE field, not timestamp)
    const { data: todaySales, error: todayError } = await supabase
      .from('sales')
      .select('id, valor_mensal, status, created_at, data_venda')
      .eq('data_venda', todayDate);

    if (!todayError && todaySales) {
      const todayValue = todaySales.reduce((sum, s) => sum + Number(s.valor_mensal), 0);
      // Filter sales created in the last hour for "this hour" metric
      const thisHourSales = todaySales.filter(s => s.created_at && s.created_at >= oneHourAgo);
      const pendingSales = todaySales.filter(s => s.status === 'PENDENCIA' || s.status === 'AGUARDANDO_AUDITORIA');
      
      // Calculate average per hour based on current hour of the day
      const hoursElapsed = Math.max(1, now.getHours() + 1);
      const avgPerHour = todaySales.length / hoursElapsed;

      setStats({
        today: todaySales.length,
        todayValue,
        thisHour: thisHourSales.length,
        pending: pendingSales.length,
        avgPerHour: Math.round(avgPerHour * 10) / 10,
      });
    }

    // Fetch recent sales with seller info - only from today
    const { data: recentData } = await supabase
      .from('sales')
      .select('id, razao_social, nome_fantasia, valor_mensal, status, created_at, seller_id, data_venda')
      .eq('data_venda', todayDate)
      .order('created_at', { ascending: false })
      .limit(10);

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
  };

  useEffect(() => {
    fetchStats();

    // Subscribe to realtime changes
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

    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

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
    };
    return colors[status];
  };

  return (
    <div className="space-y-6">
      {/* Live Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-muted'}`} />
          <span className="text-sm text-muted-foreground">
            {isLive ? 'Monitoramento em tempo real' : 'Conectando...'}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vendas Hoje</p>
                <p className="text-3xl font-bold">{stats.today}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/20">
                <TrendingUp className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total Hoje</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.todayValue)}</p>
              </div>
              <div className="p-3 rounded-full bg-green-500/20">
                <Activity className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Última Hora</p>
                <p className="text-3xl font-bold">{stats.thisHour}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-500/20">
                <Clock className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-3xl font-bold">{stats.pending}</p>
              </div>
              <div className="p-3 rounded-full bg-orange-500/20">
                <AlertTriangle className="h-6 w-6 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Média/Hora</p>
                <p className="text-3xl font-bold">{stats.avgPerHour}</p>
              </div>
              <div className="p-3 rounded-full bg-cyan-500/20">
                <Zap className="h-6 w-6 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Feed de Vendas em Tempo Real
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <AnimatePresence>
              {recentSales.map((sale, index) => (
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
              ))}
            </AnimatePresence>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
