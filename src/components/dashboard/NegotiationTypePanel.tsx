import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wifi, Smartphone, Monitor, Package, Layers, BarChart3, PieChart } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

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
];

const FALLBACK_COLORS = ['#3b82f6', '#06b6d4', '#a855f7', '#f97316', '#10b981', '#ec4899', '#8b5cf6', '#14b8a6'];

export const NegotiationTypePanel = ({ selectedDate }: NegotiationTypePanelProps) => {
  const [stats, setStats] = useState<NegotiationStats[]>([]);
  const [total, setTotal] = useState(0);
  const [totalValue, setTotalValue] = useState(0);

  const formatDateForQuery = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const fetchStats = useCallback(async () => {
    const queryDate = formatDateForQuery(selectedDate);

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
    }
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
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            Quantidade: <span className="font-semibold text-foreground">{data.value}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Valor: <span className="font-semibold text-green-500">{formatCurrency(data.monetaryValue)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {payload?.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-1.5 text-xs">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Vendas por Tipo
          {isViewingToday && (
            <Badge variant="secondary" className="ml-2 bg-green-500/10 text-green-500">
              Tempo Real
            </Badge>
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
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">Nenhuma venda registrada</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold">{total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-green-500">{formatCurrency(totalValue)}</p>
                <p className="text-xs text-muted-foreground">Valor</p>
              </div>
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
                <div className="h-[280px]">
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
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend content={<CustomLegend />} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              <TabsContent value="bar" className="mt-0">
                <div className="h-[280px]">
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
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            </Tabs>

            {/* Detailed List */}
            <div className="mt-4 pt-4 border-t space-y-2">
              {stats.slice(0, 5).map((stat, index) => (
                <div key={stat.tipo} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: getTypeColor(stat.tipo, index) }}
                    />
                    <span className="text-muted-foreground truncate max-w-[100px]">
                      {getTypeLabel(stat.tipo)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs h-5">
                      {stat.count}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {stat.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};