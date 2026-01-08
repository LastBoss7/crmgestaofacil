import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { X, AlertTriangle, Info, Bell, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Broadcast {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  sender_name: string;
  created_at: string;
}

const PRIORITY_STYLES = {
  low: 'bg-muted border-muted-foreground/20 text-muted-foreground',
  normal: 'bg-primary/10 border-primary/20 text-primary',
  high: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400',
  urgent: 'bg-destructive/10 border-destructive/30 text-destructive animate-pulse',
};

const PRIORITY_ICONS = {
  low: Info,
  normal: Bell,
  high: AlertTriangle,
  urgent: Megaphone,
};

export function BroadcastBanner() {
  const { user, profile } = useAuth();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !profile?.company_id) return;

    const fetchBroadcasts = async () => {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        setBroadcasts(data as Broadcast[]);
      }
    };

    fetchBroadcasts();

    // Realtime subscription
    const channel = supabase
      .channel('broadcasts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'broadcasts' },
        () => fetchBroadcasts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile?.company_id]);

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
  };

  const visibleBroadcasts = broadcasts.filter(b => !dismissedIds.has(b.id));

  if (visibleBroadcasts.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      <AnimatePresence>
        {visibleBroadcasts.map((broadcast) => {
          const Icon = PRIORITY_ICONS[broadcast.priority];
          
          return (
            <motion.div
              key={broadcast.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className={cn(
                "relative flex items-start gap-3 p-3 rounded-lg border",
                PRIORITY_STYLES[broadcast.priority]
              )}
            >
              <Icon className="h-5 w-5 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{broadcast.title}</p>
                  <span className="text-xs opacity-70">
                    • {broadcast.sender_name}
                  </span>
                </div>
                <p className="text-sm opacity-90 mt-0.5">{broadcast.message}</p>
              </div>
              <button
                onClick={() => handleDismiss(broadcast.id)}
                className="shrink-0 p-1 rounded hover:bg-background/50 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
