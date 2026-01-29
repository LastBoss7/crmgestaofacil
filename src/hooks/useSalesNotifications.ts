import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Sale, SALE_STATUS_LABELS, SaleStatus } from '@/types/database';

interface SaleChangePayload {
  new: Sale;
  old: Sale;
}

// Store processed sale IDs to prevent duplicates
const processedChanges = new Set<string>();

export function useSalesNotifications() {
  const { user, isCEO, isBackoffice, isSeller } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const handleSaleChange = useCallback(async (payload: unknown) => {
    if (!user) return;
    
    const { new: newSale, old: oldSale } = payload as SaleChangePayload;
    
    // Only notify if status changed
    if (newSale.status === oldSale.status) return;

    // Create a unique key to prevent duplicate processing
    const changeKey = `${newSale.id}-${oldSale.status}-${newSale.status}-${Date.now().toString().slice(0, -3)}`;
    
    // Check if we already processed this change (within same second)
    if (processedChanges.has(changeKey)) return;
    processedChanges.add(changeKey);
    
    // Clean up old keys after 5 seconds
    setTimeout(() => processedChanges.delete(changeKey), 5000);

    // For sellers, only notify about their own sales
    if (isSeller && newSale.seller_id !== user.id) return;

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
        if (isCEO || isBackoffice) {
          notificationType = 'sale';
          title = '📋 Nova Venda para Auditoria';
          message = `${clientName} aguardando auditoria`;
        } else {
          return; // Don't notify sellers about AGUARDANDO_AUDITORIA
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

    // Create notification in database
    try {
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: notificationType,
        title,
        message,
        reference_id: newSale.id,
        reference_type: 'sale',
        read: false,
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }, [user, isCEO, isBackoffice, isSeller]);

  useEffect(() => {
    if (!user) return;

    // Clean up existing channel before creating new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Use unique channel name per user to avoid conflicts
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
  }, [user?.id, handleSaleChange]);
}
