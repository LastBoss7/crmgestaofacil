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
  ChevronLeft,
  ChevronRight,
  Bell,
  MessageCircle,
  Plus,
  Sparkles,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROLE_LABELS } from '@/types/database';
import AvatarUpload from '@/components/profile/AvatarUpload';
import { useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';

interface SalesStats {
  total: number;
  novas: number;
  emAnalise: number;
  pendencia: number;
  aprovadas: number;
  instaladas: number;
  canceladas: number;
}

const Sidebar = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [salesStats, setSalesStats] = useState<SalesStats>({
    total: 0,
    novas: 0,
    emAnalise: 0,
    pendencia: 0,
    aprovadas: 0,
    instaladas: 0,
    canceladas: 0,
  });
  const {
    profile,
    user,
    role,
    signOut,
    canManageUsers,
    isCEO,
  } = useAuth();

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
          novas: sales.filter(s => s.status === 'NOVA').length,
          emAnalise: sales.filter(s => s.status === 'EM_ANALISE').length,
          pendencia: sales.filter(s => s.status === 'PENDENCIA').length,
          aprovadas: sales.filter(s => s.status === 'APROVADA').length,
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
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, gradient: 'from-violet-500 to-purple-600' },
    { name: 'Vendas', href: '/vendas', icon: ShoppingBag, gradient: 'from-emerald-500 to-teal-600', badge: salesStats.total > 0 ? salesStats.total : undefined },
    { name: 'Relatórios', href: '/relatorios', icon: PieChart, gradient: 'from-amber-500 to-orange-600' },
  ];

  const managementNavigation = [
    ...(canManageUsers ? [{ name: 'Usuários', href: '/usuarios', icon: Users2, gradient: 'from-blue-500 to-cyan-600' }] : []),
    ...(isCEO ? [{ name: 'Convites', href: '/equipe/convites', icon: UserPlus2, gradient: 'from-pink-500 to-rose-600' }] : []),
    ...(isCEO ? [{ name: 'Configurações', href: '/configuracoes', icon: Cog, gradient: 'from-slate-400 to-slate-600' }] : []),
  ];

  // Categories with real data from database
  const categories = [
    { name: 'Novas', color: 'bg-emerald-500', glowColor: 'shadow-emerald-500/50', count: salesStats.novas },
    { name: 'Em Análise', color: 'bg-amber-500', glowColor: 'shadow-amber-500/50', count: salesStats.emAnalise },
    { name: 'Aprovadas', color: 'bg-blue-500', glowColor: 'shadow-blue-500/50', count: salesStats.aprovadas },
    { name: 'Instaladas', color: 'bg-violet-500', glowColor: 'shadow-violet-500/50', count: salesStats.instaladas },
  ];

  const isActive = (path: string) => location.pathname === path;

  const getRoleLabel = () => {
    if (!role) return null;
    return ROLE_LABELS[role];
  };

  type NavItemType = { name: string; href: string; icon: typeof LayoutDashboard; gradient: string; badge?: number };
  
  const NavItem = ({ item, showBadge = true }: { item: NavItemType; showBadge?: boolean }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    
    const content = (
      <Link
        to={item.href}
        className={cn(
          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-300 ease-out',
          'hover:scale-[1.02] hover:shadow-lg',
          active
            ? 'bg-gradient-to-r text-white shadow-lg'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        )}
        style={active ? { backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))` } : {}}
      >
        {/* Active background gradient */}
        {active && (
          <div className={cn('absolute inset-0 rounded-xl bg-gradient-to-r opacity-100', item.gradient)} />
        )}
        
        {/* Hover glow effect */}
        <div className={cn(
          'absolute inset-0 rounded-xl bg-gradient-to-r opacity-0 blur-xl transition-opacity duration-300 -z-10',
          'group-hover:opacity-30',
          item.gradient
        )} />
        
        {/* Icon with gradient background on hover */}
        <div className={cn(
          'relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300',
          active 
            ? 'bg-white/20' 
            : 'bg-slate-800/50 group-hover:bg-gradient-to-br group-hover:shadow-lg',
          !active && `group-hover:${item.gradient}`
        )}>
          <Icon className={cn(
            'h-4.5 w-4.5 transition-all duration-300 relative z-10',
            active ? 'text-white' : 'text-slate-400 group-hover:text-white'
          )} />
          {!active && (
            <div className={cn(
              'absolute inset-0 rounded-lg bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300',
              item.gradient
            )} />
          )}
        </div>
        
        {!collapsed && (
          <>
            <span className="relative flex-1 font-medium z-10">{item.name}</span>
            {showBadge && item.badge && (
              <span className={cn(
                'relative z-10 px-2 py-0.5 text-xs font-semibold rounded-full min-w-[24px] text-center transition-all duration-300',
                active 
                  ? 'bg-white/20 text-white' 
                  : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30'
              )}>
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
            <div className="flex items-center gap-2">
              {item.name}
              {item.badge && (
                <span className="px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                  {item.badge}
                </span>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  const CategoryItem = ({ category }: { category: typeof categories[0] }) => {
    const content = (
      <div className={cn(
        'group flex items-center gap-3 px-3 py-2 text-sm rounded-lg cursor-pointer',
        'transition-all duration-300 ease-out',
        'text-slate-400 hover:text-white hover:bg-white/5',
        'hover:translate-x-1'
      )}>
        <div className={cn(
          'h-2.5 w-2.5 rounded-full flex-shrink-0 transition-all duration-300',
          'group-hover:scale-125 group-hover:shadow-lg',
          category.color,
          `group-hover:${category.glowColor}`
        )} 
        style={{ boxShadow: 'none' }}
        />
        {!collapsed && (
          <>
            <span className="flex-1 transition-colors duration-300">{category.name}</span>
            <span className={cn(
              'text-xs transition-all duration-300',
              'text-slate-500 group-hover:text-white group-hover:bg-white/10 px-1.5 py-0.5 rounded-md'
            )}>
              {category.count}
            </span>
          </>
        )}
      </div>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
            <div className="flex items-center gap-2">
              {category.name}
              <span className="text-xs text-slate-400">{category.count}</span>
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div 
        className={cn(
          'flex h-screen flex-col transition-all duration-300 ease-in-out relative',
          'bg-[#1e2530]',
          collapsed ? 'w-[60px]' : 'w-[260px]'
        )}
      >
        {/* Top bar with icons and toggle */}
        <div className={cn(
          'flex items-center border-b border-slate-700/30 h-14',
          collapsed ? 'justify-center px-2' : 'justify-between px-3'
        )}>
          {!collapsed && (
            <div className="flex items-center gap-1">
              <button className="group p-2 text-slate-400 hover:text-white rounded-lg transition-all duration-300 hover:bg-white/5 hover:scale-110">
                <Bell className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
              </button>
              <button className="group p-2 text-slate-400 hover:text-white rounded-lg transition-all duration-300 hover:bg-white/5 hover:scale-110">
                <MessageCircle className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
              </button>
              <button className="group p-2 text-slate-400 hover:text-white rounded-lg transition-all duration-300 hover:bg-white/5 hover:scale-110">
                <Cog className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
              </button>
            </div>
          )}
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="group p-2 text-slate-400 hover:text-white rounded-lg transition-all duration-300 hover:bg-white/5"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            ) : (
              <ChevronLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
            )}
          </button>
        </div>

        {/* User Profile Section */}
        <div className={cn(
          'border-b border-slate-700/50',
          collapsed ? 'p-2' : 'p-4'
        )}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center">
                  <AvatarUpload size="sm" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
                <p className="font-medium">{profile?.nome || 'Usuário'}</p>
                <p className="text-xs text-slate-400">{getRoleLabel()}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-3">
              <div className="relative">
                <AvatarUpload size="md" />
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 rounded-full border-2 border-[#1e2530]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {profile?.nome || 'Usuário'}
                </p>
              </div>
              <button 
                onClick={() => setCollapsed(!collapsed)}
                className="p-1.5 text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* New Action Button */}
          {!collapsed && (
            <Link
              to="/vendas"
              className={cn(
                'group mt-3 flex items-center justify-center gap-2 w-full py-2.5 px-4',
                'bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium rounded-xl',
                'transition-all duration-300 ease-out',
                'hover:from-violet-500 hover:to-purple-500 hover:shadow-lg hover:shadow-violet-500/30',
                'hover:scale-[1.02] active:scale-[0.98]'
              )}
            >
              <Sparkles className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
              Nova Venda
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          {/* Main Navigation */}
          <div className="space-y-1">
            {mainNavigation.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}
          </div>

          {/* Management Section */}
          {managementNavigation.length > 0 && (
            <div className="mt-4 space-y-1">
              {managementNavigation.map((item) => (
                <NavItem key={item.name} item={item} showBadge={false} />
              ))}
            </div>
          )}

          {/* Categories Section */}
          <div className="mt-6">
            {!collapsed && (
              <div className="flex items-center justify-between px-3 mb-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Status das Vendas
                </span>
                <ChevronRight className="h-3 w-3 text-slate-500 rotate-90" />
              </div>
            )}
            <div className="space-y-0.5">
              {categories.map((category) => (
                <CategoryItem key={category.name} category={category} />
              ))}
            </div>
          </div>

          {/* Recent Activity Section */}
          {!collapsed && (
            <div className="mt-6">
              <div className="flex items-center justify-between px-3 mb-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Atividade Recente
                </span>
                <button className="group text-slate-400 hover:text-violet-400 transition-all duration-300">
                  <Plus className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-90" />
                </button>
              </div>
              <div className="space-y-1">
                <div className={cn(
                  'group flex items-center gap-3 px-3 py-2 text-sm rounded-lg cursor-pointer',
                  'text-slate-400 hover:text-white hover:bg-white/5',
                  'transition-all duration-300 ease-out hover:translate-x-1'
                )}>
                  <div className={cn(
                    'h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium',
                    'transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-purple-500/30'
                  )}>
                    VN
                  </div>
                  <span className="flex-1 truncate">Venda Nova</span>
                  <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                </div>
                <div className={cn(
                  'group flex items-center gap-3 px-3 py-2 text-sm rounded-lg cursor-pointer',
                  'text-slate-400 hover:text-white hover:bg-white/5',
                  'transition-all duration-300 ease-out hover:translate-x-1'
                )}>
                  <div className={cn(
                    'h-7 w-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-xs font-medium',
                    'transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-orange-500/30'
                  )}>
                    AP
                  </div>
                  <span className="flex-1 truncate">Análise Pendente</span>
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded-md transition-all duration-300',
                    'text-slate-500 group-hover:text-white group-hover:bg-white/10'
                  )}>2</span>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Bottom Section - Logout */}
        <div className={cn(
          'border-t border-slate-700/30',
          collapsed ? 'p-2' : 'p-3'
        )}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={signOut} 
                  className="group w-full h-10 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-300"
                >
                  <LogOut className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-0.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
                Sair
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button 
              variant="ghost" 
              onClick={signOut} 
              className={cn(
                'group w-full justify-start gap-3 px-3 rounded-xl',
                'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10',
                'transition-all duration-300'
              )}
            >
              <LogOut className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-0.5" />
              <span>Sair</span>
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Sidebar;
