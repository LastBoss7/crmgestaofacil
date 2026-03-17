import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface PresenceState {
  nome: string;
  avatar_url?: string;
  role?: string;
  online_at: string;
  is_typing?: boolean;
  typing_in?: string; // channel/context where typing
}

interface UserPresence {
  user_id: string;
  nome: string;
  avatar_url?: string;
  role?: string;
  online_at: string;
  is_typing?: boolean;
  typing_in?: string;
}

export const usePresence = (channelContext?: string) => {
  const { user, profile, role } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [sessionStart] = useState<Date>(new Date());
  const [sessionDuration, setSessionDuration] = useState<string>('0m');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update session duration every minute
  useEffect(() => {
    const updateDuration = () => {
      const now = new Date();
      const diff = now.getTime() - sessionStart.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      
      if (hours > 0) {
        setSessionDuration(`${hours}h ${minutes % 60}m`);
      } else {
        setSessionDuration(`${minutes}m`);
      }
    };

    updateDuration();
    const interval = setInterval(updateDuration, 60000);
    
    return () => clearInterval(interval);
  }, [sessionStart]);

  useEffect(() => {
    if (!user || !profile) return;

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channelRef.current = channel;

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
              is_typing: presence.is_typing,
              typing_in: presence.typing_in,
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
            role: role || undefined,
            online_at: new Date().toISOString(),
            is_typing: false,
            typing_in: null,
          });
          setIsOnline(true);
        }
      });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setIsOnline(false);
    };
  }, [user, profile]);

  const setTyping = useCallback(async (isTyping: boolean, context?: string) => {
    if (!channelRef.current || !profile) return;

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    await channelRef.current.track({
      nome: profile.nome,
      avatar_url: profile.avatar_url,
      role: role,
      online_at: new Date().toISOString(),
      is_typing: isTyping,
      typing_in: isTyping ? (context || channelContext) : null,
    });

    // Auto-clear typing after 3 seconds
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(async () => {
        if (channelRef.current && profile) {
          await channelRef.current.track({
            nome: profile.nome,
            avatar_url: profile.avatar_url,
            role: role,
            online_at: new Date().toISOString(),
            is_typing: false,
            typing_in: null,
          });
        }
      }, 3000);
    }
  }, [profile, role, channelContext]);

  const isUserOnline = useCallback((userId: string) => {
    return onlineUsers.some((u) => u.user_id === userId);
  }, [onlineUsers]);

  const getTypingUsers = useCallback((context?: string) => {
    return onlineUsers.filter((u) => {
      if (!u.is_typing) return false;
      if (!context) return true;
      return u.typing_in === context;
    });
  }, [onlineUsers]);

  const getUserSessionTime = useCallback((userId: string) => {
    const user = onlineUsers.find((u) => u.user_id === userId);
    if (!user) return null;
    
    const onlineAt = new Date(user.online_at);
    const now = new Date();
    const diff = now.getTime() - onlineAt.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  }, [onlineUsers]);

  // Check if current user is in the online list (more reliable than local state)
  const currentUserOnline = user ? onlineUsers.some(u => u.user_id === user.id) : false;

  return {
    onlineUsers,
    isOnline: isOnline || currentUserOnline,
    isUserOnline,
    onlineCount: onlineUsers.length,
    setTyping,
    getTypingUsers,
    sessionDuration,
    getUserSessionTime,
  };
};
