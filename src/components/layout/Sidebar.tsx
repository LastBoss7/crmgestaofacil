import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Users, 
  LogOut, 
  BarChart3, 
  UserPlus, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  MessageSquare,
  Star,
  Send,
  Trash2,
  AlertCircle,
  Briefcase,
  Calculator,
  FolderOpen,
  TrendingUp,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROLE_LABELS } from '@/types/database';
import NotificationsDropdown from '@/components/notifications/NotificationsDropdown';
import AvatarUpload from '@/components/profile/AvatarUpload';
import { useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';

const Sidebar = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [salesCount, setSalesCount] = useState(0);
  const {
    profile,
    user,
    role,
    signOut,
    canManageUsers,
    isCEO,
  } = useAuth();

  // Fetch sales count for badge
  useEffect(() => {
    const fetchSalesCount = async () => {
      const { count } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true });
      setSalesCount(count || 0);
    };
    fetchSalesCount();
  }, []);

  const mainNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Vendas', href: '/vendas', icon: ShoppingCart, badge: salesCount > 0 ? salesCount : undefined },
    { name: 'Relatórios', href: '/relatorios', icon: BarChart3 },
  ];

  const managementNavigation = [
    ...(canManageUsers ? [{ name: 'Usuários', href: '/usuarios', icon: Users }] : []),
    ...(isCEO ? [{ name: 'Convites', href: '/equipe/convites', icon: UserPlus }] : []),
    ...(isCEO ? [{ name: 'Configurações', href: '/configuracoes', icon: Settings }] : []),
  ];

  // Categories with colored dots
  const categories = [
    { name: 'Novas', color: 'bg-emerald-500', count: 8 },
    { name: 'Em Análise', color: 'bg-orange-500', count: 43 },
    { name: 'Aprovadas', color: 'bg-blue-500', count: 76 },
    { name: 'Instaladas', color: 'bg-purple-500', count: 253 },
  ];

  const isActive = (path: string) => location.pathname === path;

  const getRoleLabel = () => {
    if (!role) return null;
    return ROLE_LABELS[role];
  };

  type NavItemType = { name: string; href: string; icon: typeof LayoutDashboard; badge?: number };
  
  const NavItem = ({ item, showBadge = true }: { item: NavItemType; showBadge?: boolean }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    
    const content = (
      <Link
        to={item.href}
        className={cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200',
          active
            ? 'bg-slate-700/50 text-white'
            : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
        )}
      >
        <Icon className={cn('h-5 w-5 flex-shrink-0', active ? 'text-white' : 'text-slate-400')} />
        {!collapsed && (
          <>
            <span className="flex-1 font-medium">{item.name}</span>
            {showBadge && item.badge && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-500 text-white rounded-full min-w-[24px] text-center">
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
      <div className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700/30 rounded-lg cursor-pointer transition-all duration-200">
        <div className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', category.color)} />
        {!collapsed && (
          <>
            <span className="flex-1">{category.name}</span>
            <span className="text-xs text-slate-500">{category.count}</span>
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
          'flex items-center border-b border-slate-700/50 h-14',
          collapsed ? 'justify-center px-2' : 'justify-between px-3'
        )}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors">
                <Bell className="h-4 w-4" />
              </button>
              <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors">
                <MessageSquare className="h-4 w-4" />
              </button>
              <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors">
                <Settings className="h-4 w-4" />
              </button>
            </div>
          )}
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
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
              className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-slate-700/50 hover:bg-slate-600/50 text-white text-sm font-medium rounded-lg border border-slate-600/50 transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
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
                <button className="text-slate-400 hover:text-blue-400 transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700/30 rounded-lg cursor-pointer transition-all">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                    VN
                  </div>
                  <span className="flex-1 truncate">Venda Nova</span>
                  <div className="h-2 w-2 bg-emerald-500 rounded-full" />
                </div>
                <div className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700/30 rounded-lg cursor-pointer transition-all">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-xs font-medium">
                    AP
                  </div>
                  <span className="flex-1 truncate">Análise Pendente</span>
                  <span className="text-xs text-slate-500">2</span>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Bottom Section - Logout */}
        <div className={cn(
          'border-t border-slate-700/50',
          collapsed ? 'p-2' : 'p-3'
        )}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={signOut} 
                  className="w-full h-10 text-slate-400 hover:text-white hover:bg-slate-700/50"
                >
                  <LogOut className="h-5 w-5" />
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
              className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-slate-700/50 px-3"
            >
              <LogOut className="h-5 w-5" />
              <span>Sair</span>
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Sidebar;
