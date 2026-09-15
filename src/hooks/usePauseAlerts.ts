import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface PauseConfig {
  maxPauseMinutes: number;
  maxLunchMinutes: number;
  checkIntervalMs: number;
}

const DEFAULT_CONFIG: PauseConfig = {
  maxPauseMinutes: 15, // 15 minutes max for regular pause
  maxLunchMinutes: 60, // 60 minutes max for lunch
  checkIntervalMs: 60000, // Check every minute
};

export function usePauseAlerts(config: Partial<PauseConfig> = {}) {
  const { user, profile, isCEO, isSupervisor } = useAuth();
  const alertedOperatorsRef = useRef<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const checkPauseExceeded = useCallback(async () => {
    if (!user?.id || !profile?.company_id) return;
    if (!isCEO && !isSupervisor) return;

    try {
      const now = new Date();

      // Get all operators in pause or lunch status
      const { data: statuses, error } = await supabase
        .from('operator_current_status')
        .select(`
          user_id,
          status,
          status_started_at,
          company_id
        `)
        .eq('company_id', profile.company_id)
        .in('status', ['PAUSA', 'ALMOCO']);

      if (error) {
        console.error('Error checking pause statuses:', error);
        return;
      }

      if (!statuses || statuses.length === 0) {
        alertedOperatorsRef.current.clear();
        return;
      }

      // Get profiles for names
      const userIds = statuses.map(s => s.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nome')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.nome]) || []);

      for (const status of statuses) {
        const startedAt = new Date(status.status_started_at);
        const elapsedMinutes = Math.floor((now.getTime() - startedAt.getTime()) / 60000);
        
        const maxMinutes = status.status === 'ALMOCO' 
          ? finalConfig.maxLunchMinutes 
          : finalConfig.maxPauseMinutes;

        // Check if exceeded and not already alerted
        if (elapsedMinutes >= maxMinutes && !alertedOperatorsRef.current.has(status.user_id)) {
          const operatorName = profileMap.get(status.user_id) || 'Operador';
          const statusLabel = status.status === 'ALMOCO' ? 'almoço' : 'pausa';
          
          // Mark as alerted to avoid spam
          alertedOperatorsRef.current.add(status.user_id);

          // Create notification in database for all managers
          await createAlertNotification(
            status.user_id,
            operatorName,
            statusLabel,
            elapsedMinutes,
            profile.company_id
          );

          // Show local toast
          toast.warning(`⚠️ ${operatorName} em ${statusLabel} há ${elapsedMinutes} minutos`, {
            description: `Tempo máximo de ${maxMinutes} minutos excedido`,
            duration: 10000,
          });
        }

        // Remove from alerted set if they changed status (will be caught on next check)
        if (elapsedMinutes < maxMinutes && alertedOperatorsRef.current.has(status.user_id)) {
          alertedOperatorsRef.current.delete(status.user_id);
        }
      }

      // Clean up alerted set for operators no longer in pause
      const currentPauseIds = new Set(statuses.map(s => s.user_id));
      alertedOperatorsRef.current.forEach(id => {
        if (!currentPauseIds.has(id)) {
          alertedOperatorsRef.current.delete(id);
        }
      });

    } catch (error) {
      console.error('Error in pause alert check:', error);
    }
  }, [user?.id, profile?.company_id, isCEO, isSupervisor, finalConfig]);

  // Create notification for managers
  const createAlertNotification = async (
    operatorId: string,
    operatorName: string,
    statusLabel: string,
    elapsedMinutes: number,
    companyId: string
  ) => {
    try {
      // Get all managers in the company
      const { data: managers } = await supabase
        .from('profiles')
        .select('id')
        .eq('company_id', companyId);

      if (!managers) return;

      // Get manager roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', managers.map(m => m.id))
        .in('role', ['CEO', 'SUPERVISOR']);

      if (!roles || roles.length === 0) return;

      const managerIds = roles.map(r => r.user_id);

      // Create notifications for each manager
      const notifications = managerIds.map(managerId => ({
        user_id: managerId,
        company_id: companyId,
        type: 'alert',
        title: `Pausa Excedida`,
        message: `${operatorName} está em ${statusLabel} há ${elapsedMinutes} minutos`,
        reference_id: operatorId,
        reference_type: 'operator_pause',
        read: false,
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) {
        console.error('Error creating pause alert notification:', error);
        toast.error('Não foi possível enviar o alerta de pausa');
      }

    } catch (error) {
      console.error('Error creating pause alert notification:', error);
      toast.error('Não foi possível enviar o alerta de pausa');
    }
  };

  // Start interval to check pauses
  useEffect(() => {
    if (!isCEO && !isSupervisor) return;

    // Initial check
    checkPauseExceeded();

    // Set up interval
    intervalRef.current = setInterval(checkPauseExceeded, finalConfig.checkIntervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isCEO, isSupervisor, checkPauseExceeded, finalConfig.checkIntervalMs]);

  // Subscribe to status changes to check immediately
  useEffect(() => {
    if (!isCEO && !isSupervisor) return;

    const channel = supabase
      .channel('pause-alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'operator_current_status',
        },
        () => {
          // Small delay to ensure data is updated
          setTimeout(checkPauseExceeded, 1000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isCEO, isSupervisor, checkPauseExceeded]);

  return {
    checkPauseExceeded,
    config: finalConfig,
  };
}
