import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar, 
  DollarSign, 
  ShoppingCart,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, subDays, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

interface PeriodStats {
  sales: number;
  value: number;
  pending: number;
  approved: number;
}

interface DayData {
  date: string;
  dayName: string;
  sales: number;
  value: number;
}

export const ComparativeMetrics = () => {
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<PeriodStats>({ sales: 0, value: 0, pending: 0, approved: 0 });
  const [yesterdayStats, setYesterdayStats] = useState<PeriodStats>({ sales: 0, value: 0, pending: 0, approved: 0 });
  const [thisWeekStats, setThisWeekStats] = useState<PeriodStats>({ sales: 0, value: 0, pending: 0, approved: 0 });
  const [lastWeekStats, setLastWeekStats] = useState<PeriodStats>({ sales: 0, value: 0, pending: 0, approved: 0 });
  const [thisWeekDays, setThisWeekDays] = useState<DayData[]>([]);
  const [lastWeekDays, setLastWeekDays] = useState<DayData[]>([]);

  const formatDateForQuery = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const now = new Date();
      
      // Calculate date ranges
      const today = formatDateForQuery(now);
      const yesterday = formatDateForQuery(subDays(now, 1));
      
      const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
      const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

      // Fetch today's sales
      const { data: todayData } = await supabase
        .from('sales')
        .select('id, valor_mensal, status')
        .eq('data_venda', today);

      // Fetch yesterday's sales
      const { data: yesterdayData } = await supabase
        .from('sales')
        .select('id, valor_mensal, status')
        .eq('data_venda', yesterday);

      // Fetch this week's sales
      const { data: thisWeekData } = await supabase
        .from('sales')
        .select('id, valor_mensal, status, data_venda')
        .gte('data_venda', formatDateForQuery(thisWeekStart))
        .lte('data_venda', formatDateForQuery(thisWeekEnd));

      // Fetch last week's sales
      const { data: lastWeekData } = await supabase
        .from('sales')
        .select('id, valor_mensal, status, data_venda')
        .gte('data_venda', formatDateForQuery(lastWeekStart))
        .lte('data_venda', formatDateForQuery(lastWeekEnd));

      // Process today stats - excluding cancelled sales
      if (todayData) {
        const activeTodaySales = todayData.filter(s => s.status !== 'CANCELADA');
        setTodayStats({
          sales: activeTodaySales.length,
          value: activeTodaySales.reduce((sum, s) => sum + Number(s.valor_mensal), 0),
          pending: activeTodaySales.filter(s => s.status === 'PENDENCIA' || s.status === 'AGUARDANDO_AUDITORIA').length,
          approved: activeTodaySales.filter(s => s.status === 'VENDA_AUDITADA' || s.status === 'INSTALACAO_MARCADA' || s.status === 'INSTALADA').length,
        });
      }

      // Process yesterday stats - excluding cancelled sales
      if (yesterdayData) {
        const activeYesterdaySales = yesterdayData.filter(s => s.status !== 'CANCELADA');
        setYesterdayStats({
          sales: activeYesterdaySales.length,
          value: activeYesterdaySales.reduce((sum, s) => sum + Number(s.valor_mensal), 0),
          pending: activeYesterdaySales.filter(s => s.status === 'PENDENCIA' || s.status === 'AGUARDANDO_AUDITORIA').length,
          approved: activeYesterdaySales.filter(s => s.status === 'VENDA_AUDITADA' || s.status === 'INSTALACAO_MARCADA' || s.status === 'INSTALADA').length,
        });
      }

      // Process this week stats - excluding cancelled sales
      if (thisWeekData) {
        const activeThisWeekSales = thisWeekData.filter(s => s.status !== 'CANCELADA');
        setThisWeekStats({
          sales: activeThisWeekSales.length,
          value: activeThisWeekSales.reduce((sum, s) => sum + Number(s.valor_mensal), 0),
          pending: activeThisWeekSales.filter(s => s.status === 'PENDENCIA' || s.status === 'AGUARDANDO_AUDITORIA').length,
          approved: activeThisWeekSales.filter(s => s.status === 'VENDA_AUDITADA' || s.status === 'INSTALACAO_MARCADA' || s.status === 'INSTALADA').length,
        });

        // Group by day for chart - excluding cancelled sales
        const dayMap: Record<string, DayData> = {};
        for (let i = 0; i < 7; i++) {
          const date = new Date(thisWeekStart);
          date.setDate(date.getDate() + i);
          const dateStr = formatDateForQuery(date);
          dayMap[dateStr] = {
            date: dateStr,
            dayName: format(date, 'EEE', { locale: ptBR }),
            sales: 0,
            value: 0,
          };
        }
        activeThisWeekSales.forEach(sale => {
          if (sale.data_venda && dayMap[sale.data_venda]) {
            dayMap[sale.data_venda].sales++;
            dayMap[sale.data_venda].value += Number(sale.valor_mensal);
          }
        });
        setThisWeekDays(Object.values(dayMap));
      }

      // Process last week stats - excluding cancelled sales
      if (lastWeekData) {
        const activeLastWeekSales = lastWeekData.filter(s => s.status !== 'CANCELADA');
        setLastWeekStats({
          sales: activeLastWeekSales.length,
          value: activeLastWeekSales.reduce((sum, s) => sum + Number(s.valor_mensal), 0),
          pending: activeLastWeekSales.filter(s => s.status === 'PENDENCIA' || s.status === 'AGUARDANDO_AUDITORIA').length,
          approved: activeLastWeekSales.filter(s => s.status === 'VENDA_AUDITADA' || s.status === 'INSTALACAO_MARCADA' || s.status === 'INSTALADA').length,
        });

        // Group by day for chart - excluding cancelled sales
        const dayMap: Record<string, DayData> = {};
        for (let i = 0; i < 7; i++) {
          const date = new Date(lastWeekStart);
          date.setDate(date.getDate() + i);
          const dateStr = formatDateForQuery(date);
          dayMap[dateStr] = {
            date: dateStr,
            dayName: format(date, 'EEE', { locale: ptBR }),
            sales: 0,
            value: 0,
          };
        }
        activeLastWeekSales.forEach(sale => {
          if (sale.data_venda && dayMap[sale.data_venda]) {
            dayMap[sale.data_venda].sales++;
            dayMap[sale.data_venda].value += Number(sale.valor_mensal);
          }
        });
        setLastWeekDays(Object.values(dayMap));
      }

      setLoading(false);
    };

    fetchData();

    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const dayVsDayChange = useMemo(() => ({
    sales: calculateChange(todayStats.sales, yesterdayStats.sales),
    value: calculateChange(todayStats.value, yesterdayStats.value),
    approved: calculateChange(todayStats.approved, yesterdayStats.approved),
  }), [todayStats, yesterdayStats]);

  const weekVsWeekChange = useMemo(() => ({
    sales: calculateChange(thisWeekStats.sales, lastWeekStats.sales),
    value: calculateChange(thisWeekStats.value, lastWeekStats.value),
    approved: calculateChange(thisWeekStats.approved, lastWeekStats.approved),
  }), [thisWeekStats, lastWeekStats]);

  // Combined chart data for week comparison
  const weekComparisonChart = useMemo(() => {
    const days = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
    return days.map((day, index) => ({
      day: day.charAt(0).toUpperCase() + day.slice(1),
      'Semana Atual': thisWeekDays[index]?.sales || 0,
      'Semana Anterior': lastWeekDays[index]?.sales || 0,
    }));
  }, [thisWeekDays, lastWeekDays]);

  const TrendIndicator = ({ change, size = 'default' }: { change: number; size?: 'default' | 'sm' }) => {
    const isPositive = change > 0;
    const isNeutral = change === 0;
    
    return (
      <div className={cn(
        "flex items-center gap-1 font-medium",
        isPositive && "text-emerald-500",
        !isPositive && !isNeutral && "text-red-500",
        isNeutral && "text-muted-foreground",
        size === 'sm' && "text-xs"
      )}>
        {isPositive ? (
          <ArrowUpRight className={cn("h-4 w-4", size === 'sm' && "h-3 w-3")} />
        ) : isNeutral ? (
          <Minus className={cn("h-4 w-4", size === 'sm' && "h-3 w-3")} />
        ) : (
          <ArrowDownRight className={cn("h-4 w-4", size === 'sm' && "h-3 w-3")} />
        )}
        <span>{Math.abs(change)}%</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Today vs Yesterday Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Hoje vs Ontem</h3>
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
            {format(new Date(), "dd/MM", { locale: ptBR })} vs {format(subDays(new Date(), 1), "dd/MM", { locale: ptBR })}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* Sales Count */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-blue-500/10 flex-shrink-0">
                    <ShoppingCart className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-muted-foreground uppercase">Vendas</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold">{todayStats.sales}</span>
                      <span className="text-[10px] text-muted-foreground">vs {yesterdayStats.sales}</span>
                    </div>
                  </div>
                  <TrendIndicator change={dayVsDayChange.sales} size="sm" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Value */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-emerald-500/10 flex-shrink-0">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-muted-foreground uppercase">Valor</p>
                    <p className="text-sm font-bold truncate">{formatCurrency(todayStats.value)}</p>
                    <span className="text-[9px] text-muted-foreground">vs {formatCurrency(yesterdayStats.value)}</span>
                  </div>
                  <TrendIndicator change={dayVsDayChange.value} size="sm" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Approved */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-violet-500/10 flex-shrink-0">
                    <Target className="h-3.5 w-3.5 text-violet-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-muted-foreground uppercase">Aprovadas</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold">{todayStats.approved}</span>
                      <span className="text-[10px] text-muted-foreground">vs {yesterdayStats.approved}</span>
                    </div>
                  </div>
                  <TrendIndicator change={dayVsDayChange.approved} size="sm" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Week vs Week Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Semana Atual vs Anterior</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Week Stats Cards */}
          <div className="lg:col-span-1 space-y-2">
            <Card>
              <CardContent className="p-3">
                <div className="space-y-2">
                  {/* Sales */}
                  <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-blue-500/10">
                        <ShoppingCart className="h-3 w-3 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Vendas</p>
                        <p className="text-xs font-semibold">{thisWeekStats.sales} <span className="text-[10px] text-muted-foreground font-normal">vs {lastWeekStats.sales}</span></p>
                      </div>
                    </div>
                    <TrendIndicator change={weekVsWeekChange.sales} size="sm" />
                  </div>

                  {/* Value */}
                  <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-emerald-500/10">
                        <DollarSign className="h-3 w-3 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Valor</p>
                        <p className="text-xs font-semibold">{formatCurrency(thisWeekStats.value)}</p>
                        <p className="text-[9px] text-muted-foreground">vs {formatCurrency(lastWeekStats.value)}</p>
                      </div>
                    </div>
                    <TrendIndicator change={weekVsWeekChange.value} size="sm" />
                  </div>

                  {/* Approved */}
                  <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-violet-500/10">
                        <Target className="h-3 w-3 text-violet-500" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Aprovadas</p>
                        <p className="text-xs font-semibold">{thisWeekStats.approved} <span className="text-[10px] text-muted-foreground font-normal">vs {lastWeekStats.approved}</span></p>
                      </div>
                    </div>
                    <TrendIndicator change={weekVsWeekChange.approved} size="sm" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Week Comparison Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs">Comparativo Diário</CardTitle>
              <CardDescription className="text-[10px]">Vendas por dia</CardDescription>
            </CardHeader>
            <CardContent className="pb-3 px-4">
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekComparisonChart} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="day" 
                      className="text-xs fill-muted-foreground"
                      tickLine={false}
                    />
                    <YAxis 
                      className="text-xs fill-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="Semana Atual" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="Semana Anterior" 
                      fill="hsl(var(--muted-foreground))" 
                      opacity={0.5}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                {weekVsWeekChange.sales >= 0 ? (
                  <div className="p-3 rounded-full bg-emerald-500/10">
                    <TrendingUp className="h-6 w-6 text-emerald-500" />
                  </div>
                ) : (
                  <div className="p-3 rounded-full bg-red-500/10">
                    <TrendingDown className="h-6 w-6 text-red-500" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-lg">
                    {weekVsWeekChange.sales >= 0 ? 'Semana em crescimento!' : 'Atenção: Queda nas vendas'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {weekVsWeekChange.sales >= 0 
                      ? `Aumento de ${weekVsWeekChange.sales}% nas vendas comparado à semana anterior`
                      : `Redução de ${Math.abs(weekVsWeekChange.sales)}% nas vendas comparado à semana anterior`
                    }
                  </p>
                </div>
              </div>
              <div className="flex gap-4 text-center">
                <div className="px-4 py-2 rounded-lg bg-background/50">
                  <p className="text-2xl font-bold">{thisWeekStats.sales}</p>
                  <p className="text-xs text-muted-foreground">Vendas esta semana</p>
                </div>
                <div className="px-4 py-2 rounded-lg bg-background/50">
                  <p className="text-2xl font-bold">{formatCurrency(thisWeekStats.value)}</p>
                  <p className="text-xs text-muted-foreground">Valor esta semana</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
