import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Sale, SALE_STATUS_LABELS, SaleStatus } from '@/types/database';
import { toast } from 'sonner';

interface SaleChangePayload {
  new: Sale;
  old: Sale;
}

// Store processed sale IDs to prevent duplicates (module-level)
const processedChanges = new Set<string>();

export function useSalesNotifications() {
  const { user, profile, isCEO, isBackoffice, isSeller } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  // Store current values in refs for stable callback reference
  const userRef = useRef(user);
  const profileRef = useRef(profile);
  const isCEORef = useRef(isCEO);
  const isBackofficeRef = useRef(isBackoffice);
  const isSellerRef = useRef(isSeller);
  
  // Update refs when values change
  useEffect(() => {
    userRef.current = user;
    profileRef.current = profile;
    isCEORef.current = isCEO;
    isBackofficeRef.current = isBackoffice;
    isSellerRef.current = isSeller;
  }, [user, profile, isCEO, isBackoffice, isSeller]);

  useEffect(() => {
    if (!user) return;

    // Clean up existing channel before creating new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const handleSaleChange = async (payload: unknown) => {
      const currentUser = userRef.current;
      const currentProfile = profileRef.current;
      if (!currentUser || !currentProfile?.company_id) return;
      
      const { new: newSale, old: oldSale } = payload as SaleChangePayload;
      
      // Only notify if status changed
      if (newSale.status === oldSale.status) return;

      // Create a unique key to prevent duplicate processing
      const changeKey = `${newSale.id}-${oldSale.status}-${newSale.status}-${Math.floor(Date.now() / 1000)}`;
      
      // Check if we already processed this change (within same second)
      if (processedChanges.has(changeKey)) return;
      processedChanges.add(changeKey);
      
      // Clean up old keys after 5 seconds
      setTimeout(() => processedChanges.delete(changeKey), 5000);

      // For sellers, only notify about their own sales
      if (isSellerRef.current && newSale.seller_id !== currentUser.id) return;

      const clientName = newSale.nome_fantasia || newSale.razao_social;
      const newStatus = SALE_STATUS_LABELS[newSale.status as SaleStatus];

      // Determine notification type and message
      let notificationType: string = 'info';
      let title = '';
      let message = '';

      switch (newSale.status) {
        case 'VENDA_AUDITADA':
          notificationType = 'success';
          title = '🎉 Venda Auditada!';
          message = `${clientName} foi auditada`;
          break;
        case 'PENDENCIA':
          notificationType = 'alert';
          title = '⚠️ Venda com Pendência';
          message = `${clientName}: ${newSale.motivo_pendencia || 'Verifique a venda'}`;
          break;
        case 'CANCELADA':
          notificationType = 'alert';
          title = '❌ Venda Cancelada';
          message = `${clientName} foi cancelada`;
          break;
        case 'AGUARDANDO_AUDITORIA':
          if (isCEORef.current || isBackofficeRef.current) {
            notificationType = 'sale';
            title = '📋 Nova Venda para Auditoria';
            message = `${clientName} aguardando auditoria`;
          } else {
            return;
          }
          break;
        case 'INSTALACAO_MARCADA':
          notificationType = 'success';
          title = '📅 Instalação Marcada!';
          message = `${clientName} teve a instalação agendada`;
          break;
        case 'INSTALADA':
          notificationType = 'success';
          title = '✅ Venda Instalada!';
          message = `${clientName} foi instalada com sucesso`;
          break;
        default:
          notificationType = 'info';
          title = 'Status Atualizado';
          message = `${clientName}: ${newStatus}`;
      }

      try {
        const { error } = await supabase.from('notifications').insert({
          user_id: currentUser.id,
          company_id: currentProfile.company_id,
          type: notificationType,
          title,
          message,
          reference_id: newSale.id,
          reference_type: 'sale',
          read: false,
        });

        if (error) {
          console.error('Error creating sale notification:', error);
          toast.error('Não foi possível criar a notificação da venda');
        }
      } catch (error) {
        console.error('Error creating notification:', error);
        toast.error('Não foi possível criar a notificação da venda');
      }
    };

    // Use unique channel name per user
    const channelName = `sales-status-changes-${user.id}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sales',
        },
        handleSaleChange
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);
}
