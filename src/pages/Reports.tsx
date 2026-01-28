import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Sale, SaleStatus, SALE_STATUS_LABELS, Profile } from '@/types/database';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, TrendingUp, Users, DollarSign, Target, FileSpreadsheet, FileText, Download, XCircle, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  ACEITE_ENVIADO: '#14B8A6',
  CHAMADO_EM_ABERTO: '#6366F1',
  DESCONECTADO: '#6B7280',
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
  const [selectedCancelReason, setSelectedCancelReason] = useState<string>('ALL');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch sales using secure view for masked sensitive data
      const { data: salesData, error: salesError } = await supabase
        .from('sales_secure')
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

  // Separate active and cancelled sales
  const { activeSales, cancelledSales } = useMemo(() => {
    const active = filteredSales.filter(s => s.status !== 'CANCELADA');
    let cancelled = filteredSales.filter(s => s.status === 'CANCELADA');
    
    // Apply cancel reason filter
    if (selectedCancelReason !== 'ALL') {
      if (selectedCancelReason === 'SEM_MOTIVO') {
        cancelled = cancelled.filter(s => !s.motivo_pendencia || s.motivo_pendencia.trim() === '');
      } else {
        cancelled = cancelled.filter(s => s.motivo_pendencia === selectedCancelReason);
      }
    }
    
    return { activeSales: active, cancelledSales: cancelled };
  }, [filteredSales, selectedCancelReason]);

  // Get unique cancel reasons for filter dropdown
  const cancelReasons = useMemo(() => {
    const allCancelled = filteredSales.filter(s => s.status === 'CANCELADA');
    const reasons = new Set<string>();
    
    allCancelled.forEach(sale => {
      if (sale.motivo_pendencia && sale.motivo_pendencia.trim()) {
        reasons.add(sale.motivo_pendencia);
      }
    });
    
    return Array.from(reasons).sort();
  }, [filteredSales]);

  // Stats - EXCLUDING cancelled sales
  const stats = useMemo(() => {
    const total = activeSales.length;
    const valorTotal = activeSales.reduce((acc, s) => acc + Number(s.valor_mensal), 0);
    const aprovadas = activeSales.filter(s => s.status === 'VENDA_AUDITADA' || s.status === 'INSTALACAO_MARCADA' || s.status === 'INSTALADA').length;
    const taxaConversao = total > 0 ? ((aprovadas / total) * 100).toFixed(1) : '0';
    const ticketMedio = total > 0 ? valorTotal / total : 0;
    const totalCanceladas = cancelledSales.length;
    const valorCancelado = cancelledSales.reduce((acc, s) => acc + Number(s.valor_mensal), 0);

    return { total, valorTotal, aprovadas, taxaConversao, ticketMedio, totalCanceladas, valorCancelado };
  }, [activeSales, cancelledSales]);

  // Daily sales data for area chart - EXCLUDING cancelled
  const dailyData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const daySales = activeSales.filter(s => 
        format(parseISO(s.created_at), 'yyyy-MM-dd') === dayStr
      );
      
      return {
        date: format(day, 'dd/MM', { locale: ptBR }),
        vendas: daySales.length,
        valor: daySales.reduce((acc, s) => acc + Number(s.valor_mensal), 0),
      };
    });
  }, [activeSales, dateRange]);

  // Sales by status for pie chart - showing all including cancelled for reference
  const statusData = useMemo(() => {
    const counts: Record<SaleStatus, number> = {
      PRE_ANALISE: 0, AGUARDANDO_AUDITORIA: 0, PENDENCIA: 0, VENDA_AUDITADA: 0, INSTALACAO_MARCADA: 0, INSTALADA: 0, CANCELADA: 0, ACEITE_ENVIADO: 0, CHAMADO_EM_ABERTO: 0, DESCONECTADO: 0
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

  // Sales by seller for bar chart - EXCLUDING cancelled
  const sellerData = useMemo(() => {
    if (isSeller) return [];
    
    const sellerStats: Record<string, { nome: string; vendas: number; valor: number }> = {};
    
    activeSales.forEach(sale => {
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
  }, [activeSales, sellers, isSeller]);

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
          <Tabs defaultValue="vendas" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="vendas" className="gap-1.5">
                <TrendingUp className="h-4 w-4" />
                Vendas Ativas ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="canceladas" className="gap-1.5">
                <XCircle className="h-4 w-4" />
                Canceladas ({stats.totalCanceladas})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="vendas" className="space-y-4">
              {/* Stats Cards */}
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Total Vendas"
                  value={stats.total}
                  icon={TrendingUp}
                  description="Excluindo canceladas"
                />
                <StatCard
                  title="Valor Total"
                  value={formatCurrencyShort(stats.valorTotal)}
                  icon={DollarSign}
                  description="Receita recorrente"
                />
                <StatCard
                  title="Conversão"
                  value={`${stats.taxaConversao}%`}
                  icon={Target}
                  description="Aprovadas"
                />
                <StatCard
                  title="Ticket Médio"
                  value={formatCurrency(stats.ticketMedio)}
                  icon={Users}
                  description="Por venda"
                />
              </div>

            {/* Charts Grid */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Area Chart - Daily Sales */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Vendas por Dia</CardTitle>
                  <CardDescription className="text-xs">Evolução de vendas e valores</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
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
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Distribuição por Status</CardTitle>
                  <CardDescription className="text-xs">Quantidade por status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-56">
                    {statusData.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                        Nenhuma venda
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
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
                              fontSize: '12px',
                            }}
                            formatter={(value: number) => [value, 'Vendas']}
                          />
                          <Legend 
                            wrapperStyle={{ fontSize: '10px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Bar Chart - Sales by Seller */}
              {!isSeller && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Ranking Vendedores</CardTitle>
                    <CardDescription className="text-xs">Top 10 por valor</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-56">
                      {sellerData.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                          Nenhuma venda
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={sellerData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              type="number" 
                              className="text-[10px] fill-muted-foreground"
                              tickFormatter={(value) => formatCurrencyShort(value)}
                            />
                            <YAxis 
                              type="category" 
                              dataKey="nome" 
                              className="text-[10px] fill-muted-foreground"
                              width={80}
                              tickLine={false}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                fontSize: '12px',
                              }}
                              formatter={(value: number, name: string) => [
                                name === 'valor' ? formatCurrency(value) : value,
                                name === 'vendas' ? 'Vendas' : 'Valor Total'
                              ]}
                            />
                            <Bar 
                              dataKey="valor" 
                              name="Valor Total"
                              fill="hsl(var(--primary))" 
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
            </TabsContent>

            {/* Tab de Vendas Canceladas */}
            <TabsContent value="canceladas" className="space-y-4">
              {/* Stats Cards for Cancelled */}
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
                <StatCard
                  title="Total Canceladas"
                  value={stats.totalCanceladas}
                  icon={XCircle}
                  variant="danger"
                  description="Período selecionado"
                />
                <StatCard
                  title="Valor Perdido"
                  value={formatCurrencyShort(stats.valorCancelado)}
                  icon={AlertTriangle}
                  variant="warning"
                  description="Receita não realizada"
                />
                <StatCard
                  title="Taxa Cancelamento"
                  value={`${filteredSales.length > 0 ? ((stats.totalCanceladas / filteredSales.length) * 100).toFixed(1) : 0}%`}
                  icon={Target}
                  description="Do total de vendas"
                />
              </div>

              {/* Filter by Cancel Reason */}
              <div className="flex flex-wrap items-center gap-3">
                <Select value={selectedCancelReason} onValueChange={setSelectedCancelReason}>
                  <SelectTrigger className="w-64 bg-card">
                    <SelectValue placeholder="Filtrar por motivo" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border border-border z-50">
                    <SelectItem value="ALL">Todos os motivos</SelectItem>
                    <SelectItem value="SEM_MOTIVO">Sem motivo informado</SelectItem>
                    {cancelReasons.map(reason => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCancelReason !== 'ALL' && (
                  <Badge 
                    variant="secondary" 
                    className="cursor-pointer gap-1"
                    onClick={() => setSelectedCancelReason('ALL')}
                  >
                    {selectedCancelReason === 'SEM_MOTIVO' ? 'Sem motivo' : selectedCancelReason}
                    <XCircle className="h-3 w-3" />
                  </Badge>
                )}
              </div>

              {/* Cancelled Sales Table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    Vendas Canceladas
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Lista de vendas canceladas no período ({cancelledSales.length} vendas)
                    {selectedCancelReason !== 'ALL' && ' - Filtrado'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {cancelledSales.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <XCircle className="h-12 w-12 mb-4 opacity-30" />
                      <p className="text-sm font-medium">Nenhuma venda cancelada</p>
                      <p className="text-xs mt-1">
                        {selectedCancelReason !== 'ALL' 
                          ? 'Tente remover o filtro de motivo' 
                          : 'Não há vendas canceladas no período selecionado'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Empresa</TableHead>
                            <TableHead className="text-xs">Vendedor</TableHead>
                            <TableHead className="text-xs">Data Venda</TableHead>
                            <TableHead className="text-xs">Motivo</TableHead>
                            <TableHead className="text-xs text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cancelledSales.map((sale) => {
                            const seller = sellers.find(s => s.id === sale.seller_id);
                            return (
                              <TableRow key={sale.id}>
                                <TableCell className="text-xs font-medium">
                                  {sale.nome_fantasia || sale.razao_social}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {seller?.nome || 'N/A'}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {sale.data_venda ? format(parseISO(sale.data_venda), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                                </TableCell>
                                <TableCell className="text-xs max-w-[200px] truncate" title={sale.motivo_pendencia || ''}>
                                  {sale.motivo_pendencia || (
                                    <span className="text-muted-foreground italic">Não informado</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs text-right font-medium text-destructive">
                                  {formatCurrency(Number(sale.valor_mensal))}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
};

export default Reports;
