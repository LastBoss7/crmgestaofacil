import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { supabase } from '@/integrations/supabase/client';
import { Sale, SaleStatus, SALE_STATUS_LABELS, Profile } from '@/types/database';
import { 
  ShoppingCart, 
  DollarSign, 
  Clock, 
  TrendingUp,
  Users,
  BarChart3,
  Target,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
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
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { 
  exportToExcel, 
  exportToPDF, 
  filterByPeriod, 
  getPeriodLabel,
  PeriodFilter,
  PERIOD_OPTIONS 
} from '@/lib/export-utils';
import { toast } from 'sonner';

interface SellerStats {
  id: string;
  nome: string;
  totalVendas: number;
  valorTotal: number;
  aprovadas: number;
  pendentes: number;
  taxaAprovacao: number;
}

const STATUS_COLORS: Record<SaleStatus, string> = {
  NOVA: '#3b82f6',
  EM_ANALISE: '#f59e0b',
  PENDENCIA: '#ef4444',
  APROVADA: '#22c55e',
  INSTALADA: '#8b5cf6',
  CANCELADA: '#6b7280',
};

const Dashboard = () => {
  const { user, profile, role, isSeller, isCEO, isBackoffice } = useAuth();
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [sellers, setSellers] = useState<Profile[]>([]);
  const [sellersMap, setSellersMap] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('30d');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch sales
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (salesError) {
        console.error('Error fetching sales:', salesError);
      } else {
        setAllSales((salesData || []) as Sale[]);
      }

      // Fetch sellers for CEO/Backoffice
      if (isCEO || isBackoffice) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*');
        
        const profilesList = (profilesData || []) as Profile[];
        setSellers(profilesList);
        
        const map: Record<string, Profile> = {};
        profilesList.forEach(p => { map[p.id] = p; });
        setSellersMap(map);
      }

      setLoading(false);
    };

    fetchData();
  }, [user, isSeller, isCEO, isBackoffice]);

  // Filter sales by period
  const sales = useMemo(() => {
    return filterByPeriod(allSales, periodFilter);
  }, [allSales, periodFilter]);

  // Calculate general stats
  const stats = useMemo(() => ({
    total: sales.length,
    valorTotal: sales.reduce((acc, sale) => acc + Number(sale.valor_mensal), 0),
    pendentes: sales.filter(s => s.status === 'NOVA' || s.status === 'EM_ANALISE' || s.status === 'PENDENCIA').length,
    aprovadas: sales.filter(s => s.status === 'APROVADA' || s.status === 'INSTALADA').length,
    canceladas: sales.filter(s => s.status === 'CANCELADA').length,
  }), [sales]);

  // Calculate status distribution for pie chart
  const { pieData, statusCount } = useMemo(() => {
    const count = sales.reduce((acc, sale) => {
      acc[sale.status] = (acc[sale.status] || 0) + 1;
      return acc;
    }, {} as Record<SaleStatus, number>);

    const data = Object.entries(count).map(([status, cnt]) => ({
      name: SALE_STATUS_LABELS[status as SaleStatus],
      value: cnt,
      color: STATUS_COLORS[status as SaleStatus],
    }));

    return { pieData: data, statusCount: count };
  }, [sales]);

  // Calculate seller stats
  const sellerStats: SellerStats[] = useMemo(() => {
    return sellers.map(seller => {
      const sellerSales = sales.filter(s => s.seller_id === seller.id);
      const aprovadas = sellerSales.filter(s => s.status === 'APROVADA' || s.status === 'INSTALADA').length;
      const pendentes = sellerSales.filter(s => s.status === 'NOVA' || s.status === 'EM_ANALISE' || s.status === 'PENDENCIA').length;
      
      return {
        id: seller.id,
        nome: seller.nome,
        totalVendas: sellerSales.length,
        valorTotal: sellerSales.reduce((acc, s) => acc + Number(s.valor_mensal), 0),
        aprovadas,
        pendentes,
        taxaAprovacao: sellerSales.length > 0 ? (aprovadas / sellerSales.length) * 100 : 0,
      };
    }).filter(s => s.totalVendas > 0).sort((a, b) => b.valorTotal - a.valorTotal);
  }, [sellers, sales]);

  // Bar chart data for top sellers
  const barData = useMemo(() => {
    return sellerStats.slice(0, 5).map(s => ({
      nome: s.nome.split(' ')[0],
      Aprovadas: s.aprovadas,
      Pendentes: s.pendentes,
      Valor: s.valorTotal,
    }));
  }, [sellerStats]);

  const recentSales = sales.slice(0, 5);

  const handleExportExcel = () => {
    exportToExcel(sales, sellersMap, `vendas-${periodFilter}`);
    toast.success('Relatório Excel exportado!');
  };

  const handleExportPDF = () => {
    exportToPDF(sales, sellersMap, getPeriodLabel(periodFilter), `vendas-${periodFilter}`);
    toast.success('Relatório PDF exportado!');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const taxaAprovacaoGeral = stats.total > 0 
    ? ((stats.aprovadas / stats.total) * 100).toFixed(1) 
    : '0';

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Bem-vindo, {profile?.nome || 'Usuário'}! 
              {isSeller && ' Aqui estão suas vendas.'}
              {(isCEO || isBackoffice) && ' Visão geral do sistema.'}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Period Filter */}
            <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
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

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total de Vendas"
            value={stats.total}
            icon={ShoppingCart}
            description="Vendas registradas"
          />
          <StatCard
            title="Valor Total Mensal"
            value={formatCurrency(stats.valorTotal)}
            icon={DollarSign}
            description="Receita recorrente"
          />
          <StatCard
            title="Em Andamento"
            value={stats.pendentes}
            icon={Clock}
            description="Aguardando processamento"
          />
          <StatCard
            title="Taxa de Aprovação"
            value={`${taxaAprovacaoGeral}%`}
            icon={Target}
            description={`${stats.aprovadas} aprovadas de ${stats.total}`}
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Status Pie Chart */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Distribuição por Status
              </CardTitle>
              <CardDescription>Visão geral das vendas</CardDescription>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="h-[200px] w-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2">
                    {pieData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-3 w-3 rounded-full" 
                            style={{ backgroundColor: item.color }}
                          />
                          <span>{item.name}</span>
                        </div>
                        <span className="font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Sellers Bar Chart - Only for CEO/Backoffice */}
          {(isCEO || isBackoffice) && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Top Vendedores
                </CardTitle>
                <CardDescription>Desempenho por vendedor</CardDescription>
              </CardHeader>
              <CardContent>
                {barData.length > 0 ? (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="nome" width={80} fontSize={12} />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'Valor' ? formatCurrency(Number(value)) : value,
                            name
                          ]}
                        />
                        <Legend />
                        <Bar dataKey="Aprovadas" stackId="a" fill="#22c55e" />
                        <Bar dataKey="Pendentes" stackId="a" fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Seller view - their own stats */}
          {isSeller && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Sua Performance
                </CardTitle>
                <CardDescription>Seu desempenho de vendas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Taxa de Aprovação</span>
                    <span className="font-medium">{taxaAprovacaoGeral}%</span>
                  </div>
                  <Progress value={Number(taxaAprovacaoGeral)} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{stats.aprovadas}</p>
                    <p className="text-xs text-green-600">Aprovadas</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{stats.pendentes}</p>
                    <p className="text-xs text-orange-600">Em Andamento</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Seller Rankings - Only for CEO/Backoffice */}
        {(isCEO || isBackoffice) && sellerStats.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Ranking de Vendedores
              </CardTitle>
              <CardDescription>Performance detalhada por vendedor</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-center">Vendas</TableHead>
                    <TableHead className="text-center">Aprovadas</TableHead>
                    <TableHead className="text-center">Pendentes</TableHead>
                    <TableHead className="text-center">Taxa</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellerStats.map((seller, index) => (
                    <TableRow key={seller.id}>
                      <TableCell className="font-medium">
                        {index === 0 && '🥇'}
                        {index === 1 && '🥈'}
                        {index === 2 && '🥉'}
                        {index > 2 && index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{seller.nome}</TableCell>
                      <TableCell className="text-center">{seller.totalVendas}</TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                          {seller.aprovadas}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-700 text-sm font-medium">
                          {seller.pendentes}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Progress value={seller.taxaAprovacao} className="w-16 h-2" />
                          <span className="text-xs text-muted-foreground w-10">
                            {seller.taxaAprovacao.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(seller.valorTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Recent Sales */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Vendas Recentes</CardTitle>
            <CardDescription>Últimas 5 vendas registradas</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : recentSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">Nenhuma venda registrada</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Produtos</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sale.nome_fantasia || sale.razao_social}</p>
                          <p className="text-xs text-muted-foreground">{sale.cnpj_cliente}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {sale.produtos || '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(Number(sale.valor_mensal))}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={sale.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;