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
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROLE_LABELS } from '@/types/database';
import NotificationsDropdown from '@/components/notifications/NotificationsDropdown';
import AvatarUpload from '@/components/profile/AvatarUpload';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const Sidebar = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const {
    profile,
    role,
    signOut,
    canManageUsers,
    isCEO,
    isBackoffice,
  } = useAuth();

  const mainNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'text-blue-400' },
    { name: 'Vendas', href: '/vendas', icon: ShoppingCart, color: 'text-emerald-400' },
    { name: 'Relatórios', href: '/relatorios', icon: BarChart3, color: 'text-purple-400' },
  ];

  const managementNavigation = [
    ...(canManageUsers ? [{ name: 'Usuários', href: '/usuarios', icon: Users, color: 'text-orange-400' }] : []),
    ...(isCEO ? [{ name: 'Convites', href: '/equipe/convites', icon: UserPlus, color: 'text-pink-400', badge: 'novo' }] : []),
    ...(isCEO ? [{ name: 'Configurações', href: '/configuracoes', icon: Settings, color: 'text-cyan-400' }] : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  const getRoleLabel = () => {
    if (!role) return null;
    return ROLE_LABELS[role];
  };

  const NavItem = ({ item }: { item: typeof mainNavigation[0] & { badge?: string } }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    
    const content = (
      <Link
        to={item.href}
        className={cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
          active
            ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-white border-l-2 border-blue-400'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        )}
      >
        <Icon className={cn('h-5 w-5 flex-shrink-0', active ? 'text-blue-400' : item.color)} />
        {!collapsed && (
          <>
            <span className="flex-1">{item.name}</span>
            {item.badge && (
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full">
                {item.badge}
              </span>
            )}
            <ChevronRight className={cn(
              'h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity',
              active && 'opacity-100'
            )} />
          </>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
            {item.name}
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
          'flex h-screen flex-col transition-all duration-300 ease-in-out',
          'bg-gradient-to-b from-[#0c1929] via-[#0f1f35] to-[#0c1929]',
          collapsed ? 'w-[70px]' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex h-16 items-center border-b border-white/5',
          collapsed ? 'justify-center px-2' : 'gap-3 px-5'
        )}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/25">
            <ShoppingCart className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1">
              <h1 className="text-base font-bold text-white">CRM Telecom</h1>
              <p className="text-[11px] text-slate-500">Gestão de Vendas</p>
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'absolute top-4 -right-3 h-6 w-6 rounded-full border border-white/10 bg-[#0f1f35] hover:bg-[#1a2d4a] text-slate-400 hover:text-white z-10',
            'shadow-lg'
          )}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {/* Main Section */}
          <div className="mb-6">
            {!collapsed && (
              <p className="px-3 mb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Principal
              </p>
            )}
            <div className="space-y-1">
              {mainNavigation.map((item) => (
                <NavItem key={item.name} item={item} />
              ))}
            </div>
          </div>

          {/* Management Section */}
          {managementNavigation.length > 0 && (
            <div>
              {!collapsed && (
                <p className="px-3 mb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Gestão
                </p>
              )}
              <div className="space-y-1">
                {managementNavigation.map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t border-white/5 space-y-3">
          {/* Notifications */}
          {!collapsed ? (
            <NotificationsDropdown />
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center">
                  <NotificationsDropdown />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
                Notificações
              </TooltipContent>
            </Tooltip>
          )}

          {/* User Profile Card */}
          <div className={cn(
            'rounded-xl bg-gradient-to-br from-[#1a2d4a] to-[#0f1f35] border border-white/5',
            collapsed ? 'p-2' : 'p-3'
          )}>
            {collapsed ? (
              <div className="flex flex-col items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <AvatarUpload size="sm" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
                    <p>{profile?.nome || 'Usuário'}</p>
                    <p className="text-xs text-slate-400">{getRoleLabel()}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={signOut} 
                      className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
                    Sair
                  </TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <AvatarUpload size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {profile?.nome || 'Usuário'}
                  </p>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border border-blue-500/20 mt-1">
                    {getRoleLabel() || <span className="animate-pulse">...</span>}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={signOut} 
                  className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Sidebar;
