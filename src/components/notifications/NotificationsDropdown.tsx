import { Bell, Check, Trash2, ShoppingCart, UserPlus, AlertCircle, CheckCircle2, Info, BellRing } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { toast } from 'sonner';

const NotificationsDropdown = () => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    clearAll,
    requestNotificationPermission,
    notificationPermission,
  } = useNotifications();

  const handleEnablePush = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      toast.success('Notificações push ativadas!');
    } else {
      toast.error('Permissão de notificações negada');
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'sale':
        return ShoppingCart;
      case 'user':
        return UserPlus;
      case 'alert':
        return AlertCircle;
      case 'success':
        return CheckCircle2;
      case 'info':
      default:
        return Info;
    }
  };

  const getIconColor = (type: Notification['type']) => {
    switch (type) {
      case 'sale':
        return 'text-violet-400 bg-violet-500/20';
      case 'user':
        return 'text-blue-400 bg-blue-500/20';
      case 'alert':
        return 'text-orange-400 bg-orange-500/20';
      case 'success':
        return 'text-emerald-400 bg-emerald-500/20';
      case 'info':
      default:
        return 'text-cyan-400 bg-cyan-500/20';
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'agora';
    if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hora${Math.floor(diff / 3600) > 1 ? 's' : ''} atrás`;
    return `${Math.floor(diff / 86400)} dia${Math.floor(diff / 86400) > 1 ? 's' : ''} atrás`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-full flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm text-white/60 hover:bg-white/[0.04] transition-colors">
          <div className="relative">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-[10px] font-bold text-white px-1">{unreadCount}</span>
              </div>
            )}
          </div>
          <span>Notificações</span>
          {unreadCount > 0 && (
            <span className="ml-auto text-xs text-violet-400 font-medium">{unreadCount} novas</span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        side="right"
        sideOffset={12}
        className="w-[380px] p-0 bg-[hsl(252,20%,8%)]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Notificações</h3>
              <p className="text-xs text-white/40 mt-0.5">
                {unreadCount > 0 ? `${unreadCount} não lidas` : 'Todas lidas'}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-8 text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 rounded-xl"
              >
                <Check className="h-3 w-3 mr-1.5" />
                Marcar todas
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                <Bell className="h-6 w-6 text-white/20" />
              </div>
              <p className="text-sm text-white/40">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification) => {
                const Icon = getIcon(notification.type);
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "group relative p-3 rounded-xl transition-all duration-200 cursor-pointer",
                      notification.read
                        ? "hover:bg-white/[0.02]"
                        : "bg-violet-500/[0.08] hover:bg-violet-500/[0.12]"
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className={cn(
                        "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center",
                        getIconColor(notification.type)
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            notification.read ? "text-white/70" : "text-white"
                          )}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="flex-shrink-0 w-2 h-2 mt-1.5 bg-violet-500 rounded-full" />
                          )}
                        </div>
                        <p className="text-xs text-white/40 mt-0.5 line-clamp-1">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-white/30 mt-1">
                          {formatTimeAgo(notification.created_at)}
                        </p>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-white/[0.06] space-y-2">
          {notificationPermission !== 'granted' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEnablePush}
              className="w-full h-9 text-xs text-primary hover:text-primary/80 hover:bg-primary/10 rounded-xl"
            >
              <BellRing className="h-3 w-3 mr-2" />
              Ativar notificações push
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="w-full h-9 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl"
            >
              <Trash2 className="h-3 w-3 mr-2" />
              Limpar todas
            </Button>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationsDropdown;
