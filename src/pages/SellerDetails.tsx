import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  TrendingUp,
  Target,
  DollarSign,
  ShoppingCart,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Package,
  Calendar,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sale, Profile, SaleStatus } from '@/types/database';

interface SellerGoal {
  id: string;
  seller_id: string;
  month: number;
  year: number;
  target_sales: number;
  target_value: number;
}

export default function SellerDetails() {
  const { sellerId } = useParams<{ sellerId: string }>();
  const navigate = useNavigate();
  const { isCEO, isBackoffice } = useAuth();
  
  const [seller, setSeller] = useState<Profile | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [goals, setGoals] = useState<SellerGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!sellerId) return;

    const fetchData = async () => {
      setLoading(true);
      
      // Fetch seller profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sellerId)
        .maybeSingle();

      if (profileData) {
        setSeller(profileData as Profile);
      }

      // Fetch seller's sales
      const { data: salesData } = await supabase
        .from('sales')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (salesData) {
        setSales(salesData as Sale[]);
      }

      // Fetch goals
      const { data: goalsData } = await supabase
        .from('seller_goals')
        .select('*')
        .eq('seller_id', sellerId);

      if (goalsData) {
        setGoals(goalsData as SellerGoal[]);
      }

      setLoading(false);
    };

    fetchData();
  }, [sellerId]);

  const metrics = useMemo(() => {
    const currentMonthSales = sales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate.getMonth() + 1 === currentMonth && saleDate.getFullYear() === currentYear;
    });

    const currentGoal = goals.find(g => g.month === currentMonth && g.year === currentYear);

    const totalSales = currentMonthSales.length;
    const auditedSales = currentMonthSales.filter(s => 
      ['VENDA_AUDITADA', 'INSTALACAO_MARCADA', 'INSTALADA'].includes(s.status || '')
    ).length;
    const installedSales = currentMonthSales.filter(s => s.status === 'INSTALADA').length;
    const pendingSales = currentMonthSales.filter(s => s.status === 'PENDENCIA').length;
    const canceledSales = currentMonthSales.filter(s => s.status === 'CANCELADA').length;
    const totalValue = currentMonthSales.reduce((sum, s) => sum + Number(s.valor_mensal), 0);

    const submitted = currentMonthSales.filter(s => s.status !== 'PRE_ANALISE').length;
    const conversionRate = submitted > 0 ? (auditedSales / submitted) * 100 : 0;
    const installRate = auditedSales > 0 ? (installedSales / auditedSales) * 100 : 0;

    // Calculate avg audit time
    let avgAuditTimeHours = 0;
    const auditTimes: number[] = [];
    currentMonthSales.forEach(sale => {
      if (['VENDA_AUDITADA', 'INSTALACAO_MARCADA', 'INSTALADA'].includes(sale.status || '')) {
        const created = new Date(sale.created_at);
        const updated = new Date(sale.updated_at);
        const hours = Math.max(1, (updated.getTime() - created.getTime()) / (1000 * 60 * 60));
        auditTimes.push(hours);
      }
    });
    if (auditTimes.length > 0) {
      avgAuditTimeHours = Math.round(auditTimes.reduce((a, b) => a + b, 0) / auditTimes.length);
    }

    const goalSalesProgress = currentGoal && currentGoal.target_sales > 0 
      ? Math.min(100, (totalSales / currentGoal.target_sales) * 100) 
      : 0;
    const goalValueProgress = currentGoal && currentGoal.target_value > 0 
      ? Math.min(100, (totalValue / currentGoal.target_value) * 100) 
      : 0;

    // All time stats
    const allTimeSales = sales.length;
    const allTimeValue = sales.reduce((sum, s) => sum + Number(s.valor_mensal), 0);
    const allTimeInstalled = sales.filter(s => s.status === 'INSTALADA').length;

    return {
      totalSales,
      auditedSales,
      installedSales,
      pendingSales,
      canceledSales,
      totalValue,
      conversionRate,
      installRate,
      avgAuditTimeHours,
      goalSales: currentGoal?.target_sales || 10,
      goalValue: currentGoal?.target_value || 0,
      goalSalesProgress,
      goalValueProgress,
      allTimeSales,
      allTimeValue,
      allTimeInstalled,
    };
  }, [sales, goals, currentMonth, currentYear]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatHours = (hours: number) => {
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-emerald-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-amber-500';
    return 'bg-orange-500';
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!seller) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
          <p className="text-lg font-medium">Vendedor não encontrado</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4 flex-1">
            <Avatar className="h-16 w-16">
              <AvatarImage src={seller.avatar_url || ''} />
              <AvatarFallback className="text-lg font-bold">
                {getInitials(seller.nome)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{seller.nome}</h1>
              <p className="text-muted-foreground">{seller.email}</p>
            </div>
          </div>
        </div>

        {/* Monthly Goals Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Metas de {monthNames[currentMonth - 1]} {currentYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Meta de Vendas</span>
                  <span className="font-medium">
                    {metrics.totalSales} / {metrics.goalSales} vendas
                  </span>
                </div>
                <Progress 
                  value={metrics.goalSalesProgress} 
                  className={cn("h-3", getProgressColor(metrics.goalSalesProgress))}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {metrics.goalSalesProgress.toFixed(0)}% concluído
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Meta de Valor</span>
                  <span className="font-medium">
                    {formatCurrency(metrics.totalValue)} / {formatCurrency(metrics.goalValue)}
                  </span>
                </div>
                <Progress 
                  value={metrics.goalValueProgress} 
                  className={cn("h-3", getProgressColor(metrics.goalValueProgress))}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {metrics.goalValueProgress.toFixed(0)}% concluído
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Month Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.totalSales}</p>
                  <p className="text-xs text-muted-foreground">Vendas do Mês</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-500">{formatCurrency(metrics.totalValue)}</p>
                  <p className="text-xs text-muted-foreground">Valor do Mês</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-500">{metrics.conversionRate.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Taxa de Conversão</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-500">{formatHours(metrics.avgAuditTimeHours)}</p>
                  <p className="text-xs text-muted-foreground">Tempo Médio Auditoria</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Distribution */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.auditedSales}</p>
                  <p className="text-xs text-muted-foreground">Auditadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.installedSales}</p>
                  <p className="text-xs text-muted-foreground">Instaladas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.pendingSales}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.canceledSales}</p>
                  <p className="text-xs text-muted-foreground">Canceladas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.installRate.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Taxa Instalação</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* All Time Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Histórico Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-3xl font-bold text-foreground">{metrics.allTimeSales}</p>
                <p className="text-sm text-muted-foreground">Total de Vendas</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-emerald-500">{formatCurrency(metrics.allTimeValue)}</p>
                <p className="text-sm text-muted-foreground">Valor Total</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-500">{metrics.allTimeInstalled}</p>
                <p className="text-sm text-muted-foreground">Instaladas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Table */}
        <Card>
          <CardHeader>
            <CardTitle>Vendas do Vendedor</CardTitle>
            <CardDescription>
              Todas as vendas registradas ({sales.length} total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Valor Mensal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhuma venda encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    sales.slice(0, 50).map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">
                          {formatDate(sale.created_at)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sale.razao_social}</p>
                            {sale.nome_fantasia && (
                              <p className="text-xs text-muted-foreground">{sale.nome_fantasia}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {sale.cnpj_cliente}
                        </TableCell>
                        <TableCell className="font-medium text-emerald-500">
                          {formatCurrency(Number(sale.valor_mensal))}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={sale.status as SaleStatus} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/vendas/${sale.id}/historico`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {sales.length > 50 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                Exibindo 50 de {sales.length} vendas
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
