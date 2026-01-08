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
  UserCircle,
  Bell,
  Search,
  HelpCircle,
  Sparkles
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
  ];

  const managementNavigation = [
    ...(canManageUsers ? [{ name: 'Usuários', href: '/usuarios', icon: Users2 }] : []),
    ...(isCEO ? [{ name: 'Convites', href: '/equipe/convites', icon: UserPlus2 }] : []),
    ...(isCEO ? [{ name: 'Configurações', href: '/configuracoes', icon: Cog }] : []),
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
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={item.href}
            onClick={() => handleClick(item.name)}
            className={cn(
              'group relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150',
              active 
                ? 'bg-primary/10 text-primary' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              isClicked && 'scale-90'
            )}
          >
            <Icon className={cn(
              'w-[18px] h-[18px] transition-all duration-150',
              active && 'text-primary'
            )} strokeWidth={1.5} />
            
            {item.badge && item.badge > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center text-[9px] font-medium bg-primary text-white rounded-full px-0.5">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="text-xs font-medium">
          <div className="flex items-center gap-1.5">
            {item.name}
            {item.badge && item.badge > 0 && (
              <span className="px-1 py-0.5 text-[9px] bg-primary/10 text-primary rounded">
                {item.badge}
              </span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
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
          'group flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 cursor-pointer',
          variant === 'danger' && 'hover:bg-destructive/10 hover:text-destructive',
          variant === 'primary' && 'bg-gradient-to-br from-violet-500 to-purple-600 text-white hover:from-violet-400 hover:to-purple-500 shadow-sm shadow-purple-500/20',
          variant === 'default' && (active 
            ? 'bg-primary/10 text-primary' 
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50')
        )}
        onClick={onClick}
      >
        <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
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
      <aside className="flex flex-col items-center w-12 py-3 bg-card/80 backdrop-blur-xl border-r border-border/50">
        {/* Logo */}
        <Link to="/dashboard" className="mb-3">
          <img 
            src={logo} 
            alt="Logo" 
            className="w-7 h-7 object-contain opacity-90 hover:opacity-100 transition-opacity"
          />
        </Link>

        {/* New Sale Button */}
        <div className="mb-3">
          <IconButton icon={Plus} label="Nova Venda" href="/vendas" variant="primary" />
        </div>

        {/* Thin Divider */}
        <div className="w-5 h-px bg-border/60 mb-3" />

        {/* Main Navigation */}
        <nav className="flex-1 flex flex-col items-center gap-0.5">
          {mainNavigation.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
          
          {managementNavigation.length > 0 && (
            <div className="w-5 h-px bg-border/60 my-2" />
          )}
          
          {managementNavigation.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Secondary Actions */}
          <div className="flex flex-col items-center gap-0.5 mt-2">
            <IconButton icon={Search} label="Buscar" onClick={() => {}} />
            <IconButton icon={Bell} label="Notificações" onClick={() => {}} />
            <IconButton icon={HelpCircle} label="Ajuda" onClick={() => {}} />
          </div>
        </nav>

        {/* Thin Divider */}
        <div className="w-5 h-px bg-border/60 my-2" />

        {/* Profile */}
        <IconButton 
          icon={UserCircle} 
          label="Meu Perfil" 
          href="/perfil" 
          active={isActive('/perfil')}
        />

        {/* User Avatar */}
        <OnlineUsersDrawer>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative group cursor-pointer mt-1.5">
                <Avatar className="w-7 h-7 ring-1 ring-border/50 group-hover:ring-primary/30 transition-all duration-150">
                  <AvatarImage src={profile?.avatar_url || ''} alt={profile?.nome || 'Usuário'} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-medium">
                    {profile?.nome?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span 
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-2 h-2 border border-card rounded-full transition-colors",
                    isOnline ? "bg-emerald-500" : "bg-muted-foreground"
                  )} 
                />
                {onlineCount > 1 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[12px] h-[12px] flex items-center justify-center text-[8px] font-medium bg-primary text-white rounded-full px-0.5">
                    {onlineCount}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{profile?.nome || 'Usuário'}</span>
                <span className="text-muted-foreground">{role ? ROLE_LABELS[role] : ''}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isOnline ? "bg-emerald-500" : "bg-muted-foreground"
                  )} />
                  <span className={isOnline ? "text-emerald-500" : "text-muted-foreground"}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
                {onlineCount > 1 && (
                  <span className="text-primary text-[10px] mt-0.5">
                    {onlineCount} online
                  </span>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </OnlineUsersDrawer>

        {/* Thin Divider */}
        <div className="w-5 h-px bg-border/60 my-2" />

        {/* Logout */}
        <IconButton icon={LogOut} label="Sair" onClick={signOut} variant="danger" />
      </aside>
    </TooltipProvider>
  );
};

export default Sidebar;