import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Users, 
  LogOut,
  Building2,
  User,
  BarChart3,
  UserPlus,
  Crown,
  Shield,
  Briefcase,
  ChevronRight,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROLE_LABELS } from '@/types/database';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const Sidebar = () => {
  const location = useLocation();
  const { profile, role, signOut, canManageUsers, isCEO, isBackoffice, isSeller } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Vendas', href: '/vendas', icon: ShoppingCart },
    { name: 'Relatórios', href: '/relatorios', icon: BarChart3 },
    ...(canManageUsers ? [{ name: 'Usuários', href: '/usuarios', icon: Users }] : []),
    ...(isCEO ? [{ name: 'Convites', href: '/equipe/convites', icon: UserPlus }] : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  const getRoleIcon = () => {
    if (isCEO) return Crown;
    if (isBackoffice) return Shield;
    return Briefcase;
  };

  const getRoleColor = () => {
    if (isCEO) return 'from-amber-500 to-orange-500';
    if (isBackoffice) return 'from-blue-500 to-cyan-500';
    return 'from-violet-500 to-purple-500';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const RoleIcon = getRoleIcon();

  return (
    <div className="flex h-screen w-72 flex-col bg-gradient-to-b from-sidebar via-sidebar to-[hsl(260,20%,4%)] border-r border-white/[0.06]">
      {/* Logo */}
      <div className="flex h-20 items-center gap-3 px-6">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl blur-lg opacity-50" />
          <div className="relative rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 p-2.5">
            <Building2 className="h-6 w-6 text-white" />
          </div>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">CRM Telecom</h1>
          <p className="text-xs text-white/40">Vendas Corporativas</p>
        </div>
      </div>

      {/* Role Badge */}
      <div className="mx-4 mb-4 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg bg-gradient-to-br", getRoleColor())}>
            <RoleIcon className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-white/40 uppercase tracking-wider">Seu Papel</p>
            <p className="text-sm font-medium text-white">
              {role ? ROLE_LABELS[role] : 'Carregando...'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold text-white/30 uppercase tracking-widest">Menu</p>
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 relative',
                active
                  ? 'bg-gradient-to-r from-violet-500/20 to-purple-500/10 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
              )}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-violet-400 to-purple-500 rounded-full" />
              )}
              <div className={cn(
                "p-2 rounded-lg transition-all duration-200",
                active 
                  ? "bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25" 
                  : "bg-white/[0.04] group-hover:bg-white/[0.08]"
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <span>{item.name}</span>
              {active && (
                <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] mb-3">
          <Avatar className="h-10 w-10 border border-white/10">
            <AvatarFallback className={cn("bg-gradient-to-br text-white font-semibold", getRoleColor())}>
              {profile?.nome ? getInitials(profile.nome) : 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {profile?.nome || 'Usuário'}
            </p>
            <p className="text-xs text-white/40 truncate">
              {profile?.email}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start gap-3 text-white/50 hover:text-white hover:bg-white/[0.04] rounded-xl h-11"
        >
          <LogOut className="h-4 w-4" />
          Sair da conta
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
