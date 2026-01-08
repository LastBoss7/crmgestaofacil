import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users2, 
  LogOut, 
  PieChart, 
  UserPlus2, 
  Cog,
  Plus,
  UserCircle
} from 'lucide-react';
import { ROLE_LABELS } from '@/types/database';
import { useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePresence } from '@/hooks/usePresence';
import { OnlineUsersDrawer } from '@/components/presence/OnlineUsersDrawer';
import logo from '@/assets/logo.png';

interface SalesStats {
  total: number;
  preAnalise: number;
  aguardandoAuditoria: number;
  pendencia: number;
  vendaAuditada: number;
  instalacaoMarcada: number;
  instaladas: number;
  canceladas: number;
}

const Sidebar = () => {
  const location = useLocation();
  const [salesStats, setSalesStats] = useState<SalesStats>({
    total: 0,
    preAnalise: 0,
    aguardandoAuditoria: 0,
    pendencia: 0,
    vendaAuditada: 0,
    instalacaoMarcada: 0,
    instaladas: 0,
    canceladas: 0,
  });
  const [clickedItem, setClickedItem] = useState<string | null>(null);
  const {
    profile,
    user,
    role,
    signOut,
    canManageUsers,
    isCEO,
  } = useAuth();
  
  const { isOnline, onlineCount, sessionDuration } = usePresence();

  // Fetch real sales stats from database
  useEffect(() => {
    const fetchSalesStats = async () => {
      if (!user) return;
      
      const { data: sales } = await supabase
        .from('sales')
        .select('status');
      
      if (sales) {
        setSalesStats({
          total: sales.length,
          preAnalise: sales.filter(s => s.status === 'PRE_ANALISE').length,
          aguardandoAuditoria: sales.filter(s => s.status === 'AGUARDANDO_AUDITORIA').length,
          pendencia: sales.filter(s => s.status === 'PENDENCIA').length,
          vendaAuditada: sales.filter(s => s.status === 'VENDA_AUDITADA').length,
          instalacaoMarcada: sales.filter(s => s.status === 'INSTALACAO_MARCADA').length,
          instaladas: sales.filter(s => s.status === 'INSTALADA').length,
          canceladas: sales.filter(s => s.status === 'CANCELADA').length,
        });
      }
    };
    
    fetchSalesStats();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('sales-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        fetchSalesStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const mainNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Vendas', href: '/vendas', icon: ShoppingBag, badge: salesStats.total > 0 ? salesStats.total : undefined },
    { name: 'Relatórios', href: '/relatorios', icon: PieChart },
  ];

  const managementNavigation = [
    ...(canManageUsers ? [{ name: 'Usuários', href: '/usuarios', icon: Users2 }] : []),
    ...(isCEO ? [{ name: 'Convites', href: '/equipe/convites', icon: UserPlus2 }] : []),
    ...(isCEO ? [{ name: 'Configurações', href: '/configuracoes', icon: Cog }] : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleClick = (name: string) => {
    setClickedItem(name);
    setTimeout(() => setClickedItem(null), 300);
  };

  type NavItemType = { name: string; href: string; icon: typeof LayoutDashboard; badge?: number };
  
  const NavItem = ({ item }: { item: NavItemType }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    const isClicked = clickedItem === item.name;
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={item.href}
            onClick={() => handleClick(item.name)}
            className={cn(
              'group relative flex items-center justify-center w-10 h-10 lg:w-11 lg:h-11 rounded-xl transition-all duration-200',
              active 
                ? 'bg-primary/15' 
                : 'hover:bg-muted',
              isClicked && 'scale-95'
            )}
          >
            {/* Active indicator - green bar on left */}
            {active && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
            )}
            
            {/* Ping effect on click */}
            {isClicked && (
              <span className="absolute inset-0 rounded-xl animate-ping bg-primary/20" />
            )}
            
            {/* Pulse animation for active */}
            {active && (
              <span className="absolute inset-0 rounded-xl animate-pulse bg-primary/5" />
            )}
            
            <Icon className={cn(
              'w-4 h-4 lg:w-5 lg:h-5 transition-all duration-200',
              active 
                ? 'text-primary' 
                : 'text-muted-foreground group-hover:text-foreground group-hover:scale-110'
            )} />
            
            {/* Badge */}
            {item.badge && item.badge > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-semibold bg-primary text-primary-foreground rounded-full px-1">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-card text-card-foreground border-border font-medium">
          <div className="flex items-center gap-2">
            {item.name}
            {item.badge && item.badge > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full">
                {item.badge}
              </span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col items-center w-14 lg:w-16 h-screen py-4 bg-card rounded-2xl lg:rounded-3xl shadow-sm border border-border m-2">
        {/* Logo */}
        <Link to="/dashboard" className="mb-2">
          <img 
            src={logo} 
            alt="Logo" 
            className="w-10 h-10 lg:w-11 lg:h-11 object-contain hover:scale-105 transition-transform"
          />
        </Link>

        {/* New Sale Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/vendas"
              className="flex items-center justify-center w-10 h-10 lg:w-11 lg:h-11 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-200 hover:scale-105 active:scale-95 mb-4"
            >
              <Plus className="w-5 h-5 lg:w-6 lg:h-6" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-card text-card-foreground border-border font-medium">
            Nova Venda
          </TooltipContent>
        </Tooltip>

        {/* Divider */}
        <div className="w-6 h-px bg-border mb-4" />

        {/* Main Navigation */}
        <nav className="flex-1 flex flex-col items-center gap-1">
          {mainNavigation.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
          
          {/* Divider if management items exist */}
          {managementNavigation.length > 0 && (
            <div className="w-6 h-px bg-border my-3" />
          )}
          
          {/* Management Navigation */}
          {managementNavigation.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
        </nav>

        {/* Divider */}
        <div className="w-6 h-px bg-border my-3" />

        {/* User Avatar with Online Status */}
        {/* Profile Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/perfil"
              onClick={() => handleClick('Perfil')}
              className={cn(
                'group relative flex items-center justify-center w-10 h-10 lg:w-11 lg:h-11 rounded-xl transition-all duration-200',
                isActive('/perfil') 
                  ? 'bg-primary/15' 
                  : 'hover:bg-muted'
              )}
            >
              {isActive('/perfil') && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
              )}
              <UserCircle className={cn(
                'w-4 h-4 lg:w-5 lg:h-5 transition-all duration-200',
                isActive('/perfil') 
                  ? 'text-primary' 
                  : 'text-muted-foreground group-hover:text-foreground group-hover:scale-110'
              )} />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-card text-card-foreground border-border font-medium">
            Meu Perfil
          </TooltipContent>
        </Tooltip>

        {/* User Avatar with Online Status - Opens Drawer */}
        <OnlineUsersDrawer>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative group cursor-pointer mt-2">
                <Avatar className="w-9 h-9 lg:w-10 lg:h-10 ring-2 ring-border group-hover:ring-primary/50 transition-all duration-200">
                  <AvatarImage src={profile?.avatar_url || ''} alt={profile?.nome || 'Usuário'} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs lg:text-sm font-medium">
                    {profile?.nome?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                {/* Online Status Indicator - Real-time */}
                <span 
                  className={cn(
                    "absolute bottom-0 right-0 w-2.5 h-2.5 lg:w-3 lg:h-3 border-2 border-card rounded-full transition-colors",
                    isOnline 
                      ? "bg-emerald-500 animate-pulse" 
                      : "bg-muted-foreground"
                  )} 
                />
                {/* Online count badge */}
                {onlineCount > 1 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-semibold bg-primary text-primary-foreground rounded-full px-1">
                    {onlineCount}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-card text-card-foreground border-border">
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-foreground">{profile?.nome || 'Usuário'}</span>
                <span className="text-xs text-muted-foreground">{role ? ROLE_LABELS[role] : 'Carregando...'}</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    isOnline ? "bg-emerald-500" : "bg-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-xs",
                    isOnline ? "text-emerald-500" : "text-amber-500"
                  )}>
                    {isOnline ? 'Online' : 'Entrando...'}
                  </span>
                </div>
                {isOnline && (
                  <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">
                      ⏱️ Na plataforma há {sessionDuration}
                    </span>
                  </div>
                )}
                {onlineCount > 1 && (
                  <span className="text-xs text-primary mt-1">
                    Clique para ver {onlineCount} usuários online
                  </span>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </OnlineUsersDrawer>

        {/* Divider */}
        <div className="w-6 h-px bg-border my-3" />

        {/* Logout Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={signOut}
              className="group flex items-center justify-center w-10 h-10 lg:w-11 lg:h-11 rounded-xl transition-all duration-200 hover:bg-destructive/10 active:scale-95"
            >
              <LogOut className="w-4 h-4 lg:w-5 lg:h-5 text-muted-foreground group-hover:text-destructive transition-colors" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-card text-card-foreground border-border font-medium">
            Sair
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default Sidebar;
