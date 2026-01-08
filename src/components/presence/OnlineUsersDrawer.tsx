import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePresence } from '@/hooks/usePresence';
import { ROLE_LABELS } from '@/types/database';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnlineUsersDrawerProps {
  children: React.ReactNode;
}

export const OnlineUsersDrawer = ({ children }: OnlineUsersDrawerProps) => {
  const { onlineUsers, getUserSessionTime } = usePresence();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRoleBadge = (role?: string) => {
    const styles: Record<string, string> = {
      CEO: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      BACKOFFICE: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      SELLER: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    };
    return styles[role || ''] || 'bg-muted text-muted-foreground border-border';
  };

  const getRoleLabel = (role?: string) => {
    if (!role) return 'Usuário';
    return ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role;
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="left" className="w-80 bg-card border-border p-0">
        <SheetHeader className="p-4 pb-2 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <div className="relative">
              <Users className="h-5 w-5 text-primary" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            Usuários Online
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {onlineUsers.length}
            </span>
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-2">
            {onlineUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">Nenhum usuário online</p>
              </div>
            ) : (
              <div className="space-y-1">
                {onlineUsers.map((user) => {
                  const sessionTime = getUserSessionTime(user.user_id);
                  
                  return (
                    <div
                      key={user.user_id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                    >
                      {/* Avatar with online indicator */}
                      <div className="relative">
                        <Avatar className="h-10 w-10 ring-2 ring-border">
                          <AvatarImage src={user.avatar_url || undefined} alt={user.nome} />
                          <AvatarFallback className={cn(
                            "text-xs font-medium",
                            getRoleBadge(user.role)
                          )}>
                            {getInitials(user.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-card rounded-full" />
                      </div>
                      
                      {/* User info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground truncate">
                            {user.nome}
                          </span>
                          {user.is_typing && (
                            <span className="text-[10px] text-primary animate-pulse">
                              digitando...
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full border",
                            getRoleBadge(user.role)
                          )}>
                            {getRoleLabel(user.role)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Session time */}
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground">
                          {sessionTime || '0m'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
