import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Sale, SaleStatus, SALE_STATUS_LABELS, Profile } from '@/types/database';
import { 
  ShoppingCart, 
  TrendingUp,
  Users,
  FileText,
  Clock,
  ChevronRight,
  Star,
  MoreHorizontal,
  Folder,
  ArrowRight,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { FloatingChatButton } from '@/components/chat/FloatingChatButton';
import { useSalesNotifications } from '@/hooks/useSalesNotifications';
import { motion } from 'framer-motion';

interface SellerStats {
  id: string;
  nome: string;
  totalVendas: number;
  valorTotal: number;
  aprovadas: number;
}

const STATUS_COLORS: Record<SaleStatus, string> = {
  NOVA: 'bg-blue-500',
  EM_ANALISE: 'bg-amber-500',
  PENDENCIA: 'bg-orange-500',
  APROVADA: 'bg-emerald-500',
  INSTALADA: 'bg-violet-500',
  CANCELADA: 'bg-gray-500',
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isSeller, isCEO, isBackoffice } = useAuth();
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [sellers, setSellers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [starredFolders, setStarredFolders] = useState<string[]>([]);

  // Ativar notificações de vendas
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

  const sales = allSales;

  const stats = useMemo(() => ({
    total: sales.length,
    valorTotal: sales.reduce((acc, sale) => acc + Number(sale.valor_mensal), 0),
    pendentes: sales.filter(s => s.status === 'NOVA' || s.status === 'EM_ANALISE' || s.status === 'PENDENCIA').length,
    aprovadas: sales.filter(s => s.status === 'APROVADA' || s.status === 'INSTALADA').length,
  }), [sales]);

  const recentSales = sales.slice(0, 4);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diff = Math.floor((now.getTime() - past.getTime()) / 1000 / 60);
    
    if (diff < 60) return `${diff}m atrás`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h atrás`;
    return `${Math.floor(diff / 1440)}d atrás`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  // Shared folders data with navigation
  const sharedFolders = [
    { name: 'Vendas Aprovadas', color: 'from-emerald-500 to-teal-600', count: stats.aprovadas, users: sellers.slice(0, 3), filter: 'APROVADA' },
    { name: 'Em Análise', color: 'from-amber-500 to-orange-500', count: stats.pendentes, users: sellers.slice(0, 2), filter: 'EM_ANALISE' },
    { name: 'Relatórios', color: 'from-primary to-pink-600', count: 12, users: sellers.slice(0, 4), href: '/relatorios' },
  ];

  const toggleStar = (folderName: string) => {
    setStarredFolders(prev => 
      prev.includes(folderName) 
        ? prev.filter(f => f !== folderName)
        : [...prev, folderName]
    );
  };

  const handleFolderClick = (folder: typeof sharedFolders[0]) => {
    if (folder.href) {
      navigate(folder.href);
    } else if (folder.filter) {
      navigate(`/vendas?status=${folder.filter}`);
    }
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
      <div className="space-y-8 animate-fade-in max-w-6xl">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Dashboard</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          <span className="text-muted-foreground">Overview</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          <span className="text-foreground">Atividade Recente</span>
        </div>

        {/* Recent Edited Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Editados Recentemente</h2>
            <button 
              onClick={() => navigate('/vendas')}
              className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors group"
            >
              Ver tudo
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentSales.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">Nenhuma venda recente</p>
                <button 
                  onClick={() => navigate('/vendas')}
                  className="mt-3 text-sm text-primary hover:underline"
                >
                  Cadastrar primeira venda
                </button>
              </div>
            ) : (
              recentSales.map((sale, index) => (
                <motion.div 
                  key={sale.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => navigate('/vendas')}
                  className="bg-card border border-border rounded-2xl p-5 hover:bg-accent/50 transition-all duration-200 cursor-pointer group card-hover"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <button 
                      onClick={(e) => e.stopPropagation()}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-accent"
                    >
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                  <h3 className="text-sm font-medium text-foreground truncate mb-1">
                    {sale.nome_fantasia || sale.razao_social}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Editado {formatTimeAgo(sale.updated_at || sale.created_at)}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", STATUS_COLORS[sale.status])} />
                    <span className="text-xs text-muted-foreground">{SALE_STATUS_LABELS[sale.status]}</span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Shared Folders Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Pastas Compartilhadas</h2>
            <button 
              onClick={() => navigate('/vendas')}
              className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors group"
            >
              Ver tudo
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sharedFolders.map((folder, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleFolderClick(folder)}
                className="bg-card border border-border rounded-2xl p-5 hover:bg-accent/50 transition-all duration-200 cursor-pointer group card-hover"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn("p-3 rounded-xl bg-gradient-to-br", folder.color)}>
                    <Folder className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStar(folder.name);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-accent"
                  >
                    <Star className={cn(
                      "h-4 w-4 transition-colors",
                      starredFolders.includes(folder.name) 
                        ? "text-amber-500 fill-amber-500" 
                        : "text-muted-foreground"
                    )} />
                  </button>
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1">{folder.name}</h3>
                <p className="text-xs text-muted-foreground mb-3">{folder.count} itens</p>
                
                {/* User avatars */}
                <div className="flex -space-x-2">
                  {folder.users.slice(0, 3).map((user, idx) => (
                    <Avatar key={idx} className="h-7 w-7 border-2 border-card">
                      <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary to-emerald-500 text-primary-foreground">
                        {getInitials(user.nome)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {folder.users.length > 3 && (
                    <div className="h-7 w-7 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                      <span className="text-[10px] text-muted-foreground">+{folder.users.length - 3}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent Files Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Arquivos Recentes</h2>
            <button 
              onClick={() => navigate('/vendas')}
              className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors group"
            >
              Ver tudo
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span>Nome do Arquivo</span>
              <span>Proprietário</span>
              <span className="text-right">Data de Upload</span>
            </div>
            
            {/* Table Body */}
            {sales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-10 w-10 mb-3 opacity-50" />
                <p className="text-sm">Nenhum arquivo encontrado</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {sales.slice(0, 6).map((sale, index) => (
                  <motion.div 
                    key={sale.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => navigate('/vendas')}
                    className="grid grid-cols-3 gap-4 px-6 py-4 items-center hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground truncate">
                          {sale.nome_fantasia || sale.razao_social}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(Number(sale.valor_mensal))}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="flex -space-x-2">
                        <Avatar className="h-6 w-6 border-2 border-card">
                          <AvatarFallback className="text-[9px] bg-gradient-to-br from-primary to-emerald-500 text-primary-foreground">
                            {profile?.nome ? getInitials(profile.nome) : 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards at Bottom */}
        {(isCEO || isBackoffice) && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-2xl p-5 card-hover">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Total Vendas</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </div>
            
            <div className="bg-card border border-border rounded-2xl p-5 card-hover">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                </div>
                <span className="text-sm text-muted-foreground">Aprovadas</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.aprovadas}</p>
            </div>
            
            <div className="bg-card border border-border rounded-2xl p-5 card-hover">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <span className="text-sm text-muted-foreground">Pendentes</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.pendentes}</p>
            </div>
            
            <div className="bg-card border border-border rounded-2xl p-5 card-hover">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <span className="text-sm text-muted-foreground">Equipe</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{sellers.length}</p>
            </div>
          </div>
        )}

      </div>

      {/* Botão flutuante do chat */}
      <FloatingChatButton />
    </Layout>
  );
};

export default Dashboard;
