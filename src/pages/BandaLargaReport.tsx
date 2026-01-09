import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Wifi, 
  Monitor, 
  Smartphone, 
  Package, 
  Layers, 
  TrendingUp, 
  DollarSign,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  User,
  Users
} from 'lucide-react';
import { format, isToday, subDays, addDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface NegotiationStats {
  tipo: string;
  count: number;
  value: number;
  percentage: number;
}

interface DailyData {
  date: string;
  bandaLarga: number;
  blSolo: number;
  movel: number;
  vivoTotal: number;
  fixoBL: number;
  total: number;
}

interface Seller {
  id: string;
  nome: string;
}

const NEGOTIATION_TYPES = [
  { key: 'Banda Larga', label: 'Banda Larga', icon: Wifi, color: '#3b82f6' },
  { key: 'BL Solo', label: 'BL Solo', icon: Monitor, color: '#06b6d4' },
  { key: 'Móvel', label: 'Móvel', icon: Smartphone, color: '#a855f7' },
  { key: 'VIVO TOTAL', label: 'VIVO Total', icon: Package, color: '#f97316' },
  { key: 'Fixo + Banda Larga', label: 'Fixo + BL', icon: Layers, color: '#10b981' },
];

const FALLBACK_COLORS = ['#3b82f6', '#06b6d4', '#a855f7', '#f97316', '#10b981', '#ec4899', '#8b5cf6', '#14b8a6'];

const BandaLargaReport = () => {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [stats, setStats] = useState<NegotiationStats[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [total, setTotal] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [previousMonthStats, setPreviousMonthStats] = useState<{ total: number; value: number }>({ total: 0, value: 0 });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch sellers list
  useEffect(() => {
    const fetchSellers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, nome')
        .eq('active', true)
        .order('nome');
      
      if (data) {
        setSellers(data);
      }
    };
    fetchSellers();
  }, []);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

    // Build query with optional seller filter
    let query = supabase
      .from('sales')
      .select('tipo_negociacao, valor_mensal, data_venda, seller_id')
      .gte('data_venda', monthStart)
      .lte('data_venda', monthEnd);
    
    if (selectedSeller !== 'all') {
      query = query.eq('seller_id', selectedSeller);
    }

    const { data, error } = await query;

    if (!error && data) {
      // Group by type
      const grouped = data.reduce((acc, sale) => {
        const tipo = sale.tipo_negociacao || 'Não informado';
        if (!acc[tipo]) {
          acc[tipo] = { count: 0, value: 0 };
        }
        acc[tipo].count += 1;
        acc[tipo].value += Number(sale.valor_mensal) || 0;
        return acc;
      }, {} as Record<string, { count: number; value: number }>);

      const totalCount = data.length;
      const totalVal = data.reduce((sum, s) => sum + (Number(s.valor_mensal) || 0), 0);

      const statsArray: NegotiationStats[] = Object.entries(grouped).map(([tipo, values]) => ({
        tipo,
        count: values.count,
        value: values.value,
        percentage: totalCount > 0 ? (values.count / totalCount) * 100 : 0,
      }));

      statsArray.sort((a, b) => b.count - a.count);

      setStats(statsArray);
      setTotal(totalCount);
      setTotalValue(totalVal);

      // Group by day for chart
      const dailyGrouped = data.reduce((acc, sale) => {
        const date = sale.data_venda || 'unknown';
        if (!acc[date]) {
          acc[date] = { bandaLarga: 0, blSolo: 0, movel: 0, vivoTotal: 0, fixoBL: 0, total: 0 };
        }
        const tipo = sale.tipo_negociacao || '';
        if (tipo === 'Banda Larga') acc[date].bandaLarga += 1;
        else if (tipo === 'BL Solo') acc[date].blSolo += 1;
        else if (tipo === 'Móvel') acc[date].movel += 1;
        else if (tipo === 'VIVO TOTAL') acc[date].vivoTotal += 1;
        else if (tipo === 'Fixo + Banda Larga') acc[date].fixoBL += 1;
        acc[date].total += 1;
        return acc;
      }, {} as Record<string, { bandaLarga: number; blSolo: number; movel: number; vivoTotal: number; fixoBL: number; total: number }>);

      const dailyArray = Object.entries(dailyGrouped)
        .map(([date, values]) => ({
          date: format(new Date(date), 'dd/MM'),
          ...values,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setDailyData(dailyArray);
    }

    // Fetch previous month for comparison (with same seller filter)
    const prevMonthStart = format(startOfMonth(subMonths(selectedMonth, 1)), 'yyyy-MM-dd');
    const prevMonthEnd = format(endOfMonth(subMonths(selectedMonth, 1)), 'yyyy-MM-dd');

    let prevQuery = supabase
      .from('sales')
      .select('valor_mensal')
      .gte('data_venda', prevMonthStart)
      .lte('data_venda', prevMonthEnd);
    
    if (selectedSeller !== 'all') {
      prevQuery = prevQuery.eq('seller_id', selectedSeller);
    }

    const { data: prevData } = await prevQuery;

    if (prevData) {
      setPreviousMonthStats({
        total: prevData.length,
        value: prevData.reduce((sum, s) => sum + (Number(s.valor_mensal) || 0), 0),
      });
    }

    setIsLoading(false);
  }, [selectedMonth, selectedSeller]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getTypeColor = (tipo: string, index: number) => {
    const config = NEGOTIATION_TYPES.find(t => t.key === tipo);
    return config?.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
  };

  const getTypeLabel = (tipo: string) => {
    const config = NEGOTIATION_TYPES.find(t => t.key === tipo);
    return config?.label || tipo;
  };

  const getTypeIcon = (tipo: string) => {
    const config = NEGOTIATION_TYPES.find(t => t.key === tipo);
    return config?.icon || Wifi;
  };

  // Calculate growth
  const countGrowth = previousMonthStats.total > 0 
    ? ((total - previousMonthStats.total) / previousMonthStats.total) * 100 
    : 0;
  const valueGrowth = previousMonthStats.value > 0 
    ? ((totalValue - previousMonthStats.value) / previousMonthStats.value) * 100 
    : 0;

  // Chart data
  const pieData = stats.map((stat, index) => ({
    name: getTypeLabel(stat.tipo),
    value: stat.count,
    color: getTypeColor(stat.tipo, index),
  }));

  const handlePreviousMonth = () => {
    setSelectedMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    const nextMonth = addDays(endOfMonth(selectedMonth), 1);
    if (nextMonth <= new Date()) {
      setSelectedMonth(nextMonth);
    }
  };

  const isCurrentMonth = format(selectedMonth, 'yyyy-MM') === format(new Date(), 'yyyy-MM');

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm">{payload[0]?.payload?.date || payload[0]?.name}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name || entry.dataKey}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wifi className="h-6 w-6 text-primary" />
              Relatório de Banda Larga
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Análise detalhada por tipo de negociação
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Seller Filter */}
            <Select value={selectedSeller} onValueChange={setSelectedSeller}>
              <SelectTrigger className="w-[180px]">
                <User className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Todos os vendedores
                  </div>
                </SelectItem>
                {sellers.map((seller) => (
                  <SelectItem key={seller.id} value={seller.id}>
                    {seller.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Month Selector */}
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handlePreviousMonth}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="min-w-[160px] justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedMonth}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedMonth(date);
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
              onClick={handleNextMonth}
              disabled={isCurrentMonth}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Vendas</p>
                    <p className="text-2xl font-bold">{total}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {countGrowth >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 text-green-500" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-red-500" />
                      )}
                      <span className={cn(
                        "text-xs",
                        countGrowth >= 0 ? "text-green-500" : "text-red-500"
                      )}>
                        {Math.abs(countGrowth).toFixed(1)}% vs mês anterior
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-emerald-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="text-2xl font-bold text-emerald-500">{formatCurrency(totalValue)}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {valueGrowth >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 text-green-500" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-red-500" />
                      )}
                      <span className={cn(
                        "text-xs",
                        valueGrowth >= 0 ? "text-green-500" : "text-red-500"
                      )}>
                        {Math.abs(valueGrowth).toFixed(1)}% vs mês anterior
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500/10">
                    <DollarSign className="h-5 w-5 text-emerald-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-violet-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Ticket Médio</p>
                    <p className="text-2xl font-bold">{formatCurrency(total > 0 ? totalValue / total : 0)}</p>
                    <p className="text-xs text-muted-foreground mt-1">por venda</p>
                  </div>
                  <div className="p-3 rounded-lg bg-violet-500/10">
                    <BarChart3 className="h-5 w-5 text-violet-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-orange-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tipos Diferentes</p>
                    <p className="text-2xl font-bold">{stats.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">categorias vendidas</p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-500/10">
                    <Layers className="h-5 w-5 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pie Chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribuição por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={800}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Area Chart - Daily Evolution */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Evolução Diária</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="bandaLarga" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Banda Larga" />
                      <Area type="monotone" dataKey="blSolo" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.6} name="BL Solo" />
                      <Area type="monotone" dataKey="movel" stackId="1" stroke="#a855f7" fill="#a855f7" fillOpacity={0.6} name="Móvel" />
                      <Area type="monotone" dataKey="vivoTotal" stackId="1" stroke="#f97316" fill="#f97316" fillOpacity={0.6} name="VIVO Total" />
                      <Area type="monotone" dataKey="fixoBL" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Fixo + BL" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Detailed Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalhamento por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo de Negociação</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Ticket Médio</TableHead>
                    <TableHead className="text-right">% do Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.map((stat, index) => {
                    const Icon = getTypeIcon(stat.tipo);
                    return (
                      <TableRow key={stat.tipo}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className="p-1.5 rounded"
                              style={{ backgroundColor: `${getTypeColor(stat.tipo, index)}20` }}
                            >
                              <Icon 
                                className="h-4 w-4" 
                                style={{ color: getTypeColor(stat.tipo, index) }}
                              />
                            </div>
                            <span className="font-medium">{getTypeLabel(stat.tipo)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="font-mono">
                            {stat.count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-500">
                          {formatCurrency(stat.value)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(stat.count > 0 ? stat.value / stat.count : 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-muted rounded-full h-2 overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all"
                                style={{ 
                                  width: `${stat.percentage}%`,
                                  backgroundColor: getTypeColor(stat.tipo, index)
                                }}
                              />
                            </div>
                            <span className="text-sm w-12 text-right">{stat.percentage.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
};

export default BandaLargaReport;
