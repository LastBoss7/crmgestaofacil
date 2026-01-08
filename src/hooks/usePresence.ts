import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface PresenceState {
  odas: string;
  nome: string;
  avatar_url?: string;
  role?: string;
  online_at: string;
}

interface UserPresence {
  user_id: string;
  nome: string;
  avatar_url?: string;
  role?: string;
  online_at: string;
}

export const usePresence = () => {
  const { user, profile, role } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>();
        const users: UserPresence[] = [];
        
        Object.entries(state).forEach(([userId, presences]) => {
          if (presences && presences.length > 0) {
            const presence = presences[0];
            users.push({
              user_id: userId,
              nome: presence.nome,
              avatar_url: presence.avatar_url,
              role: presence.role,
              online_at: presence.online_at,
            });
          }
        });
        
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            nome: profile.nome,
            avatar_url: profile.avatar_url,
            role: role,
            online_at: new Date().toISOString(),
          });
          setIsOnline(true);
        }
      });

    return () => {
      channel.unsubscribe();
      setIsOnline(false);
    };
  }, [user, profile, role]);

  const isUserOnline = (userId: string) => {
    return onlineUsers.some((u) => u.user_id === userId);
  };

  return {
    onlineUsers,
    isOnline,
    isUserOnline,
    onlineCount: onlineUsers.length,
  };
};
