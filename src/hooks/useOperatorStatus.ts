import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { OperatorStatus, OperatorCurrentStatus } from '@/types/database';
import { toast } from 'sonner';

export function useOperatorStatus() {
  const { user, profile, isSeller } = useAuth();
  const [currentStatus, setCurrentStatus] = useState<OperatorStatus>('OFFLINE');
  const [statusStartedAt, setStatusStartedAt] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [allStatuses, setAllStatuses] = useState<(OperatorCurrentStatus & { profile?: { nome: string; avatar_url: string | null } })[]>([]);

  // Fetch current status
  const fetchCurrentStatus = useCallback(async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('operator_current_status')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching current status:', error);
      return;
    }

    if (data) {
      setCurrentStatus(data.status as OperatorStatus);
      setStatusStartedAt(new Date(data.status_started_at));
    } else {
      // Initialize status for new users
      await initializeStatus();
    }
    setLoading(false);
  }, [user?.id]);

  // Initialize status for new users
  const initializeStatus = async () => {
    if (!user?.id || !profile?.company_id) return;

    const { error } = await supabase
      .from('operator_current_status')
      .upsert({
        user_id: user.id,
        status: 'OFFLINE',
        status_started_at: new Date().toISOString(),
        company_id: profile.company_id,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error initializing status:', error);
    }
  };

  // Change status
  const changeStatus = useCallback(async (newStatus: OperatorStatus) => {
    if (!user?.id || !profile?.company_id) return;

    const now = new Date();

    try {
      // Close previous status log
      const { data: previousLog } = await supabase
        .from('operator_status_logs')
        .select('*')
        .eq('user_id', user.id)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (previousLog) {
        const durationSeconds = Math.floor((now.getTime() - new Date(previousLog.started_at).getTime()) / 1000);
        await supabase
          .from('operator_status_logs')
          .update({
            ended_at: now.toISOString(),
            duration_seconds: durationSeconds,
          })
          .eq('id', previousLog.id);
      }

      // Create new status log
      await supabase
        .from('operator_status_logs')
        .insert({
          user_id: user.id,
          status: newStatus,
          started_at: now.toISOString(),
          company_id: profile.company_id,
        });

      // Update current status
      await supabase
        .from('operator_current_status')
        .upsert({
          user_id: user.id,
          status: newStatus,
          status_started_at: now.toISOString(),
          company_id: profile.company_id,
          updated_at: now.toISOString(),
        });

      setCurrentStatus(newStatus);
      setStatusStartedAt(now);

    } catch (error) {
      console.error('Error changing status:', error);
      toast.error('Erro ao alterar status');
    }
  }, [user?.id, profile?.company_id]);

  // Fetch all current statuses (for managers)
  const fetchAllStatuses = useCallback(async () => {
    const { data, error } = await supabase
      .from('operator_current_status')
      .select(`
        *,
        profile:profiles!operator_current_status_user_id_fkey(nome, avatar_url)
      `)
      .order('status');

    if (error) {
      // Fallback without join
      const { data: statusData } = await supabase
        .from('operator_current_status')
        .select('*')
        .order('status');

      if (statusData) {
        // Get profiles separately
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nome, avatar_url');

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        setAllStatuses(statusData.map(s => ({
          ...s,
          profile: profileMap.get(s.user_id) as { nome: string; avatar_url: string | null } | undefined
        })));
      }
      return;
    }

    if (data) {
      setAllStatuses(data as any);
    }
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user?.id) return;

    fetchCurrentStatus();

    const channel = supabase
      .channel('operator-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'operator_current_status',
        },
        () => {
          fetchAllStatuses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchCurrentStatus, fetchAllStatuses]);

  // Set status to available on mount for sellers
  useEffect(() => {
    if (!loading && isSeller && currentStatus === 'OFFLINE') {
      changeStatus('DISPONIVEL');
    }
  }, [loading, isSeller, currentStatus]);

  // Set status to offline on unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user?.id) {
        navigator.sendBeacon(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/operator_current_status?user_id=eq.${user.id}`,
          JSON.stringify({ status: 'OFFLINE', updated_at: new Date().toISOString() })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user?.id]);

  return {
    currentStatus,
    statusStartedAt,
    loading,
    changeStatus,
    allStatuses,
    fetchAllStatuses,
  };
}
