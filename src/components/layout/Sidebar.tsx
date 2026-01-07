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
  Crown, 
  Shield, 
  Briefcase, 
  Settings,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROLE_LABELS } from '@/types/database';
import NotificationsDropdown from '@/components/notifications/NotificationsDropdown';
import AvatarUpload from '@/components/profile/AvatarUpload';

const Sidebar = () => {
  const location = useLocation();
  const {
    profile,
    role,
    signOut,
    canManageUsers,
    isCEO,
    isBackoffice,
    isSeller
  } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Vendas', href: '/vendas', icon: ShoppingCart },
    { name: 'Relatórios', href: '/relatorios', icon: BarChart3 },
    ...(canManageUsers ? [{ name: 'Usuários', href: '/usuarios', icon: Users }] : []),
    ...(isCEO ? [{ name: 'Convites', href: '/equipe/convites', icon: UserPlus }] : []),
    ...(isCEO ? [{ name: 'Configurações', href: '/configuracoes', icon: Settings }] : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  const getRoleIcon = () => {
    if (isCEO) return Crown;
    if (isBackoffice) return Shield;
    return Briefcase;
  };

  const getRoleBadgeStyle = () => {
    if (isCEO) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (isBackoffice) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
  };

  const getRoleLabel = () => {
    if (!role) return null;
    return ROLE_LABELS[role];
  };

  const RoleIcon = getRoleIcon();

  return (
    <div className="flex h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <ShoppingCart className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-sidebar-foreground">CRM Telecom</h1>
          <p className="text-[11px] text-muted-foreground">Gestão de Vendas</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="flex-1">{item.name}</span>
                {active && <ChevronRight className="h-4 w-4 opacity-60" />}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-sidebar-border space-y-3">
        {/* Notifications */}
        <NotificationsDropdown />

        {/* User Profile */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent/50">
          <AvatarUpload size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.nome || 'Usuário'}
            </p>
            <div className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border mt-0.5',
              getRoleBadgeStyle()
            )}>
              <RoleIcon className="h-2.5 w-2.5" />
              {getRoleLabel() || <span className="animate-pulse">...</span>}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={signOut} 
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
