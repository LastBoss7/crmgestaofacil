import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Target, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, getDaysInMonth, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface MonthlyGoalData {
  totalGoalSales: number;
  totalGoalValue: number;
  currentSales: number;
  currentValue: number;
  approvedSales: number;
  daysElapsed: number;
  daysRemaining: number;
  totalDays: number;
}

export const MonthlyGoalProgress = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MonthlyGoalData>({
    totalGoalSales: 0,
    totalGoalValue: 0,
    currentSales: 0,
    currentValue: 0,
    approvedSales: 0,
    daysElapsed: 0,
    daysRemaining: 0,
    totalDays: 0,
  });

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const totalDays = getDaysInMonth(now);
      const daysElapsed = differenceInDays(now, monthStart) + 1;
      const daysRemaining = totalDays - daysElapsed;

      // Fetch goals for current month
      const { data: goalsData } = await supabase
        .from('seller_goals')
        .select('target_sales, target_value')
        .eq('month', currentMonth)
        .eq('year', currentYear);

      // Fetch sales for current month
      const monthStartStr = format(monthStart, 'yyyy-MM-dd');
      const monthEndStr = format(monthEnd, 'yyyy-MM-dd');
      
      const { data: salesData } = await supabase
        .from('sales')
        .select('id, valor_mensal, status, data_venda')
        .gte('data_venda', monthStartStr)
        .lte('data_venda', monthEndStr);

      // Calculate totals
      const totalGoalSales = goalsData?.reduce((sum, g) => sum + (g.target_sales || 0), 0) || 0;
      const totalGoalValue = goalsData?.reduce((sum, g) => sum + Number(g.target_value || 0), 0) || 0;
      
      const currentSales = salesData?.length || 0;
      const currentValue = salesData?.reduce((sum, s) => sum + Number(s.valor_mensal), 0) || 0;
      const approvedSales = salesData?.filter(s => 
        s.status === 'VENDA_AUDITADA' || 
        s.status === 'INSTALACAO_MARCADA' || 
        s.status === 'INSTALADA'
      ).length || 0;

      setData({
        totalGoalSales,
        totalGoalValue,
        currentSales,
        currentValue,
        approvedSales,
        daysElapsed,
        daysRemaining,
        totalDays,
      });

      setLoading(false);
    };

    fetchData();
  }, [currentMonth, currentYear]);

  // Calculations
  const calculations = useMemo(() => {
    const { totalGoalSales, totalGoalValue, currentSales, currentValue, daysElapsed, daysRemaining, totalDays } = data;

    // Progress percentages
    const salesProgress = totalGoalSales > 0 ? (currentSales / totalGoalSales) * 100 : 0;
    const valueProgress = totalGoalValue > 0 ? (currentValue / totalGoalValue) * 100 : 0;
    const timeProgress = (daysElapsed / totalDays) * 100;

    // Daily averages
    const dailySalesAvg = daysElapsed > 0 ? currentSales / daysElapsed : 0;
    const dailyValueAvg = daysElapsed > 0 ? currentValue / daysElapsed : 0;

    // Projections for end of month
    const projectedSales = Math.round(dailySalesAvg * totalDays);
    const projectedValue = dailyValueAvg * totalDays;

    // Required daily pace to hit goal
    const salesNeeded = Math.max(0, totalGoalSales - currentSales);
    const valueNeeded = Math.max(0, totalGoalValue - currentValue);
    const requiredDailySales = daysRemaining > 0 ? salesNeeded / daysRemaining : salesNeeded;
    const requiredDailyValue = daysRemaining > 0 ? valueNeeded / daysRemaining : valueNeeded;

    // Status determination
    const salesOnTrack = projectedSales >= totalGoalSales;
    const valueOnTrack = projectedValue >= totalGoalValue;
    const salesAheadOfSchedule = salesProgress > timeProgress;
    const valueAheadOfSchedule = valueProgress > timeProgress;

    // Projection percentage of goal
    const salesProjectionPercent = totalGoalSales > 0 ? (projectedSales / totalGoalSales) * 100 : 0;
    const valueProjectionPercent = totalGoalValue > 0 ? (projectedValue / totalGoalValue) * 100 : 0;

    return {
      salesProgress: Math.min(100, salesProgress),
      valueProgress: Math.min(100, valueProgress),
      timeProgress,
      dailySalesAvg,
      dailyValueAvg,
      projectedSales,
      projectedValue,
      requiredDailySales,
      requiredDailyValue,
      salesOnTrack,
      valueOnTrack,
      salesAheadOfSchedule,
      valueAheadOfSchedule,
      salesProjectionPercent,
      valueProjectionPercent,
      salesNeeded,
      valueNeeded,
    };
  }, [data]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyShort = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}K`;
    return formatCurrency(value);
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  // If no goals are set
  if (data.totalGoalSales === 0 && data.totalGoalValue === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg">Nenhuma meta definida</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Defina metas mensais no Ranking de Vendedores para acompanhar o progresso.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Meta de {monthNames[currentMonth - 1]}</h3>
        </div>
        <Badge variant="outline" className="gap-1">
          <Calendar className="h-3 w-3" />
          {data.daysElapsed} de {data.totalDays} dias
        </Badge>
      </div>

      {/* Main Progress Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sales Goal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={cn(
            "overflow-hidden",
            calculations.salesOnTrack 
              ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent"
              : "border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent"
          )}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Meta de Vendas
                </CardTitle>
                {calculations.salesOnTrack ? (
                  <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    No ritmo
                  </Badge>
                ) : (
                  <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Atenção
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Progress */}
              <div>
                <div className="flex items-baseline justify-between mb-2 gap-2">
                  <span className="text-2xl font-bold">{data.currentSales}</span>
                  <span className="text-xs text-muted-foreground">de {data.totalGoalSales}</span>
                </div>
                <Progress 
                  value={calculations.salesProgress} 
                  className="h-2"
                />
                <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>{calculations.salesProgress.toFixed(0)}%</span>
                  <span>Faltam {calculations.salesNeeded}</span>
                </div>
              </div>

              {/* Projection */}
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Projeção para fim do mês</span>
                  <div className="flex items-center gap-1">
                    {calculations.salesOnTrack ? (
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-orange-500" />
                    )}
                    <span className={cn(
                      "font-bold",
                      calculations.salesOnTrack ? "text-emerald-500" : "text-orange-500"
                    )}>
                      {calculations.projectedSales} vendas
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Média diária atual</span>
                  <span className="font-medium">{calculations.dailySalesAvg.toFixed(1)} vendas/dia</span>
                </div>
                {!calculations.salesOnTrack && data.daysRemaining > 0 && (
                  <div className="flex items-center justify-between text-sm pt-2 border-t">
                    <span className="text-orange-600">Ritmo necessário</span>
                    <span className="font-bold text-orange-600">
                      {calculations.requiredDailySales.toFixed(1)} vendas/dia
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Value Goal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className={cn(
            "overflow-hidden",
            calculations.valueOnTrack 
              ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent"
              : "border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent"
          )}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Meta de Valor
                </CardTitle>
                {calculations.valueOnTrack ? (
                  <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    No ritmo
                  </Badge>
                ) : (
                  <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Atenção
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Progress */}
              <div>
                <div className="flex items-baseline justify-between mb-2 gap-2">
                  <span className="text-xl font-bold truncate">{formatCurrencyShort(data.currentValue)}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">de {formatCurrencyShort(data.totalGoalValue)}</span>
                </div>
                <Progress 
                  value={calculations.valueProgress} 
                  className="h-2"
                />
                <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>{calculations.valueProgress.toFixed(0)}%</span>
                  <span>Faltam {formatCurrencyShort(calculations.valueNeeded)}</span>
                </div>
              </div>

              {/* Projection */}
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Projeção para fim do mês</span>
                  <div className="flex items-center gap-1">
                    {calculations.valueOnTrack ? (
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-orange-500" />
                    )}
                    <span className={cn(
                      "font-bold",
                      calculations.valueOnTrack ? "text-emerald-500" : "text-orange-500"
                    )}>
                      {formatCurrencyShort(calculations.projectedValue)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Média diária atual</span>
                  <span className="font-medium">{formatCurrency(calculations.dailyValueAvg)}/dia</span>
                </div>
                {!calculations.valueOnTrack && data.daysRemaining > 0 && (
                  <div className="flex items-center justify-between text-sm pt-2 border-t">
                    <span className="text-orange-600">Ritmo necessário</span>
                    <span className="font-bold text-orange-600">
                      {formatCurrency(calculations.requiredDailyValue)}/dia
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Timeline Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Progresso do Mês</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {data.daysRemaining} dias restantes
              </span>
            </div>

            <div className="relative">
              {/* Timeline bar */}
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all"
                  style={{ width: `${calculations.timeProgress}%` }}
                />
              </div>

              {/* Markers */}
              <div className="relative mt-2">
                <div 
                  className="absolute top-0 flex flex-col items-center"
                  style={{ left: `${calculations.timeProgress}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="w-0.5 h-2 bg-primary" />
                  <span className="text-xs font-medium text-primary">Hoje</span>
                </div>
              </div>

              {/* Progress indicators below */}
              <div className="flex justify-between mt-6 text-xs">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    calculations.salesAheadOfSchedule ? "bg-emerald-500" : "bg-orange-500"
                  )} />
                  <span>
                    Vendas: {calculations.salesProgress.toFixed(0)}% 
                    {calculations.salesAheadOfSchedule ? ' (adiantado)' : ' (atrasado)'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    calculations.valueAheadOfSchedule ? "bg-emerald-500" : "bg-orange-500"
                  )} />
                  <span>
                    Valor: {calculations.valueProgress.toFixed(0)}%
                    {calculations.valueAheadOfSchedule ? ' (adiantado)' : ' (atrasado)'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Summary Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className={cn(
          "border-2",
          calculations.salesOnTrack && calculations.valueOnTrack
            ? "border-emerald-500/50 bg-gradient-to-r from-emerald-500/10 to-emerald-600/5"
            : "border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-amber-600/5"
        )}>
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                {calculations.salesOnTrack && calculations.valueOnTrack ? (
                  <>
                    <div className="p-2 rounded-full bg-emerald-500/20">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                        Equipe no caminho certo! 🎯
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Mantendo o ritmo atual, a meta será atingida até o fim do mês.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-2 rounded-full bg-amber-500/20">
                      <AlertTriangle className="h-6 w-6 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-amber-700 dark:text-amber-400">
                        Atenção: Meta em risco ⚠️
                      </p>
                      <p className="text-sm text-muted-foreground">
                        É necessário aumentar o ritmo para atingir a meta do mês.
                      </p>
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex gap-4">
                <div className="text-center px-4 py-2 rounded-lg bg-background/50">
                  <p className="text-xl font-bold">{data.approvedSales}</p>
                  <p className="text-xs text-muted-foreground">Aprovadas</p>
                </div>
                <div className="text-center px-4 py-2 rounded-lg bg-background/50">
                  <p className="text-xl font-bold">{formatCurrencyShort(data.currentValue)}</p>
                  <p className="text-xs text-muted-foreground">Total Mês</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
