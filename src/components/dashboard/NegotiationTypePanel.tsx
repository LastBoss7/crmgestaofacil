import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Wifi, Smartphone, Monitor, Package, Layers, BarChart3 } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  { key: 'Banda Larga', label: 'Banda Larga', icon: Wifi, color: 'bg-blue-500' },
  { key: 'BL Solo', label: 'BL Solo', icon: Monitor, color: 'bg-cyan-500' },
  { key: 'Móvel', label: 'Móvel', icon: Smartphone, color: 'bg-purple-500' },
  { key: 'VIVO TOTAL', label: 'VIVO Total', icon: Package, color: 'bg-orange-500' },
  { key: 'Fixo + Banda Larga', label: 'Fixo + BL', icon: Layers, color: 'bg-emerald-500' },
];

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

  const getTypeConfig = (tipo: string) => {
    return NEGOTIATION_TYPES.find(t => t.key === tipo) || {
      key: tipo,
      label: tipo,
      icon: BarChart3,
      color: 'bg-gray-500',
    };
  };

  const isViewingToday = isToday(selectedDate);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Vendas por Tipo de Negociação
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
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-xs text-muted-foreground">Total de Vendas</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-500">{formatCurrency(totalValue)}</p>
                <p className="text-xs text-muted-foreground">Valor Total</p>
              </div>
            </div>

            {/* Type Breakdown */}
            <div className="space-y-4">
              {stats.map((stat) => {
                const config = getTypeConfig(stat.tipo);
                const Icon = config.icon;
                
                return (
                  <div key={stat.tipo} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded ${config.color}/20`}>
                          <Icon className={`h-4 w-4 ${config.color.replace('bg-', 'text-')}`} />
                        </div>
                        <span className="font-medium text-sm">{config.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="font-mono">
                          {stat.count}
                        </Badge>
                        <span className="text-sm text-muted-foreground w-20 text-right">
                          {formatCurrency(stat.value)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={stat.percentage} 
                        className="h-2 flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {stat.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
