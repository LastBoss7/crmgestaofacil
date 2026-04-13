import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wifi, Smartphone, Monitor, Package, Layers, BarChart3, PieChart, RefreshCw } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface NegotiationStats {
  tipo: string;
  count: number;
  value: number;
  percentage: number;
}

interface NegotiationTypePanelProps {
  selectedDate: Date;
}

const NEGOTIATION_TYPES = [
  { key: 'Banda Larga', label: 'Banda Larga', icon: Wifi, color: '#3b82f6' },
  { key: 'BL Solo', label: 'BL Solo', icon: Monitor, color: '#06b6d4' },
  { key: 'Móvel', label: 'Móvel', icon: Smartphone, color: '#a855f7' },
  { key: 'VIVO TOTAL', label: 'VIVO Total', icon: Package, color: '#f97316' },
  { key: 'Fixo + Banda Larga', label: 'Fixo + BL', icon: Layers, color: '#10b981' },
  { key: 'Renovação', label: 'Renovação', icon: RefreshCw, color: '#ef4444' },
];

const FALLBACK_COLORS = ['#3b82f6', '#06b6d4', '#a855f7', '#f97316', '#10b981', '#ec4899', '#8b5cf6', '#14b8a6'];

export const NegotiationTypePanel = ({ selectedDate }: NegotiationTypePanelProps) => {
  const [stats, setStats] = useState<NegotiationStats[]>([]);
  const [total, setTotal] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [dataKey, setDataKey] = useState(0);

  const formatDateForQuery = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const fetchStats = useCallback(async () => {
    const queryDate = formatDateForQuery(selectedDate);
    setIsUpdating(true);

    const { data, error } = await supabase
      .from('sales')
      .select('tipo_negociacao, valor_mensal')
      .eq('data_venda', queryDate);

    if (!error && data) {
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

      // Sort by count descending
      statsArray.sort((a, b) => b.count - a.count);

      setStats(statsArray);
      setTotal(totalCount);
      setTotalValue(totalVal);
      setDataKey(prev => prev + 1);
    }
    
    setTimeout(() => setIsUpdating(false), 500);
  }, [selectedDate]);

  useEffect(() => {
    fetchStats();

    const isViewingToday = isToday(selectedDate);
    
    if (isViewingToday) {
      const channel = supabase
        .channel('negotiation-stats')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sales' },
          () => fetchStats()
        )
        .subscribe();

      const interval = setInterval(fetchStats, 30000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(interval);
      };
    }
  }, [fetchStats, selectedDate]);

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

  const isViewingToday = isToday(selectedDate);

  // Prepare chart data
  const chartData = stats.map((stat, index) => ({
    name: getTypeLabel(stat.tipo),
    value: stat.count,
    monetaryValue: stat.value,
    color: getTypeColor(stat.tipo, index),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-popover border rounded-lg shadow-lg p-3"
        >
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            Quantidade: <span className="font-semibold text-foreground">{data.value}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Valor: <span className="font-semibold text-green-500">{formatCurrency(data.monetaryValue)}</span>
          </p>
        </motion.div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {payload?.map((entry: any, index: number) => (
          <motion.div 
            key={index} 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-1.5 text-xs"
          >
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.value}</span>
          </motion.div>
        ))}
      </div>
    );
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  const numberVariants = {
    initial: { scale: 1 },
    pulse: { 
      scale: [1, 1.1, 1],
      transition: { duration: 0.3 }
    }
  };

  return (
    <Card className="relative overflow-hidden">
      {/* Update indicator */}
      <AnimatePresence>
        {isUpdating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-2 right-2 z-10"
          >
            <RefreshCw className="h-4 w-4 text-primary animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Vendas por Tipo
          {isViewingToday && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <Badge variant="secondary" className="ml-2 bg-green-500/10 text-green-500">
                <span className="relative flex h-2 w-2 mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Tempo Real
              </Badge>
            </motion.div>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {isViewingToday 
            ? 'Distribuição das vendas de hoje'
            : `Vendas de ${format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}`
          }
        </p>
      </CardHeader>
      <CardContent>
        {stats.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-8 text-muted-foreground"
          >
            <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">Nenhuma venda registrada</p>
          </motion.div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <motion.div 
                key={`total-${total}`}
                variants={numberVariants}
                initial="initial"
                animate="pulse"
                className="bg-muted/50 rounded-lg p-3 text-center"
              >
                <motion.p 
                  key={total}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xl font-bold"
                >
                  {total}
                </motion.p>
                <p className="text-xs text-muted-foreground">Total</p>
              </motion.div>
              <motion.div 
                key={`value-${totalValue}`}
                variants={numberVariants}
                initial="initial"
                animate="pulse"
                className="bg-muted/50 rounded-lg p-3 text-center"
              >
                <motion.p 
                  key={totalValue}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-lg font-bold text-green-500"
                >
                  {formatCurrency(totalValue)}
                </motion.p>
                <p className="text-xs text-muted-foreground">Valor</p>
              </motion.div>
            </div>

            {/* Charts with Tabs */}
            <Tabs defaultValue="pie" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="pie" className="text-xs">
                  <PieChart className="h-3 w-3 mr-1" />
                  Pizza
                </TabsTrigger>
                <TabsTrigger value="bar" className="text-xs">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Barras
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pie" className="mt-0">
                <motion.div 
                  key={`pie-${dataKey}`}
                  initial={{ opacity: 0, rotate: -10 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-[280px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="45%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={800}
                        animationEasing="ease-out"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend content={<CustomLegend />} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </motion.div>
              </TabsContent>

              <TabsContent value="bar" className="mt-0">
                <motion.div 
                  key={`bar-${dataKey}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-[280px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={80} 
                        className="text-xs"
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="value" 
                        radius={[0, 4, 4, 0]}
                        animationBegin={0}
                        animationDuration={800}
                        animationEasing="ease-out"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              </TabsContent>
            </Tabs>

            {/* Detailed List with Animations */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              key={`list-${dataKey}`}
              className="mt-4 pt-4 border-t space-y-2"
            >
              <AnimatePresence mode="popLayout">
                {stats.slice(0, 5).map((stat, index) => (
                  <motion.div 
                    key={stat.tipo}
                    variants={itemVariants}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.05 + 0.1, type: "spring" }}
                        className="w-2.5 h-2.5 rounded-full" 
                        style={{ backgroundColor: getTypeColor(stat.tipo, index) }}
                      />
                      <span className="text-muted-foreground truncate max-w-[100px]">
                        {getTypeLabel(stat.tipo)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.div
                        key={`count-${stat.tipo}-${stat.count}`}
                        initial={{ scale: 1.2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                      >
                        <Badge variant="secondary" className="font-mono text-xs h-5">
                          {stat.count}
                        </Badge>
                      </motion.div>
                      <motion.span 
                        key={`pct-${stat.tipo}-${stat.percentage}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-muted-foreground"
                      >
                        {stat.percentage.toFixed(0)}%
                      </motion.span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </CardContent>
    </Card>
  );
};