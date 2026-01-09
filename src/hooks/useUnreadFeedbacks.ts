import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useUnreadFeedbacks = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, isCEO, isBackoffice } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      // Sellers see unread feedbacks they received
      // CEO/Backoffice see unread notifications about feedbacks being read
      const isSeller = !isCEO && !isBackoffice;

      if (isSeller) {
        const { count } = await supabase
          .from('feedbacks')
          .select('*', { count: 'exact', head: true })
          .eq('seller_id', user.id)
          .is('read_at', null);
        
        setUnreadCount(count || 0);
      } else {
        // For CEO/Backoffice, count feedbacks they sent that were read but not notified
        const { count } = await supabase
          .from('feedbacks')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', user.id)
          .not('read_at', 'is', null)
          .is('read_notified_at', null);
        
        setUnreadCount(count || 0);
      }
    };

    fetchUnreadCount();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('unread-feedbacks-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feedbacks' },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isCEO, isBackoffice]);

  return { unreadCount };
};
