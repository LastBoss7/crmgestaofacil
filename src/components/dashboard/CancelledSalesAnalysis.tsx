import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sale } from '@/types/database';
import { XCircle, TrendingDown, Users2, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface CancelledSalesAnalysisProps {
  sales: Sale[];
  teams: Record<string, string>;
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export const CancelledSalesAnalysis = ({ sales, teams }: CancelledSalesAnalysisProps) => {
  const cancelledSales = useMemo(() => {
    return sales.filter(sale => sale.status === 'CANCELADA');
  }, [sales]);

  const totalLostValue = useMemo(() => {
    return cancelledSales.reduce((acc, sale) => acc + (Number(sale.valor_mensal) || 0), 0);
  }, [cancelledSales]);

  const cancelledByTeam = useMemo(() => {
    const teamCounts: Record<string, { count: number; value: number }> = {};
    
    cancelledSales.forEach(sale => {
      const teamName = sale.equipe || 'Sem equipe';
      if (!teamCounts[teamName]) {
        teamCounts[teamName] = { count: 0, value: 0 };
      }
      teamCounts[teamName].count += 1;
      teamCounts[teamName].value += Number(sale.valor_mensal) || 0;
    });

    return Object.entries(teamCounts)
      .map(([name, data]) => ({
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        fullName: name,
        value: data.count,
        monetaryValue: data.value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [cancelledSales]);

  const cancellationRate = useMemo(() => {
    if (sales.length === 0) return 0;
    return ((cancelledSales.length / sales.length) * 100).toFixed(1);
  }, [sales, cancelledSales]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (cancelledSales.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-card border-destructive/20 bg-gradient-to-r from-destructive/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Análise de Cancelamentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Cancelled */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vendas Canceladas</p>
              <p className="text-xl font-bold text-destructive">{cancelledSales.length}</p>
            </div>
          </div>

          {/* Lost Value */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor Perdido</p>
              <p className="text-xl font-bold text-destructive">{formatCurrency(totalLostValue)}</p>
            </div>
          </div>

          {/* Cancellation Rate */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Taxa de Cancelamento</p>
              <p className="text-xl font-bold text-warning">{cancellationRate}%</p>
            </div>
          </div>

          {/* Teams Affected */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Users2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Equipes Afetadas</p>
              <p className="text-xl font-bold">{cancelledByTeam.length}</p>
            </div>
          </div>
        </div>

        {/* Pie Chart - Cancellations by Team */}
        {cancelledByTeam.length > 1 && (
          <div className="mt-6">
            <p className="text-sm font-medium text-muted-foreground mb-3">Cancelamentos por Equipe</p>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cancelledByTeam}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {cancelledByTeam.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CHART_COLORS[index % CHART_COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string, props: any) => [
                      `${value} vendas (${formatCurrency(props.payload.monetaryValue)})`,
                      props.payload.fullName
                    ]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend 
                    verticalAlign="middle" 
                    align="right"
                    layout="vertical"
                    wrapperStyle={{ paddingLeft: '20px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
