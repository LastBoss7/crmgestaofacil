import { useState, useEffect, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ChatPanel } from './ChatPanel';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationSound } from '@/hooks/useNotificationSound';

export const FloatingChatButton = () => {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const { playSound } = useNotificationSound();

  // Fetch unread direct messages count
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .is('read_at', null);

      setUnreadCount(count || 0);
    };

    fetchUnreadCount();

    // Subscribe to new direct messages
    const channel = supabase
      .channel('unread-dm-count')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          if (!open) {
            setUnreadCount((prev) => prev + 1);
            // Tocar som de notificação
            playSound('info');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          // If message was marked as read, decrease count
          if (payload.new && (payload.new as any).read_at && !(payload.old as any).read_at) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, open]);

  // Reset unread count when chat is opened
  useEffect(() => {
    if (open && user) {
      // Refetch to get accurate count after viewing
      const timer = setTimeout(async () => {
        const { count } = await supabase
          .from('direct_messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .is('read_at', null);

        setUnreadCount(count || 0);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [open, user]);

  return (
    <>
      {/* Floating button */}
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50 bg-primary hover:bg-primary/90 hover:scale-105"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
        {unreadCount > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 bg-destructive text-destructive-foreground text-xs font-semibold animate-in zoom-in-50"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Chat Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent 
          side="right" 
          className="w-full sm:w-[420px] p-0 border-l border-border/50 bg-background/95 backdrop-blur-xl"
        >
          <SheetHeader className="px-4 py-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2.5 text-foreground font-semibold">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="h-4 w-4 text-primary" />
                </div>
                Chat da Equipe
              </SheetTitle>
            </div>
          </SheetHeader>
          <div className="h-[calc(100vh-60px)] overflow-hidden">
            <ChatPanel />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
