import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Sale, SaleStatus, SALE_STATUS_LABELS, Profile } from '@/types/database';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, TrendingUp, Users, DollarSign, Target, FileSpreadsheet, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { cn } from '@/lib/utils';
import { exportToExcel, exportToPDF } from '@/lib/export-utils';
import { toast } from 'sonner';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const STATUS_COLORS: Record<SaleStatus, string> = {
  PRE_ANALISE: '#3B82F6',
  AGUARDANDO_AUDITORIA: '#F59E0B',
  PENDENCIA: '#F97316',
  VENDA_AUDITADA: '#22C55E',
  INSTALACAO_MARCADA: '#06B6D4',
  INSTALADA: '#14B8A6',
  CANCELADA: '#EF4444',
};

const Reports = () => {
  const { user, isSeller } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [sellers, setSellers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [selectedSeller, setSelectedSeller] = useState<string>('ALL');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch sales
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .order('created_at', { ascending: true });

      if (salesError) {
        console.error('Error fetching sales:', salesError);
      } else {
        setSales((salesData || []) as Sale[]);
      }

      // Fetch sellers (profiles)
      if (!isSeller) {
        const { data: sellersData } = await supabase
          .from('profiles')
          .select('*');
        setSellers((sellersData || []) as Profile[]);
      }

      setLoading(false);
    };

    fetchData();
  }, [user, dateRange, isSeller]);

  // Filter by seller
  const filteredSales = useMemo(() => {
    if (selectedSeller === 'ALL') return sales;
    return sales.filter(s => s.seller_id === selectedSeller);
  }, [sales, selectedSeller]);

  // Stats
  const stats = useMemo(() => {
    const total = filteredSales.length;
    const valorTotal = filteredSales.reduce((acc, s) => acc + Number(s.valor_mensal), 0);
    const aprovadas = filteredSales.filter(s => s.status === 'VENDA_AUDITADA' || s.status === 'INSTALACAO_MARCADA' || s.status === 'INSTALADA').length;
    const taxaConversao = total > 0 ? ((aprovadas / total) * 100).toFixed(1) : '0';
    const ticketMedio = total > 0 ? valorTotal / total : 0;

    return { total, valorTotal, aprovadas, taxaConversao, ticketMedio };
  }, [filteredSales]);

  // Daily sales data for area chart
  const dailyData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const daySales = filteredSales.filter(s => 
        format(parseISO(s.created_at), 'yyyy-MM-dd') === dayStr
      );
      
      return {
        date: format(day, 'dd/MM', { locale: ptBR }),
        vendas: daySales.length,
        valor: daySales.reduce((acc, s) => acc + Number(s.valor_mensal), 0),
      };
    });
  }, [filteredSales, dateRange]);

  // Sales by status for pie chart
  const statusData = useMemo(() => {
    const counts: Record<SaleStatus, number> = {
      PRE_ANALISE: 0, AGUARDANDO_AUDITORIA: 0, PENDENCIA: 0, VENDA_AUDITADA: 0, INSTALACAO_MARCADA: 0, INSTALADA: 0, CANCELADA: 0
    };
    
    filteredSales.forEach(s => {
      counts[s.status]++;
    });

    return Object.entries(counts)
      .filter(([_, value]) => value > 0)
      .map(([status, value]) => ({
        name: SALE_STATUS_LABELS[status as SaleStatus],
        value,
        color: STATUS_COLORS[status as SaleStatus],
      }));
  }, [filteredSales]);

  // Sales by seller for bar chart
  const sellerData = useMemo(() => {
    if (isSeller) return [];
    
    const sellerStats: Record<string, { nome: string; vendas: number; valor: number }> = {};
    
    filteredSales.forEach(sale => {
      if (!sale.seller_id) return;
      
      if (!sellerStats[sale.seller_id]) {
        const seller = sellers.find(s => s.id === sale.seller_id);
        sellerStats[sale.seller_id] = {
          nome: seller?.nome || 'Desconhecido',
          vendas: 0,
          valor: 0,
        };
      }
      
      sellerStats[sale.seller_id].vendas++;
      sellerStats[sale.seller_id].valor += Number(sale.valor_mensal);
    });

    return Object.values(sellerStats)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);
  }, [filteredSales, sellers, isSeller]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatCurrencyShort = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}K`;
    return formatCurrency(value);
  };

  // Create sellers map for export functions
  const sellersMap = useMemo(() => {
    const map: Record<string, Profile> = {};
    sellers.forEach(s => { map[s.id] = s; });
    return map;
  }, [sellers]);

  const handleExportExcel = () => {
    if (filteredSales.length === 0) {
      toast.error('Não há vendas para exportar no período selecionado');
      return;
    }
    
    const periodStr = `${format(dateRange.from, 'dd-MM-yyyy')}_${format(dateRange.to, 'dd-MM-yyyy')}`;
    exportToExcel(filteredSales, sellersMap, `relatorio-vendas_${periodStr}`);
    toast.success('Relatório Excel gerado com sucesso!');
  };

  const handleExportPDF = () => {
    if (filteredSales.length === 0) {
      toast.error('Não há vendas para exportar no período selecionado');
      return;
    }
    
    const periodLabel = `${format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} a ${format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`;
    const periodStr = `${format(dateRange.from, 'dd-MM-yyyy')}_${format(dateRange.to, 'dd-MM-yyyy')}`;
    exportToPDF(filteredSales, sellersMap, periodLabel, `relatorio-vendas_${periodStr}`);
    toast.success('Relatório PDF gerado com sucesso!');
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
            <p className="text-muted-foreground">
              Análise de desempenho de vendas
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} - {format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  locale={ptBR}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {/* Quick Date Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange({
                  from: subDays(new Date(), 7),
                  to: new Date(),
                })}
              >
                7 dias
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange({
                  from: subDays(new Date(), 30),
                  to: new Date(),
                })}
              >
                30 dias
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange({
                  from: startOfMonth(new Date()),
                  to: endOfMonth(new Date()),
                })}
              >
                Este mês
              </Button>
            </div>

            {/* Seller Filter */}
            {!isSeller && (
              <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os vendedores</SelectItem>
                  {sellers.map(seller => (
                    <SelectItem key={seller.id} value={seller.id}>
                      {seller.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  Exportar Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer">
                  <FileText className="h-4 w-4 text-red-600" />
                  Exportar PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total de Vendas"
                value={stats.total}
                icon={TrendingUp}
                description="No período selecionado"
              />
              <StatCard
                title="Valor Total"
                value={formatCurrencyShort(stats.valorTotal)}
                icon={DollarSign}
                description="Receita recorrente"
              />
              <StatCard
                title="Taxa de Conversão"
                value={`${stats.taxaConversao}%`}
                icon={Target}
                description="Aprovadas + Instaladas"
              />
              <StatCard
                title="Ticket Médio"
                value={formatCurrency(stats.ticketMedio)}
                icon={Users}
                description="Por venda"
              />
            </div>

            {/* Charts Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Area Chart - Daily Sales */}
              <Card className="shadow-card lg:col-span-2">
                <CardHeader>
                  <CardTitle>Vendas por Dia</CardTitle>
                  <CardDescription>Evolução de vendas e valores no período</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyData}>
                        <defs>
                          <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(300, 70%, 40%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(300, 70%, 40%)" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(315, 80%, 50%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(315, 80%, 50%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          className="text-xs fill-muted-foreground"
                          tickLine={false}
                        />
                        <YAxis 
                          yAxisId="left"
                          className="text-xs fill-muted-foreground"
                          tickLine={false}
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          className="text-xs fill-muted-foreground"
                          tickLine={false}
                          tickFormatter={(value) => formatCurrencyShort(value)}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number, name: string) => [
                            name === 'valor' ? formatCurrency(value) : value,
                            name === 'vendas' ? 'Vendas' : 'Valor'
                          ]}
                        />
                        <Legend />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="vendas"
                          name="Vendas"
                          stroke="hsl(300, 70%, 40%)"
                          fill="url(#colorVendas)"
                          strokeWidth={2}
                        />
                        <Area
                          yAxisId="right"
                          type="monotone"
                          dataKey="valor"
                          name="Valor"
                          stroke="hsl(315, 80%, 50%)"
                          fill="url(#colorValor)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Pie Chart - Status Distribution */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Distribuição por Status</CardTitle>
                  <CardDescription>Quantidade de vendas por status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    {statusData.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        Nenhuma venda no período
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number) => [value, 'Vendas']}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Bar Chart - Sales by Seller */}
              {!isSeller && (
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle>Ranking de Vendedores</CardTitle>
                    <CardDescription>Top 10 vendedores por valor</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      {sellerData.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          Nenhuma venda no período
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={sellerData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              type="number" 
                              className="text-xs fill-muted-foreground"
                              tickFormatter={(value) => formatCurrencyShort(value)}
                            />
                            <YAxis 
                              type="category" 
                              dataKey="nome" 
                              className="text-xs fill-muted-foreground"
                              width={100}
                              tickLine={false}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                              formatter={(value: number, name: string) => [
                                name === 'valor' ? formatCurrency(value) : value,
                                name === 'vendas' ? 'Vendas' : 'Valor Total'
                              ]}
                            />
                            <Bar 
                              dataKey="valor" 
                              name="Valor Total"
                              fill="hsl(300, 70%, 40%)" 
                              radius={[0, 4, 4, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Reports;
