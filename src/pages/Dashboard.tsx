import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Sale, SaleStatus, SALE_STATUS_LABELS, Profile } from '@/types/database';
import { 
  Users,
  TrendingUp,
  MoreVertical,
  Search,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Pencil,
  Building2,
  UserCheck,
  Activity,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { FloatingChatButton } from '@/components/chat/FloatingChatButton';
import { useSalesNotifications } from '@/hooks/useSalesNotifications';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const STATUS_BADGE_STYLES: Record<SaleStatus, { bg: string; text: string; label: string }> = {
  NOVA: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', label: 'Nova' },
  EM_ANALISE: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', label: 'Análise' },
  PENDENCIA: { bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', label: 'Pendência' },
  APROVADA: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', label: 'Aprovada' },
  INSTALADA: { bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', label: 'Instalada' },
  CANCELADA: { bg: 'bg-gray-50 dark:bg-gray-500/10', text: 'text-gray-500 dark:text-gray-400', label: 'Cancelada' },
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isSeller, isCEO, isBackoffice } = useAuth();
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [sellers, setSellers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSales, setSelectedSales] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState<string[]>(['all']);
  const [activeTab, setActiveTab] = useState('overview');
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
    if (!activeFilters.includes('all')) {
      result = result.filter(sale => activeFilters.includes(sale.status));
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
  }, [allSales, activeFilters, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = useMemo(() => ({
    total: allSales.length,
    valorTotal: allSales.reduce((acc, sale) => acc + Number(sale.valor_mensal), 0),
    pendentes: allSales.filter(s => s.status === 'NOVA' || s.status === 'EM_ANALISE' || s.status === 'PENDENCIA').length,
    aprovadas: allSales.filter(s => s.status === 'APROVADA' || s.status === 'INSTALADA').length,
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

  const toggleSelectAll = () => {
    if (selectedSales.length === paginatedSales.length) {
      setSelectedSales([]);
    } else {
      setSelectedSales(paginatedSales.map(s => s.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedSales(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const removeFilter = (filter: string) => {
    if (filter === 'all') return;
    setActiveFilters(prev => {
      const newFilters = prev.filter(f => f !== filter);
      return newFilters.length === 0 ? ['all'] : newFilters;
    });
  };

  const getProgressValue = (sale: Sale) => {
    const statusOrder: SaleStatus[] = ['NOVA', 'EM_ANALISE', 'PENDENCIA', 'APROVADA', 'INSTALADA'];
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Clientes</h1>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Exportar
            </Button>
            <Button 
              onClick={() => navigate('/vendas')}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <span className="text-lg leading-none">+</span>
              Adicionar Cliente
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-transparent border-b border-border rounded-none h-auto p-0 gap-6">
            <TabsTrigger 
              value="overview"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none pb-3 px-0"
            >
              Visão Geral
            </TabsTrigger>
            <TabsTrigger 
              value="table"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none pb-3 px-0"
            >
              Tabela
            </TabsTrigger>
            <TabsTrigger 
              value="list"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none pb-3 px-0"
            >
              Lista
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Customers */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Clientes</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/vendas')}>Ver todos</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold text-foreground">{stats.total.toLocaleString('pt-BR')}</span>
              <div className="flex items-center gap-1 text-emerald-500 text-sm font-medium">
                <TrendingUp className="h-4 w-4" />
                <span>20%</span>
              </div>
            </div>
          </motion.div>

          {/* Members */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Aprovados</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/vendas?status=APROVADA')}>Ver aprovados</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold text-foreground">{stats.aprovadas.toLocaleString('pt-BR')}</span>
              <div className="flex items-center gap-1 text-emerald-500 text-sm font-medium">
                <TrendingUp className="h-4 w-4" />
                <span>15%</span>
              </div>
            </div>
          </motion.div>

          {/* Active Now */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Equipe Ativa</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/usuarios')}>Ver equipe</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold text-foreground">{sellers.length}</span>
              <div className="flex -space-x-2">
                {sellers.slice(0, 4).map((seller, idx) => (
                  <Avatar key={idx} className="h-8 w-8 border-2 border-card">
                    <AvatarImage src={seller.avatar_url || ''} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {getInitials(seller.nome)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {sellers.length > 4 && (
                  <div className="h-8 w-8 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground font-medium">+{sellers.length - 4}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Active Filter Chips */}
            <Badge 
              variant={activeFilters.includes('all') ? 'default' : 'outline'}
              className="cursor-pointer gap-1.5 px-3 py-1.5"
              onClick={() => setActiveFilters(['all'])}
            >
              Todos
              {activeFilters.includes('all') && activeFilters.length === 1 && (
                <X className="h-3 w-3" />
              )}
            </Badge>
            
            {!activeFilters.includes('all') && activeFilters.map(filter => (
              <Badge 
                key={filter}
                variant="outline"
                className="cursor-pointer gap-1.5 px-3 py-1.5 bg-primary/5"
              >
                {STATUS_BADGE_STYLES[filter as SaleStatus]?.label || filter}
                <X 
                  className="h-3 w-3 hover:text-destructive" 
                  onClick={() => removeFilter(filter)}
                />
              </Badge>
            ))}

            <Button variant="outline" size="sm" className="gap-2 h-8">
              <SlidersHorizontal className="h-4 w-4" />
              Mais Filtros
            </Button>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
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
            <div className="col-span-4 flex items-center gap-3">
              <Checkbox 
                checked={selectedSales.length === paginatedSales.length && paginatedSales.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                Empresa
                <ChevronRight className="h-3 w-3 rotate-90" />
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</span>
            </div>
            <div className="col-span-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sobre</span>
            </div>
            <div className="col-span-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Equipe</span>
            </div>
            <div className="col-span-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Progresso</span>
            </div>
            <div className="col-span-1"></div>
          </div>

          {/* Table Body */}
          {paginatedSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Building2 className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum cliente encontrado</p>
              <p className="text-sm mt-1">Tente ajustar os filtros ou adicione um novo cliente.</p>
              <Button onClick={() => navigate('/vendas')} className="mt-4">
                Adicionar Cliente
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {paginatedSales.map((sale, index) => {
                const statusStyle = STATUS_BADGE_STYLES[sale.status];
                const isSelected = selectedSales.includes(sale.id);
                
                return (
                  <motion.div
                    key={sale.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-muted/50 transition-colors cursor-pointer",
                      isSelected && "bg-primary/5"
                    )}
                    onClick={() => navigate('/vendas')}
                  >
                    {/* Company */}
                    <div className="col-span-4 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(sale.id)}
                      />
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

                    {/* About */}
                    <div className="col-span-3">
                      <p className="text-sm font-medium text-foreground truncate">
                        {sale.produtos || 'Produto não definido'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {formatCurrency(Number(sale.valor_mensal))}/mês
                      </p>
                    </div>

                    {/* Team Avatars */}
                    <div className="col-span-1">
                      <div className="flex -space-x-2">
                        {sellers.slice(0, 3).map((seller, idx) => (
                          <Avatar key={idx} className="h-7 w-7 border-2 border-card">
                            <AvatarImage src={seller.avatar_url || ''} />
                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                              {getInitials(seller.nome)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {sellers.length > 3 && (
                          <div className="h-7 w-7 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                            <span className="text-[9px] text-muted-foreground">+{sellers.length - 3}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="col-span-1">
                      <Progress value={getProgressValue(sale)} className="h-2 w-16" />
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Pencil className="h-4 w-4" />
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
      </div>

      {/* Floating Chat Button */}
      <FloatingChatButton />
    </Layout>
  );
};

export default Dashboard;
