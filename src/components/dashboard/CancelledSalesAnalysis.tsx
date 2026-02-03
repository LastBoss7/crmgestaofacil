import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sale, Profile } from '@/types/database';
import { XCircle, TrendingDown, Users2, AlertTriangle, FileSpreadsheet, MessageSquareWarning } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface CancelledSalesAnalysisProps {
  sales: Sale[];
  teams: Record<string, string>;
  sellers?: Record<string, Profile>;
  exportedBy?: { name: string; team?: string };
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export const CancelledSalesAnalysis = ({ sales, teams, sellers, exportedBy }: CancelledSalesAnalysisProps) => {
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

  const cancelledByReason = useMemo(() => {
    const reasonCounts: Record<string, { count: number; value: number }> = {};
    
    cancelledSales.forEach(sale => {
      // Use motivo_cancelamento if available, otherwise use a generic label
      const reason = (sale as any).motivo_cancelamento || 'Sem motivo informado';
      const normalizedReason = reason.length > 30 ? reason.substring(0, 30) + '...' : reason;
      
      if (!reasonCounts[normalizedReason]) {
        reasonCounts[normalizedReason] = { count: 0, value: 0 };
      }
      reasonCounts[normalizedReason].count += 1;
      reasonCounts[normalizedReason].value += Number(sale.valor_mensal) || 0;
    });

    return Object.entries(reasonCounts)
      .map(([name, data]) => ({
        name,
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

  const handleExportCancelledSales = () => {
    if (cancelledSales.length === 0) {
      toast.error('Nenhuma venda cancelada para exportar');
      return;
    }

    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['RELATÓRIO DE VENDAS CANCELADAS'],
      [''],
      ['Gerado em:', new Date().toLocaleString('pt-BR')],
      ['Gerado por:', exportedBy?.name || 'Usuário'],
      ['Equipe:', exportedBy?.team || 'Todas'],
      [''],
      ['RESUMO'],
      ['Total de Cancelamentos:', cancelledSales.length],
      ['Valor Total Perdido:', formatCurrency(totalLostValue)],
      ['Taxa de Cancelamento:', `${cancellationRate}%`],
      [''],
      ['CANCELAMENTOS POR EQUIPE'],
      ['Equipe', 'Quantidade', 'Valor Perdido'],
      ...cancelledByTeam.map(item => [item.fullName, item.value, formatCurrency(item.monetaryValue)]),
      [''],
      ['CANCELAMENTOS POR MOTIVO'],
      ['Motivo', 'Quantidade', 'Valor Perdido'],
      ...cancelledByReason.map(item => [item.fullName, item.value, formatCurrency(item.monetaryValue)]),
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

    // Detail sheet
    const detailData = cancelledSales.map(sale => ({
      'Razão Social': sale.razao_social,
      'Nome Fantasia': sale.nome_fantasia || '',
      'CNPJ': sale.cnpj_cliente,
      'Equipe': sale.equipe || '',
      'Vendedor': sellers?.[sale.seller_id || '']?.nome || '',
      'Valor Mensal': Number(sale.valor_mensal) || 0,
      'Data da Venda': sale.data_venda ? new Date(sale.data_venda).toLocaleDateString('pt-BR') : '',
      'Motivo do Cancelamento': (sale as any).motivo_cancelamento || 'Não informado',
      'Plano': sale.plano_contratado || '',
    }));

    const detailSheet = XLSX.utils.json_to_sheet(detailData);
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detalhes');

    // Download
    const fileName = `vendas-canceladas-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success('Relatório de cancelamentos exportado!');
  };

  if (cancelledSales.length === 0) {
    return null;
  }

  const hasReasons = cancelledByReason.some(r => r.name !== 'Sem motivo informado');

  return (
    <Card className="shadow-card border-destructive/20 bg-gradient-to-r from-destructive/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Análise de Cancelamentos
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExportCancelledSales}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar
          </Button>
        </div>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Pie Chart - Cancellations by Team */}
          {cancelledByTeam.length > 1 && (
            <div>
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

          {/* Bar Chart - Cancellations by Reason */}
          {hasReasons && cancelledByReason.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <MessageSquareWarning className="h-4 w-4" />
                Motivos de Cancelamento
              </p>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cancelledByReason} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      width={100}
                      tickFormatter={(value) => value.length > 15 ? value.substring(0, 15) + '...' : value}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string, props: any) => [
                        `${value} vendas (${formatCurrency(props.payload.monetaryValue)})`,
                        'Quantidade'
                      ]}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
