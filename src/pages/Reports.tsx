import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Sale, SaleStatus, SALE_STATUS_LABELS, Profile } from '@/types/database';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, TrendingUp, Users, DollarSign, Target, FileSpreadsheet, FileText, Download, XCircle, AlertTriangle, Info } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import { exportToExcel, exportToPDF, exportCancelledSalesToExcel, exportCancelledSalesToPDF, CancelledSaleExportData } from '@/lib/export-utils';
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
  ENVIADO_PARA_SAV: '#EC4899',
  IMPUTADA: '#0EA5E9',
};

interface Team {
  id: string;
  name: string;
}

const Reports = () => {
  const { user, isSeller } = useAuth();
  const [searchParams] = useSearchParams();
  const linkedTeam = searchParams.get('team');
  const linkedPeriod = searchParams.get('period');
  const [sales, setSales] = useState<Sale[]>([]);
  const [allCancelledSales, setAllCancelledSales] = useState<Sale[]>([]);
  const [sellers, setSellers] = useState<Profile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => linkedPeriod === 'month'
    ? { from: startOfMonth(new Date()), to: endOfMonth(new Date()) }
    : { from: subDays(new Date(), 90), to: new Date() });
  const [selectedSeller, setSelectedSeller] = useState<string>('ALL');
  const [selectedTeam, setSelectedTeam] = useState<string>(linkedTeam || 'ALL');
  const [selectedCancelReason, setSelectedCancelReason] = useState<string>('ALL');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch sales within date range (for active sales metrics)
      // Use data_venda (data real da venda) and fall back to created_at when it's null
      const fromDateStr = format(dateRange.from, 'yyyy-MM-dd');
      const toDateStr = format(dateRange.to, 'yyyy-MM-dd');
      const { data: salesData, error: salesError } = await supabase
        .from('sales_secure')
        .select('*')
        .neq('status', 'CANCELADA')
        .or(
          `and(data_venda.gte.${fromDateStr},data_venda.lte.${toDateStr}),` +
          `and(data_venda.is.null,created_at.gte.${dateRange.from.toISOString()},created_at.lte.${dateRange.to.toISOString()})`
        )
        .order('created_at', { ascending: true });


      if (salesError) {
        console.error('Error fetching sales:', salesError);
      } else {
        setSales((salesData || []) as Sale[]);
      }

      // Fetch ALL cancelled sales (regardless of date) for cancelled tab
      const { data: cancelledData, error: cancelledError } = await supabase
        .from('sales_secure')
        .select('*')
        .eq('status', 'CANCELADA')
        .order('created_at', { ascending: false });

      if (cancelledError) {
        console.error('Error fetching cancelled sales:', cancelledError);
      } else {
        setAllCancelledSales((cancelledData || []) as Sale[]);
      }

      // Fetch sellers (profiles)
      if (!isSeller) {
        const { data: sellersData } = await supabase
          .from('profiles')
          .select('*');
        setSellers((sellersData || []) as Profile[]);

        // Fetch teams
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name')
          .order('name');
        setTeams((teamsData || []) as Team[]);
      }

      setLoading(false);
    };

    fetchData();
  }, [user, dateRange, isSeller]);

  // Filter active sales by seller and team (date range already applied in fetch)
  const activeSales = useMemo(() => {
    let filtered = sales;
    if (selectedSeller !== 'ALL') {
      filtered = filtered.filter(s => s.seller_id === selectedSeller);
    }
    if (selectedTeam !== 'ALL') {
      const teamName = teams.find(t => t.id === selectedTeam)?.name;
      filtered = filtered.filter(s => s.equipe === teamName || s.equipe === selectedTeam);
    }
    return filtered;
  }, [sales, selectedSeller, selectedTeam, teams]);

  // Filter cancelled sales by seller, team and reason
  const cancelledSales = useMemo(() => {
    let cancelled = allCancelledSales;
    
    // Filter by seller
    if (selectedSeller !== 'ALL') {
      cancelled = cancelled.filter(s => s.seller_id === selectedSeller);
    }

    // Filter by team
    if (selectedTeam !== 'ALL') {
      const teamName = teams.find(t => t.id === selectedTeam)?.name;
      cancelled = cancelled.filter(s => s.equipe === teamName || s.equipe === selectedTeam);
    }
    
    // Apply cancel reason filter
    if (selectedCancelReason !== 'ALL') {
      if (selectedCancelReason === 'SEM_MOTIVO') {
        cancelled = cancelled.filter(s => !s.motivo_pendencia || s.motivo_pendencia.trim() === '');
      } else {
        cancelled = cancelled.filter(s => s.motivo_pendencia === selectedCancelReason);
      }
    }
    
    return cancelled;
  }, [allCancelledSales, selectedSeller, selectedTeam, selectedCancelReason, teams]);

  // For chart data, use all cancelled (before reason filter)
  const allFilteredCancelled = useMemo(() => {
    let filtered = allCancelledSales;
    if (selectedSeller !== 'ALL') {
      filtered = filtered.filter(s => s.seller_id === selectedSeller);
    }
    if (selectedTeam !== 'ALL') {
      const teamName = teams.find(t => t.id === selectedTeam)?.name;
      filtered = filtered.filter(s => s.equipe === teamName || s.equipe === selectedTeam);
    }
    return filtered;
  }, [allCancelledSales, selectedSeller, selectedTeam, teams]);

  // Get unique cancel reasons for filter dropdown
  const cancelReasons = useMemo(() => {
    const reasons = new Set<string>();
    
    allFilteredCancelled.forEach(sale => {
      if (sale.motivo_pendencia && sale.motivo_pendencia.trim()) {
        reasons.add(sale.motivo_pendencia);
      }
    });
    
    return Array.from(reasons).sort();
  }, [allFilteredCancelled]);

  // Data for cancelled sales pie chart by reason
  const cancelReasonChartData = useMemo(() => {
    const reasonCounts: Record<string, { count: number; value: number }> = {};
    
    allFilteredCancelled.forEach(sale => {
      const reason = sale.motivo_pendencia?.trim() || 'Sem motivo informado';
      if (!reasonCounts[reason]) {
        reasonCounts[reason] = { count: 0, value: 0 };
      }
      reasonCounts[reason].count++;
      reasonCounts[reason].value += Number(sale.valor_mensal);
    });

    // Generate colors for each reason
    const colors = [
      '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
      '#22C55E', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6',
      '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
    ];

    return Object.entries(reasonCounts)
      .map(([reason, data], index) => ({
        name: reason.length > 25 ? reason.substring(0, 25) + '...' : reason,
        fullName: reason,
        value: data.count,
        valorTotal: data.value,
        color: colors[index % colors.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [allFilteredCancelled]);

  // Stats - EXCLUDING cancelled sales
  const stats = useMemo(() => {
    const total = activeSales.length;
    const valorTotal = activeSales.reduce((acc, s) => acc + Number(s.valor_mensal), 0);
    const aprovadas = activeSales.filter(s => s.status === 'VENDA_AUDITADA' || s.status === 'INSTALACAO_MARCADA' || s.status === 'INSTALADA').length;
    const taxaConversao = total > 0 ? ((aprovadas / total) * 100).toFixed(1) : '0';
    const ticketMedio = total > 0 ? valorTotal / total : 0;
    const totalCanceladas = allFilteredCancelled.length;
    const valorCancelado = allFilteredCancelled.reduce((acc, s) => acc + Number(s.valor_mensal), 0);

    return { total, valorTotal, aprovadas, taxaConversao, ticketMedio, totalCanceladas, valorCancelado };
  }, [activeSales, allFilteredCancelled]);

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

  // Sales by status for pie chart - showing active sales only
  const statusData = useMemo(() => {
    const counts: Record<SaleStatus, number> = {
      PRE_ANALISE: 0, AGUARDANDO_AUDITORIA: 0, PENDENCIA: 0, VENDA_AUDITADA: 0, INSTALACAO_MARCADA: 0, INSTALADA: 0, CANCELADA: 0, ACEITE_ENVIADO: 0, CHAMADO_EM_ABERTO: 0, DESCONECTADO: 0, ENVIADO_PARA_SAV: 0, IMPUTADA: 0
    };
    
    // Count active sales by status
    activeSales.forEach(s => {
      counts[s.status]++;
    });
    
    // Add cancelled count from all cancelled sales
    counts['CANCELADA'] = allFilteredCancelled.length;

    return Object.entries(counts)
      .filter(([_, value]) => value > 0)
      .map(([status, value]) => ({
        name: SALE_STATUS_LABELS[status as SaleStatus],
        value,
        color: STATUS_COLORS[status as SaleStatus],
      }));
  }, [activeSales, allFilteredCancelled]);

  // Sales by seller for bar chart - EXCLUDING cancelled
  const sellerData = useMemo(() => {
    if (isSeller) return [];
    
    const sellerStats: Record<string, { nome: string; vendas: number; valor: number }> = {};
    
    activeSales.forEach(sale => {
      if (!sale.seller_id) return;
      
      if (!sellerStats[sale.seller_id]) {
        const seller = sellers.find(s => s.id === sale.seller_id);
        const snapshot = (sale as any).seller_name_snapshot as string | undefined;
        const removed = (sale as any).seller_removed as boolean | undefined;
        const baseName = seller?.nome || snapshot || 'Desconhecido';
        sellerStats[sale.seller_id] = {
          nome: removed && !seller ? `${baseName} (removido)` : baseName,
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
    if (activeSales.length === 0) {
      toast.error('Não há vendas para exportar no período selecionado');
      return;
    }
    
    const periodStr = `${format(dateRange.from, 'dd-MM-yyyy')}_${format(dateRange.to, 'dd-MM-yyyy')}`;
    exportToExcel(activeSales, sellersMap, `relatorio-vendas_${periodStr}`);
    toast.success('Relatório Excel gerado com sucesso!');
  };

  const handleExportPDF = () => {
    if (activeSales.length === 0) {
      toast.error('Não há vendas para exportar no período selecionado');
      return;
    }
    
    const periodLabel = `${format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} a ${format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`;
    const periodStr = `${format(dateRange.from, 'dd-MM-yyyy')}_${format(dateRange.to, 'dd-MM-yyyy')}`;
    exportToPDF(activeSales, sellersMap, periodLabel, `relatorio-vendas_${periodStr}`);
    toast.success('Relatório PDF gerado com sucesso!');
  };

  // Export cancelled sales to Excel
  const handleExportCancelledExcel = () => {
    if (cancelledSales.length === 0) {
      toast.error('Não há vendas canceladas para exportar');
      return;
    }

    const exportData: CancelledSaleExportData[] = cancelledSales.map(sale => {
      const seller = sellers.find(s => s.id === sale.seller_id);
      return {
        id: sale.id,
        empresa: sale.nome_fantasia || sale.razao_social,
        cnpj: sale.cnpj_cliente,
        vendedor: seller?.nome || 'N/A',
        dataVenda: sale.data_venda ? format(parseISO(sale.data_venda), 'dd/MM/yyyy', { locale: ptBR }) : '-',
        motivo: sale.motivo_pendencia || '',
        valorMensal: Number(sale.valor_mensal),
      };
    });

    const periodLabel = `${format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} a ${format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`;
    const periodStr = `${format(dateRange.from, 'dd-MM-yyyy')}_${format(dateRange.to, 'dd-MM-yyyy')}`;
    const totalSales = activeSales.length + allFilteredCancelled.length;
    const cancellationRate = totalSales > 0 ? (stats.totalCanceladas / totalSales) * 100 : 0;
    const reasonLabel = selectedCancelReason === 'ALL' ? 'Todos os motivos' : 
                        selectedCancelReason === 'SEM_MOTIVO' ? 'Sem motivo informado' : selectedCancelReason;

    exportCancelledSalesToExcel(
      exportData,
      periodLabel,
      stats.valorCancelado,
      cancellationRate,
      reasonLabel,
      `vendas-canceladas_${periodStr}`
    );
    toast.success('Relatório de canceladas Excel gerado com sucesso!');
  };

  // Export cancelled sales to PDF
  const handleExportCancelledPDF = () => {
    if (cancelledSales.length === 0) {
      toast.error('Não há vendas canceladas para exportar');
      return;
    }

    const exportData: CancelledSaleExportData[] = cancelledSales.map(sale => {
      const seller = sellers.find(s => s.id === sale.seller_id);
      return {
        id: sale.id,
        empresa: sale.nome_fantasia || sale.razao_social,
        cnpj: sale.cnpj_cliente,
        vendedor: seller?.nome || 'N/A',
        dataVenda: sale.data_venda ? format(parseISO(sale.data_venda), 'dd/MM/yyyy', { locale: ptBR }) : '-',
        motivo: sale.motivo_pendencia || '',
        valorMensal: Number(sale.valor_mensal),
      };
    });

    const periodLabel = `${format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} a ${format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`;
    const periodStr = `${format(dateRange.from, 'dd-MM-yyyy')}_${format(dateRange.to, 'dd-MM-yyyy')}`;
    const totalSales = activeSales.length + allFilteredCancelled.length;
    const cancellationRate = totalSales > 0 ? (stats.totalCanceladas / totalSales) * 100 : 0;
    const reasonLabel = selectedCancelReason === 'ALL' ? 'Todos os motivos' :
                        selectedCancelReason === 'SEM_MOTIVO' ? 'Sem motivo informado' : selectedCancelReason;

    exportCancelledSalesToPDF(
      exportData,
      periodLabel,
      stats.valorCancelado,
      cancellationRate,
      reasonLabel,
      `vendas-canceladas_${periodStr}`
    );
    toast.success('Relatório de canceladas PDF gerado com sucesso!');
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
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Info className="h-3 w-3" />
              O filtro de datas usa a data da venda informada no cadastro. Se ela não estiver preenchida, usa a data de criação do registro.
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
                  from: subDays(new Date(), 90),
                  to: new Date(),
                })}
              >
                90 dias
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

            {/* Team Filter */}
            {!isSeller && (
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar equipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as equipes</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

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
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="vendas" className="gap-1.5">
                      <TrendingUp className="h-4 w-4" />
                      Vendas Ativas ({stats.total})
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Vendas em andamento do período selecionado (exclui canceladas)</p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="canceladas" className="gap-1.5">
                      <XCircle className="h-4 w-4" />
                      Canceladas ({stats.totalCanceladas})
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Histórico completo de todas as vendas canceladas</p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
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
                  value={`${(activeSales.length + allFilteredCancelled.length) > 0 ? ((stats.totalCanceladas / (activeSales.length + allFilteredCancelled.length)) * 100).toFixed(1) : 0}%`}
                  icon={Target}
                  description="Do total de vendas"
                />
              </div>

              {/* Charts Grid for Cancelled */}
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Pie Chart - Cancelled by Reason */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Distribuição por Motivo</CardTitle>
                    <CardDescription className="text-xs">Quantidade de cancelamentos por motivo</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      {cancelReasonChartData.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                          Nenhum cancelamento
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={cancelReasonChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="value"
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              labelLine={false}
                            >
                              {cancelReasonChartData.map((entry, index) => (
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
                              formatter={(value: number, name: string, props: any) => [
                                `${value} vendas (${formatCurrency(props.payload.valorTotal)})`,
                                props.payload.fullName
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Bar Chart - Value by Reason */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Valor Perdido por Motivo</CardTitle>
                    <CardDescription className="text-xs">Top motivos por valor cancelado</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      {cancelReasonChartData.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                          Nenhum cancelamento
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={cancelReasonChartData.slice(0, 5).map(d => ({ ...d, valor: d.valorTotal }))} 
                            layout="vertical"
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              type="number" 
                              className="text-[10px] fill-muted-foreground"
                              tickFormatter={(value) => formatCurrencyShort(value)}
                            />
                            <YAxis 
                              type="category" 
                              dataKey="name" 
                              className="text-[10px] fill-muted-foreground"
                              width={100}
                              tickLine={false}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                fontSize: '12px',
                              }}
                              formatter={(value: number) => [formatCurrency(value), 'Valor Perdido']}
                            />
                            <Bar 
                              dataKey="valor" 
                              name="Valor Perdido"
                              fill="hsl(var(--destructive))" 
                              radius={[0, 4, 4, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filter by Cancel Reason and Export */}
              <div className="flex flex-wrap items-center justify-between gap-3">
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

                {/* Export Cancelled Sales */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="destructive" className="gap-2">
                      <Download className="h-4 w-4" />
                      Exportar Canceladas
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportCancelledExcel} className="gap-2 cursor-pointer">
                      <FileSpreadsheet className="h-4 w-4 text-green-600" />
                      Exportar Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportCancelledPDF} className="gap-2 cursor-pointer">
                      <FileText className="h-4 w-4 text-red-600" />
                      Exportar PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
