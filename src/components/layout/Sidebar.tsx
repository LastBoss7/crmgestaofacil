import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  UserCircle,
  Bell,
  Search,
  MessageSquare,
  BarChart3,
  Activity,
  Clock,
  ShieldCheck,
  MessageSquareText,
  Wifi
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
  } = useAuth();
  
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { isOnline, onlineCount, sessionDuration } = usePresence();
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
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Vendas', href: '/vendas', icon: ShoppingBag, badge: salesStats.total > 0 ? salesStats.total : undefined },
    { name: 'Relatórios', href: '/relatorios', icon: PieChart },
    { name: 'Banda Larga', href: '/relatorios/banda-larga', icon: Wifi },
  ];

  const managementNavigation = [
    ...(canManageUsers ? [{ name: 'Usuários', href: '/usuarios', icon: Users2 }] : []),
    ...(isCEO || isBackoffice ? [{ name: 'Equipes', href: '/equipes', icon: Users2 }] : []),
    ...(isBackoffice ? [{ name: 'Minha Equipe', href: '/minha-equipe', icon: BarChart3 }] : []),
    ...(isCEO || isBackoffice ? [{ name: 'Monitoramento', href: '/monitoramento', icon: Activity }] : []),
    ...(isCEO || isBackoffice ? [{ name: 'Pausas', href: '/pausas', icon: Clock }] : []),
    { name: 'Feedbacks', href: '/feedbacks', icon: MessageSquareText, badge: unreadFeedbacksCount > 0 ? unreadFeedbacksCount : undefined },
    ...(isCEO ? [{ name: 'Monitor Chats', href: '/monitor-chats', icon: MessageSquare }] : []),
    ...(isCEO ? [{ name: 'Convites', href: '/equipe/convites', icon: UserPlus2 }] : []),
    ...(isCEO ? [{ name: 'Configurações', href: '/configuracoes', icon: Cog }] : []),
    ...(isSuperAdmin ? [{ name: 'Admin', href: '/admin', icon: ShieldCheck }] : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleClick = (name: string) => {
    setClickedItem(name);
    setTimeout(() => setClickedItem(null), 200);
  };

  type NavItemType = { name: string; href: string; icon: typeof LayoutDashboard; badge?: number };
  
  const NavItem = ({ item }: { item: NavItemType }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    const isClicked = clickedItem === item.name;
    
    return (
      <Link
        to={item.href}
        onClick={() => handleClick(item.name)}
        className={cn(
          'group relative flex flex-col items-center justify-center w-10 h-10 rounded-lg transition-all duration-200',
          active 
            ? 'bg-primary/10 text-primary' 
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          isClicked && 'scale-95'
        )}
      >
        <div className="relative">
          <Icon className={cn(
            'w-4 h-4 transition-all duration-200',
            active && 'text-primary'
          )} strokeWidth={1.5} />
          
          {item.badge && item.badge > 0 && (
            <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] flex items-center justify-center text-[8px] font-medium bg-primary text-white rounded-full px-0.5">
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </div>
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
    icon: typeof LayoutDashboard; 
    label: string; 
    onClick?: () => void;
    href?: string;
    active?: boolean;
    variant?: 'default' | 'danger' | 'primary';
  }) => {
    const content = (
      <div
        className={cn(
          'group flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 cursor-pointer',
          variant === 'danger' && 'hover:bg-destructive/10 hover:text-destructive',
          variant === 'primary' && 'bg-gradient-to-br from-violet-500 to-purple-600 text-white hover:from-violet-400 hover:to-purple-500 shadow-sm',
          variant === 'default' && (active 
            ? 'bg-primary/10 text-primary' 
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50')
        )}
        onClick={onClick}
      >
        <Icon className="w-4 h-4" strokeWidth={1.5} />
      </div>
    );

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {href ? <Link to={href}>{content}</Link> : content}
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="text-xs font-medium">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={100}>
      <aside className="flex flex-col items-center w-14 min-h-screen py-2 bg-card/80 backdrop-blur-xl border-r border-border/50 overflow-y-auto">
        {/* Logo */}
        <Link to="/dashboard" className="mb-2 shrink-0">
          <img 
            src={logo} 
            alt="Logo" 
            className="w-7 h-7 object-contain opacity-90 hover:opacity-100 transition-opacity"
          />
        </Link>

        {/* New Sale Button */}
        <div className="mb-2 shrink-0">
          <IconButton icon={Plus} label="Nova Venda" href="/vendas" variant="primary" />
        </div>

        {/* Divider */}
        <div className="w-6 h-px bg-border/50 mb-2 shrink-0" />

        {/* Main Navigation */}
        <nav className="flex flex-col items-center gap-1 shrink-0">
          {mainNavigation.map((item) => (
            <Tooltip key={item.name}>
              <TooltipTrigger asChild>
                <div><NavItem item={item} /></div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8} className="text-xs font-medium">
                {item.name}
              </TooltipContent>
            </Tooltip>
          ))}
        </nav>
        
        {managementNavigation.length > 0 && (
          <>
            <div className="w-6 h-px bg-border/50 my-2 shrink-0" />
            <nav className="flex flex-col items-center gap-1 shrink-0">
              {managementNavigation.map((item) => (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>
                    <div><NavItem item={item} /></div>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8} className="text-xs font-medium">
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              ))}
            </nav>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1 min-h-4" />

        {/* Secondary Actions */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="group flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/50"
                onClick={() => navigate('/vendas?search=true')}
              >
                <Search className="w-4 h-4" strokeWidth={1.5} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="text-xs font-medium">
              Buscar vendas
            </TooltipContent>
          </Tooltip>
          
          <Popover>
            <PopoverTrigger asChild>
              <div className="relative">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="group flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    >
                      <Bell className="w-4 h-4" strokeWidth={1.5} />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center text-[8px] font-medium bg-primary text-white rounded-full px-0.5">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8} className="text-xs font-medium">
                    Notificações {unreadCount > 0 && `(${unreadCount})`}
                  </TooltipContent>
                </Tooltip>
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
        <div className="w-6 h-px bg-border/50 my-2 shrink-0" />

        {/* Profile */}
        <div className="shrink-0">
          <IconButton 
            icon={UserCircle} 
            label="Meu Perfil" 
            href="/perfil" 
            active={isActive('/perfil')}
          />
        </div>

        {/* User Avatar */}
        <OnlineUsersDrawer>
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
            <TooltipContent side="right" sideOffset={8} className="text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{profile?.nome || 'Usuário'}</span>
                <span className="text-muted-foreground">{role ? ROLE_LABELS[role] : ''}</span>
              </div>
            </TooltipContent>
          </Tooltip>
        </OnlineUsersDrawer>

        {/* Divider */}
        <div className="w-6 h-px bg-border/50 my-2 shrink-0" />

        {/* Logout */}
        <div className="shrink-0">
          <IconButton icon={LogOut} label="Sair" onClick={signOut} variant="danger" />
        </div>
      </aside>
    </TooltipProvider>
  );
};

export default Sidebar;