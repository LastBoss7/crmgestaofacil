import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { 
  LayoutGrid, 
  Receipt, 
  Users, 
  LogOut, 
  BarChart2, 
  Settings,
  PlusCircle,
  User,
  Bell,
  Search,
  MessageCircle,
  TrendingUp,
  Gauge,
  Timer,
  ShieldCheck,
  MessageSquareMore,
  Radio,
  Megaphone,
  Phone,
  Award,
  ChevronLeft,
  ChevronRight,
  UsersRound
} from 'lucide-react';
import { ROLE_LABELS } from '@/types/database';
import { useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePresence } from '@/hooks/usePresence';
import { OnlineUsersDrawer } from '@/components/presence/OnlineUsersDrawer';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useNotifications } from '@/hooks/useNotifications';
import { useUnreadFeedbacks } from '@/hooks/useUnreadFeedbacks';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useSidebarCollapse } from '@/hooks/useSidebarCollapse';
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
  const navigate = useNavigate();
  const { isCollapsed, toggle } = useSidebarCollapse();
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
    isBackoffice,
    isSupervisor,
  } = useAuth();
  
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { isOnline } = usePresence();
  const { isSuperAdmin } = useSuperAdmin();
  const { unreadCount: unreadFeedbacksCount } = useUnreadFeedbacks();

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
    { name: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
    { name: 'Vendas', href: '/vendas', icon: Receipt, badge: salesStats.total > 0 ? salesStats.total : undefined },
    { name: 'Campanhas', href: '/campanhas', icon: Megaphone },
    { name: 'Rankings', href: '/rankings', icon: Award },
    { name: 'Retornos', href: '/retornos', icon: Phone },
    { name: 'Relatórios', href: '/relatorios', icon: BarChart2 },
    { name: 'Banda Larga', href: '/relatorios/banda-larga', icon: Radio },
  ];

  const managementNavigation = [
    ...(canManageUsers ? [{ name: 'Usuários', href: '/usuarios', icon: Users }] : []),
    ...(isCEO || isSupervisor ? [{ name: 'Equipes', href: '/equipes', icon: UsersRound }] : []),
    ...(isCEO || isSupervisor ? [{ name: 'Relatório Equipes', href: '/relatorio-equipes', icon: TrendingUp }] : []),
    ...(isSupervisor ? [{ name: 'Minha Equipe', href: '/minha-equipe', icon: TrendingUp }] : []),
    ...(isCEO || isSupervisor || isBackoffice ? [{ name: 'Monitoramento', href: '/monitoramento', icon: Gauge }] : []),
    ...(isCEO || isSupervisor ? [{ name: 'Pausas', href: '/pausas', icon: Timer }] : []),
    { name: 'Feedbacks', href: '/feedbacks', icon: MessageSquareMore, badge: unreadFeedbacksCount > 0 ? unreadFeedbacksCount : undefined },
    ...(isCEO ? [{ name: 'Monitor Chats', href: '/monitor-chats', icon: MessageCircle }] : []),
    ...(isCEO ? [{ name: 'Configurações', href: '/configuracoes', icon: Settings }] : []),
    ...(isSuperAdmin ? [{ name: 'Admin', href: '/admin', icon: ShieldCheck }] : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleClick = (name: string) => {
    setClickedItem(name);
    setTimeout(() => setClickedItem(null), 200);
  };

  type NavItemType = { name: string; href: string; icon: typeof LayoutGrid; badge?: number };
  
  const NavItem = ({ item }: { item: NavItemType }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    const isClicked = clickedItem === item.name;
    
    return (
      <Link
        to={item.href}
        onClick={() => handleClick(item.name)}
        className={cn(
          'group relative flex items-center gap-3 rounded-xl transition-all duration-300 ease-premium',
          isCollapsed ? 'w-10 h-10 justify-center' : 'w-full h-10 px-3',
          active 
            ? 'bg-primary/10 text-primary shadow-sm' 
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
          isClicked && 'scale-95'
        )}
      >
        <div className="relative flex-shrink-0 transition-transform duration-300">
          <Icon className={cn(
            'w-[18px] h-[18px] transition-all duration-300',
            active && 'text-primary',
            'group-hover:scale-110'
          )} strokeWidth={1.75} />
          
          {item.badge && item.badge > 0 && isCollapsed && (
            <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-semibold bg-primary text-primary-foreground rounded-full px-1 shadow-sm transition-transform duration-300">
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </div>
        
        <span className={cn(
          "text-sm font-medium truncate transition-all duration-300",
          isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
        )}>
          {item.name}
        </span>
        
        {!isCollapsed && item.badge && item.badge > 0 && (
          <span className="ml-auto min-w-[20px] h-[20px] flex items-center justify-center text-[10px] font-semibold bg-primary text-primary-foreground rounded-full px-1.5 transition-opacity duration-300">
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </Link>
    );
  };

  const IconButton = ({ 
    icon: Icon, 
    label, 
    onClick, 
    href,
    active,
    variant = 'default'
  }: { 
    icon: typeof LayoutGrid; 
    label: string; 
    onClick?: () => void;
    href?: string;
    active?: boolean;
    variant?: 'default' | 'danger' | 'primary';
  }) => {
    const content = (
      <div
        className={cn(
          'group flex items-center justify-center rounded-xl transition-all duration-200 ease-premium cursor-pointer',
          isCollapsed ? 'w-9 h-9' : 'w-full h-9 px-3 gap-3',
          variant === 'danger' && 'hover:bg-destructive/10 hover:text-destructive',
          variant === 'primary' && 'bg-primary text-primary-foreground shadow-premium hover:shadow-premium-lg hover:bg-primary/90',
          variant === 'default' && (active 
            ? 'bg-primary/10 text-primary' 
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60')
        )}
        onClick={onClick}
      >
        <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
        {!isCollapsed && variant !== 'primary' && (
          <span className="text-sm font-medium truncate">{label}</span>
        )}
      </div>
    );

    if (isCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {href ? <Link to={href}>{content}</Link> : content}
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12} className="text-xs font-medium z-[100] bg-popover border shadow-lg">
            {label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return href ? <Link to={href}>{content}</Link> : content;
  };

  const renderNavItem = (item: NavItemType) => {
    if (isCollapsed) {
      return (
        <Tooltip key={item.name}>
          <TooltipTrigger asChild>
            <div><NavItem item={item} /></div>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12} className="text-xs font-medium z-[100] bg-popover border shadow-lg">
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }
    return <NavItem key={item.name} item={item} />;
  };

  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <aside 
        className={cn(
          "flex flex-col items-center min-h-screen py-3 bg-sidebar backdrop-blur-xl border-r border-sidebar-border shadow-premium-sm overflow-y-auto z-50 transition-all duration-300 ease-premium",
          isCollapsed ? "w-16" : "w-52"
        )}
      >
        {/* Header with Logo and Toggle */}
        <div className={cn(
          "flex items-center mb-2 shrink-0 w-full",
          isCollapsed ? "justify-center px-0" : "justify-between px-3"
        )}>
          <Link to="/dashboard" className="flex items-center gap-2">
            <img 
              src={logo} 
              alt="Logo" 
              className="w-7 h-7 object-contain opacity-90 hover:opacity-100 transition-opacity"
            />
            {!isCollapsed && (
              <span className="text-sm font-semibold text-foreground">CRM</span>
            )}
          </Link>
          
          {!isCollapsed && (
            <button
              onClick={toggle}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {isCollapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggle}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all mb-2"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12} className="text-xs font-medium z-[100] bg-popover border shadow-lg">
              Expandir menu
            </TooltipContent>
          </Tooltip>
        )}

        {/* New Sale Button */}
        <div className={cn("mb-2 shrink-0", isCollapsed ? "" : "w-full px-3")}>
          {isCollapsed ? (
            <IconButton icon={PlusCircle} label="Nova Venda" href="/vendas" variant="primary" />
          ) : (
            <Link
              to="/vendas"
              className="flex items-center justify-center gap-2 w-full h-9 rounded-xl bg-primary text-primary-foreground shadow-premium hover:shadow-premium-lg hover:bg-primary/90 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Nova Venda</span>
            </Link>
          )}
        </div>

        {/* Divider */}
        <div className={cn("h-px bg-border/50 mb-2 shrink-0", isCollapsed ? "w-6" : "w-[calc(100%-24px)]")} />

        {/* Main Navigation */}
        <nav className={cn("flex flex-col gap-1 shrink-0", isCollapsed ? "items-center" : "w-full px-3")}>
          {mainNavigation.map(renderNavItem)}
        </nav>
        
        {managementNavigation.length > 0 && (
          <>
            <div className={cn("h-px bg-border/50 my-2 shrink-0", isCollapsed ? "w-6" : "w-[calc(100%-24px)]")} />
            <nav className={cn("flex flex-col gap-1 shrink-0", isCollapsed ? "items-center" : "w-full px-3")}>
              {managementNavigation.map(renderNavItem)}
            </nav>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1 min-h-4" />

        {/* Secondary Actions */}
        <div className={cn("flex flex-col gap-1 shrink-0", isCollapsed ? "items-center" : "w-full px-3")}>
          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <div className="relative">
                {isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="group flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/50">
                        <Bell className="w-4 h-4 transition-transform duration-300" strokeWidth={1.5} />
                        {unreadCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center text-[8px] font-medium bg-primary text-white rounded-full px-0.5">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={12} className="text-xs font-medium z-[100] bg-popover border shadow-lg">
                      Notificações {unreadCount > 0 && `(${unreadCount})`}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <div className="group flex items-center gap-3 w-full h-8 px-3 rounded-lg transition-all duration-200 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/50">
                    <Bell className="w-4 h-4" strokeWidth={1.5} />
                    <span className="text-sm">Notificações</span>
                    {unreadCount > 0 && (
                      <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center text-[9px] font-medium bg-primary text-white rounded-full px-1">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent side="right" sideOffset={12} className="w-80 p-0">
              <div className="p-3 border-b">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Notificações</h4>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
                      Marcar todas como lidas
                    </Button>
                  )}
                </div>
              </div>
              <ScrollArea className="max-h-[300px]">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Nenhuma notificação
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {notifications.slice(0, 10).map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "p-2 rounded-lg cursor-pointer transition-colors text-sm",
                          notification.read ? "hover:bg-muted/50" : "bg-primary/5 hover:bg-primary/10"
                        )}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <p className={cn("font-medium text-xs", !notification.read && "text-primary")}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {notification.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>

        {/* Divider */}
        <div className={cn("h-px bg-border/50 my-2 shrink-0", isCollapsed ? "w-6" : "w-[calc(100%-24px)]")} />

        {/* Profile */}
        <div className={cn("shrink-0", isCollapsed ? "" : "w-full px-3")}>
          <IconButton 
            icon={User} 
            label="Meu Perfil" 
            href="/perfil" 
            active={isActive('/perfil')}
          />
        </div>

        {/* User Avatar */}
        <OnlineUsersDrawer>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative cursor-pointer mt-1 shrink-0">
                  <Avatar className="w-7 h-7 ring-1 ring-border/50 hover:ring-primary/30 transition-all">
                    <AvatarImage src={profile?.avatar_url || ''} alt={profile?.nome || 'Usuário'} />
                    <AvatarFallback className="bg-muted text-muted-foreground text-[9px] font-medium">
                      {profile?.nome?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span 
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-2 h-2 border border-card rounded-full",
                      isOnline ? "bg-emerald-500" : "bg-muted-foreground"
                    )} 
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12} className="text-xs z-[100] bg-popover border shadow-lg">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{profile?.nome || 'Usuário'}</span>
                  <span className="text-muted-foreground">{role ? ROLE_LABELS[role] : ''}</span>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="relative cursor-pointer mt-1 shrink-0 w-full px-3">
              <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/60 transition-all">
                <div className="relative">
                  <Avatar className="w-8 h-8 ring-1 ring-border/50">
                    <AvatarImage src={profile?.avatar_url || ''} alt={profile?.nome || 'Usuário'} />
                    <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-medium">
                      {profile?.nome?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span 
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-sidebar rounded-full",
                      isOnline ? "bg-emerald-500" : "bg-muted-foreground"
                    )} 
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{profile?.nome || 'Usuário'}</p>
                  <p className="text-xs text-muted-foreground truncate">{role ? ROLE_LABELS[role] : ''}</p>
                </div>
              </div>
            </div>
          )}
        </OnlineUsersDrawer>

        {/* Divider */}
        <div className={cn("h-px bg-border/50 my-2 shrink-0", isCollapsed ? "w-6" : "w-[calc(100%-24px)]")} />

        {/* Logout */}
        <div className={cn("shrink-0", isCollapsed ? "" : "w-full px-3")}>
          <IconButton icon={LogOut} label="Sair" onClick={signOut} variant="danger" />
        </div>
      </aside>
    </TooltipProvider>
  );
};

export default Sidebar;
