import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Sale, SaleStatus, SALE_STATUS_LABELS, Profile } from '@/types/database';
import { 
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  Building2,
  UserCheck,
  Activity,
  Eye,
  BarChart3,
  Users,
  Trophy,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { FloatingChatButton } from '@/components/chat/FloatingChatButton';
import { useSalesNotifications } from '@/hooks/useSalesNotifications';
import { CallCenterMetrics } from '@/components/dashboard/CallCenterMetrics';
import { SellerRanking } from '@/components/dashboard/SellerRanking';
import { ComparativeMetrics } from '@/components/dashboard/ComparativeMetrics';
import { MonthlyGoalProgress } from '@/components/dashboard/MonthlyGoalProgress';
import { BroadcastManager } from '@/components/broadcast/BroadcastManager';
import { motion } from 'framer-motion';

const STATUS_BADGE_STYLES: Record<SaleStatus, { bg: string; text: string; label: string }> = {
  PRE_ANALISE: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', label: 'Pré-Análise' },
  AGUARDANDO_AUDITORIA: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', label: 'Aguard. Auditoria' },
  PENDENCIA: { bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', label: 'Pendência' },
  VENDA_AUDITADA: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', label: 'Auditada' },
  INSTALACAO_MARCADA: { bg: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400', label: 'Inst. Marcada' },
  INSTALADA: { bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', label: 'Instalada' },
  CANCELADA: { bg: 'bg-gray-50 dark:bg-gray-500/10', text: 'text-gray-500 dark:text-gray-400', label: 'Cancelada' },
};

const ALL_STATUSES: SaleStatus[] = ['PRE_ANALISE', 'AGUARDANDO_AUDITORIA', 'PENDENCIA', 'VENDA_AUDITADA', 'INSTALACAO_MARCADA', 'INSTALADA', 'CANCELADA'];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isSeller, isCEO, isBackoffice } = useAuth();
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [sellers, setSellers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<SaleStatus | 'all'>('all');
  const itemsPerPage = 6;

  useSalesNotifications();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const { data: salesData } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (salesData) {
        setAllSales(salesData as Sale[]);
      }

      if (isCEO || isBackoffice) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*');
        
        setSellers((profilesData || []) as Profile[]);
      }

      setLoading(false);
    };

    fetchData();
  }, [user, isSeller, isCEO, isBackoffice]);

  // Filter and search logic
  const filteredSales = useMemo(() => {
    let result = allSales;

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(sale => sale.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(sale => 
        sale.razao_social.toLowerCase().includes(query) ||
        sale.nome_fantasia?.toLowerCase().includes(query) ||
        sale.cnpj_cliente.includes(query)
      );
    }

    return result;
  }, [allSales, statusFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  const stats = useMemo(() => ({
    total: allSales.length,
    valorTotal: allSales.reduce((acc, sale) => acc + Number(sale.valor_mensal), 0),
    pendentes: allSales.filter(s => s.status === 'PRE_ANALISE' || s.status === 'AGUARDANDO_AUDITORIA' || s.status === 'PENDENCIA').length,
    aprovadas: allSales.filter(s => s.status === 'VENDA_AUDITADA' || s.status === 'INSTALACAO_MARCADA' || s.status === 'INSTALADA').length,
  }), [allSales]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getProgressValue = (sale: Sale) => {
    const statusOrder: SaleStatus[] = ['PRE_ANALISE', 'AGUARDANDO_AUDITORIA', 'PENDENCIA', 'VENDA_AUDITADA', 'INSTALACAO_MARCADA', 'INSTALADA'];
    if (sale.status === 'CANCELADA') return 0;
    const index = statusOrder.indexOf(sale.status);
    return ((index + 1) / statusOrder.length) * 100;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header with Tabs */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <Button 
            onClick={() => navigate('/vendas')}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <span className="text-lg leading-none">+</span>
            Adicionar Cliente
          </Button>
        </div>

        <Tabs defaultValue="comparative" className="w-full">
          <TabsList className="grid w-full max-w-3xl grid-cols-4">
            <TabsTrigger value="comparative" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Comparativo</span>
            </TabsTrigger>
            <TabsTrigger value="metrics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Métricas</span> Call Center
            </TabsTrigger>
            <TabsTrigger value="ranking" className="gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Ranking</span>
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Clientes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="comparative" className="mt-6 space-y-6">
            <MonthlyGoalProgress />
            {(isCEO || isBackoffice) && <BroadcastManager />}
            <ComparativeMetrics />
          </TabsContent>

          <TabsContent value="metrics" className="mt-6">
            <CallCenterMetrics sales={allSales} />
          </TabsContent>

          <TabsContent value="ranking" className="mt-6">
            <SellerRanking sales={allSales} sellers={sellers} />
          </TabsContent>

          <TabsContent value="clients" className="mt-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {/* Total Customers */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setStatusFilter('all')}
            className={cn(
              "bg-card border border-border rounded-xl p-4 cursor-pointer transition-all hover:border-primary/50",
              statusFilter === 'all' && "ring-2 ring-primary"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Total Clientes</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-foreground">{stats.total.toLocaleString('pt-BR')}</span>
                  {stats.total > 0 && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Approved */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => setStatusFilter(statusFilter === 'VENDA_AUDITADA' ? 'all' : 'VENDA_AUDITADA')}
            className={cn(
              "bg-card border border-border rounded-xl p-4 cursor-pointer transition-all hover:border-emerald-500/50",
              statusFilter === 'VENDA_AUDITADA' && "ring-2 ring-emerald-500"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 flex-shrink-0">
                <UserCheck className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Aprovados</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-foreground">{stats.aprovadas.toLocaleString('pt-BR')}</span>
                  {stats.aprovadas > 0 && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Team */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate('/usuarios')}
            className="bg-card border border-border rounded-xl p-4 cursor-pointer transition-all hover:border-primary/50"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10 flex-shrink-0">
                <Activity className="h-4 w-4 text-violet-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Equipe</p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-foreground">{sellers.length}</span>
                  <div className="flex -space-x-1">
                    {sellers.slice(0, 3).map((seller, idx) => (
                      <Avatar key={idx} className="h-6 w-6 border-2 border-card">
                        <AvatarImage src={seller.avatar_url || ''} />
                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                          {getInitials(seller.nome)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {sellers.length > 3 && (
                      <div className="h-6 w-6 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                        <span className="text-[8px] text-muted-foreground font-medium">+{sellers.length - 3}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
            </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter Chips */}
            <Badge 
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              className="cursor-pointer px-3 py-1.5"
              onClick={() => setStatusFilter('all')}
            >
              Todos ({allSales.length})
            </Badge>
            
            {ALL_STATUSES.map(status => {
              const count = allSales.filter(s => s.status === status).length;
              if (count === 0) return null;
              const style = STATUS_BADGE_STYLES[status];
              return (
                <Badge 
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  className={cn(
                    "cursor-pointer px-3 py-1.5",
                    statusFilter === status && style.bg
                  )}
                  onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
                >
                  {style.label} ({count})
                </Badge>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empresa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card"
            />
          </div>
        </div>

        {/* Table */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl overflow-hidden"
        >
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-border bg-muted/30">
            <div className="col-span-4">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Empresa</span>
            </div>
            <div className="col-span-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</span>
            </div>
            <div className="col-span-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Valor Mensal</span>
            </div>
            <div className="col-span-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Progresso</span>
            </div>
            <div className="col-span-1"></div>
          </div>

          {/* Table Body */}
          {paginatedSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Building2 className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum cliente encontrado</p>
              <p className="text-sm mt-1">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Tente ajustar os filtros de busca.' 
                  : 'Adicione seu primeiro cliente.'}
              </p>
              <Button onClick={() => navigate('/vendas')} className="mt-4">
                Adicionar Cliente
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {paginatedSales.map((sale, index) => {
                const statusStyle = STATUS_BADGE_STYLES[sale.status];
                
                return (
                  <motion.div
                    key={sale.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-muted/50 transition-colors"
                  >
                    {/* Company */}
                    <div className="col-span-4 flex items-center gap-3">
                      <Avatar className="h-10 w-10 rounded-lg">
                        <AvatarFallback className="rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                          {getInitials(sale.razao_social)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {sale.nome_fantasia || sale.razao_social}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{sale.cnpj_cliente}</p>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="col-span-2">
                      <Badge className={cn("font-medium", statusStyle.bg, statusStyle.text)}>
                        {statusStyle.label}
                      </Badge>
                    </div>

                    {/* Value */}
                    <div className="col-span-3">
                      <p className="text-sm font-medium text-foreground">
                        {formatCurrency(Number(sale.valor_mensal))}
                      </p>
                      <p className="text-xs text-muted-foreground">/mês</p>
                    </div>

                    {/* Progress */}
                    <div className="col-span-2">
                      <Progress value={getProgressValue(sale)} className="h-2" />
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => navigate('/vendas')}
                      >
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="gap-1"
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Chat Button */}
      <FloatingChatButton />
    </Layout>
  );
};

export default Dashboard;
