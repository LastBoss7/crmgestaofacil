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
      <Link
        to={item.href}
        onClick={() => handleClick(item.name)}
        className={cn(
          'group relative flex flex-col items-center justify-center gap-0.5 w-full py-2 px-1 rounded-xl transition-all duration-200',
          active 
            ? 'bg-primary/10 text-primary' 
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          isClicked && 'scale-95',
          'hover:scale-[1.02] active:scale-95'
        )}
      >
        <div className="relative">
          <Icon className={cn(
            'w-5 h-5 transition-all duration-200',
            active && 'text-primary',
            'group-hover:scale-110'
          )} strokeWidth={1.5} />
          
          {item.badge && item.badge > 0 && (
            <span className="absolute -top-1 -right-1.5 min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-medium bg-primary text-white rounded-full px-0.5">
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </div>
        
        <span className={cn(
          "text-[9px] font-medium transition-all duration-200 text-center leading-tight",
          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )}>
          {item.name}
        </span>
      </Link>
    );
  };

  const IconButton = ({ 
    icon: Icon, 
    label, 
    onClick, 
    href,
    active,
    variant = 'default',
    showLabel = true
  }: { 
    icon: typeof LayoutDashboard; 
    label: string; 
    onClick?: () => void;
    href?: string;
    active?: boolean;
    variant?: 'default' | 'danger' | 'primary';
    showLabel?: boolean;
  }) => {
    const content = (
      <div
        className={cn(
          'group flex flex-col items-center justify-center gap-0.5 w-full py-2 px-1 rounded-xl transition-all duration-200 cursor-pointer',
          'hover:scale-[1.02] active:scale-95',
          variant === 'danger' && 'hover:bg-destructive/10 hover:text-destructive',
          variant === 'primary' && 'bg-gradient-to-br from-violet-500 to-purple-600 text-white hover:from-violet-400 hover:to-purple-500 shadow-sm shadow-purple-500/20 hover:shadow-md hover:shadow-purple-500/30',
          variant === 'default' && (active 
            ? 'bg-primary/10 text-primary' 
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50')
        )}
        onClick={onClick}
      >
        <Icon className={cn(
          "w-5 h-5 transition-all duration-200",
          "group-hover:scale-110"
        )} strokeWidth={1.5} />
        {showLabel && (
          <span className={cn(
            "text-[9px] font-medium transition-all duration-200 text-center leading-tight",
            variant === 'primary' && "text-white/90",
            variant === 'danger' && "group-hover:text-destructive",
            variant === 'default' && (active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")
          )}>
            {label}
          </span>
        )}
      </div>
    );

    return href ? <Link to={href}>{content}</Link> : content;
  };

  return (
    <aside className="flex flex-col items-center w-16 py-3 px-1 bg-card/80 backdrop-blur-xl border-r border-border/50">
      {/* Logo */}
      <Link to="/dashboard" className="mb-2 transition-all duration-200 hover:scale-105 active:scale-95">
        <img 
          src={logo} 
          alt="Logo" 
          className="w-8 h-8 object-contain opacity-90 hover:opacity-100 transition-opacity"
        />
      </Link>

      {/* New Sale Button */}
      <div className="w-full mb-2">
        <IconButton icon={Plus} label="Nova" href="/vendas" variant="primary" />
      </div>

      {/* Thin Divider */}
      <div className="w-8 h-px bg-border/60 mb-2" />

      {/* Main Navigation */}
      <nav className="flex-1 flex flex-col items-center w-full gap-0.5">
        {mainNavigation.map((item) => (
          <NavItem key={item.name} item={item} />
        ))}
        
        {managementNavigation.length > 0 && (
          <div className="w-8 h-px bg-border/60 my-1.5" />
        )}
        
        {managementNavigation.map((item) => (
          <NavItem key={item.name} item={item} />
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Secondary Actions */}
        <div className="flex flex-col items-center w-full gap-0.5 mt-2">
          <IconButton icon={Search} label="Buscar" onClick={() => {}} />
          <IconButton icon={Bell} label="Alertas" onClick={() => {}} />
        </div>
      </nav>

      {/* Thin Divider */}
      <div className="w-8 h-px bg-border/60 my-1.5" />

      {/* Profile */}
      <IconButton 
        icon={UserCircle} 
        label="Perfil" 
        href="/perfil" 
        active={isActive('/perfil')}
      />

      {/* User Avatar with Online Status */}
      <OnlineUsersDrawer>
        <div className="relative group cursor-pointer mt-1.5 transition-all duration-200 hover:scale-105 active:scale-95">
          <Avatar className="w-8 h-8 ring-1 ring-border/50 group-hover:ring-primary/30 transition-all duration-200">
            <AvatarImage src={profile?.avatar_url || ''} alt={profile?.nome || 'Usuário'} />
            <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-medium">
              {profile?.nome?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <span 
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-card rounded-full transition-colors",
              isOnline ? "bg-emerald-500" : "bg-muted-foreground"
            )} 
          />
          {onlineCount > 1 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center text-[8px] font-medium bg-primary text-white rounded-full px-0.5">
              {onlineCount}
            </span>
          )}
        </div>
      </OnlineUsersDrawer>

      {/* Thin Divider */}
      <div className="w-8 h-px bg-border/60 my-1.5" />

      {/* Logout */}
      <IconButton icon={LogOut} label="Sair" onClick={signOut} variant="danger" />
    </aside>
  );
};

export default Sidebar;