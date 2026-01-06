import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { supabase } from '@/integrations/supabase/client';
import { Sale, SaleStatus, SALE_STATUS_LABELS } from '@/types/database';
import { 
  ShoppingCart, 
  DollarSign, 
  Clock, 
  CheckCircle,
  TrendingUp
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

const Dashboard = () => {
  const { user, profile, role, isSeller } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSales = async () => {
      if (!user) return;

      let query = supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      // Vendedores só veem suas próprias vendas (RLS já faz isso, mas mantemos por clareza)
      if (isSeller) {
        query = query.eq('seller_id', user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching sales:', error);
      } else {
        setSales((data || []) as Sale[]);
      }
      setLoading(false);
    };

    fetchSales();
  }, [user, isSeller]);

  const stats = {
    total: sales.length,
    valorTotal: sales.reduce((acc, sale) => acc + Number(sale.valor_mensal), 0),
    pendentes: sales.filter(s => s.status === 'NOVA' || s.status === 'EM_ANALISE' || s.status === 'PENDENCIA').length,
    aprovadas: sales.filter(s => s.status === 'APROVADA' || s.status === 'INSTALADA').length,
  };

  const recentSales = sales.slice(0, 5);

  const statusCount = sales.reduce((acc, sale) => {
    acc[sale.status] = (acc[sale.status] || 0) + 1;
    return acc;
  }, {} as Record<SaleStatus, number>);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo, {profile?.nome || 'Usuário'}! 
            {isSeller && ' Aqui estão suas vendas.'}
          </p>
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
            title="Aprovadas"
            value={stats.aprovadas}
            icon={CheckCircle}
            description="Vendas concluídas"
          />
        </div>

        {/* Charts and Tables */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Status Distribution */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Status das Vendas
              </CardTitle>
              <CardDescription>Distribuição por status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(Object.entries(SALE_STATUS_LABELS) as [SaleStatus, string][]).map(([status, label]) => {
                  const count = statusCount[status] || 0;
                  const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={status} />
                        <span className="text-sm text-muted-foreground">
                          ({count})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Sales */}
          <Card className="lg:col-span-2 shadow-card">
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
      </div>
    </Layout>
  );
};

export default Dashboard;
