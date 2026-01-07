import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Users, 
  LogOut,
  Building2,
  BarChart3,
  UserPlus,
  Crown,
  Shield,
  Briefcase,
  Star,
  FolderOpen,
  Folder,
  ChevronDown,
  Bell,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROLE_LABELS } from '@/types/database';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useState } from 'react';

const Sidebar = () => {
  const location = useLocation();
  const { profile, role, signOut, canManageUsers, isCEO, isBackoffice, isSeller } = useAuth();
  const [expandedFolders, setExpandedFolders] = useState<string[]>(['vendas']);

  const navigation = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Vendas', href: '/vendas', icon: ShoppingCart },
    { name: 'Relatórios', href: '/relatorios', icon: BarChart3 },
    ...(canManageUsers ? [{ name: 'Usuários', href: '/usuarios', icon: Users }] : []),
    ...(isCEO ? [{ name: 'Convites', href: '/equipe/convites', icon: UserPlus }] : []),
    ...(isCEO ? [{ name: 'Configurações', href: '/configuracoes', icon: Settings }] : []),
  ];

  const starredItems = [
    { name: 'Dashboard', icon: Star },
    { name: 'Vendas Recentes', icon: Star },
  ];

  const isActive = (path: string) => location.pathname === path;

  const toggleFolder = (folder: string) => {
    setExpandedFolders(prev => 
      prev.includes(folder) 
        ? prev.filter(f => f !== folder)
        : [...prev, folder]
    );
  };

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
    <div className="flex h-screen w-[280px] flex-col bg-[hsl(252,20%,5%)] border-r border-white/[0.06]">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-white/[0.06]">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl blur-md opacity-60" />
          <div className="relative rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 p-2">
            <Building2 className="h-5 w-5 text-white" />
          </div>
        </div>
        <div>
          <h1 className="text-base font-semibold text-white tracking-tight">CRM Telecom</h1>
          <p className="text-[10px] text-white/40">Cloud Storage</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {/* Main Navigation */}
        <div className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all duration-200 relative',
                  active
                    ? 'bg-violet-600 text-white shadow-active'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                )}
              >
                <Icon className={cn("h-4 w-4", active && "text-white")} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Starred Files Section */}
        <div className="space-y-2">
          <p className="px-4 text-[10px] font-semibold text-white/30 uppercase tracking-widest">Favoritos</p>
          {starredItems.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-3 rounded-2xl px-4 py-2 text-sm text-white/50 cursor-pointer hover:bg-white/[0.02] transition-colors"
            >
              <Star className="h-3.5 w-3.5 text-amber-500" fill="currentColor" />
              <span>{item.name}</span>
            </div>
          ))}
        </div>

        {/* Folders Section */}
        <div className="space-y-2">
          <p className="px-4 text-[10px] font-semibold text-white/30 uppercase tracking-widest">Pastas</p>
          
          {/* Vendas Folder */}
          <div>
            <button
              onClick={() => toggleFolder('vendas')}
              className="w-full flex items-center gap-3 rounded-2xl px-4 py-2 text-sm text-white/70 hover:bg-white/[0.02] transition-colors"
            >
              {expandedFolders.includes('vendas') ? (
                <FolderOpen className="h-4 w-4 text-violet-400" />
              ) : (
                <Folder className="h-4 w-4 text-violet-400" />
              )}
              <span className="flex-1 text-left">Gestão de Vendas</span>
              <ChevronDown className={cn(
                "h-3.5 w-3.5 text-white/30 transition-transform duration-200",
                expandedFolders.includes('vendas') && "rotate-180"
              )} />
            </button>
            
            {expandedFolders.includes('vendas') && (
              <div className="ml-7 mt-1 space-y-1 border-l border-white/[0.06] pl-4">
                <Link
                  to="/vendas"
                  className="block py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  Todas as Vendas
                </Link>
                <Link
                  to="/relatorios"
                  className="block py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  Relatórios
                </Link>
              </div>
            )}
          </div>

          {/* Equipe Folder */}
          {isCEO && (
            <div>
              <button
                onClick={() => toggleFolder('equipe')}
                className="w-full flex items-center gap-3 rounded-2xl px-4 py-2 text-sm text-white/70 hover:bg-white/[0.02] transition-colors"
              >
                {expandedFolders.includes('equipe') ? (
                  <FolderOpen className="h-4 w-4 text-orange-400" />
                ) : (
                  <Folder className="h-4 w-4 text-orange-400" />
                )}
                <span className="flex-1 text-left">Gestão de Equipe</span>
                <ChevronDown className={cn(
                  "h-3.5 w-3.5 text-white/30 transition-transform duration-200",
                  expandedFolders.includes('equipe') && "rotate-180"
                )} />
              </button>
              
              {expandedFolders.includes('equipe') && (
                <div className="ml-7 mt-1 space-y-1 border-l border-white/[0.06] pl-4">
                  <Link
                    to="/usuarios"
                    className="block py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
                  >
                    Usuários
                  </Link>
                  <Link
                    to="/equipe/convites"
                    className="block py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
                  >
                    Convites
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-white/[0.06] space-y-2">
        {/* Notifications */}
        <button className="w-full flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm text-white/60 hover:bg-white/[0.04] transition-colors">
          <div className="relative">
            <Bell className="h-4 w-4" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-violet-500 rounded-full" />
          </div>
          <span>Notificações</span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
          <Avatar className="h-10 w-10 border-2 border-white/10">
            <AvatarFallback className={cn("bg-gradient-to-br text-white font-semibold text-sm", getRoleColor())}>
              {profile?.nome ? getInitials(profile.nome) : 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {profile?.nome || 'Usuário'}
            </p>
            <p className="text-[10px] text-white/40 flex items-center gap-1">
              <RoleIcon className="h-3 w-3" />
              {role ? ROLE_LABELS[role] : 'Carregando...'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/[0.06] rounded-xl"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
