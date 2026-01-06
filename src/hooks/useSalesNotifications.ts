import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Sale, SALE_STATUS_LABELS, SaleStatus } from '@/types/database';

interface SaleChangePayload {
  new: Sale;
  old: Sale;
}

export function useSalesNotifications() {
  const { user, isCEO, isBackoffice, isSeller } = useAuth();
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    if (!user || isSubscribedRef.current) return;

    isSubscribedRef.current = true;

    const channel = supabase
      .channel('sales-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sales',
        },
        (payload) => {
          const { new: newSale, old: oldSale } = payload as unknown as SaleChangePayload;
          
          // Only notify if status changed
          if (newSale.status === oldSale.status) return;

          // For sellers, only notify about their own sales
          if (isSeller && newSale.seller_id !== user.id) return;

          const clientName = newSale.nome_fantasia || newSale.razao_social;
          const oldStatus = SALE_STATUS_LABELS[oldSale.status as SaleStatus];
          const newStatus = SALE_STATUS_LABELS[newSale.status as SaleStatus];

          // Show different notifications based on status
          switch (newSale.status) {
            case 'APROVADA':
              toast.success(`🎉 Venda Aprovada!`, {
                description: `${clientName} foi aprovada`,
                duration: 5000,
              });
              break;
            case 'PENDENCIA':
              toast.warning(`⚠️ Venda com Pendência`, {
                description: `${clientName}: ${newSale.motivo_pendencia || 'Verifique a venda'}`,
                duration: 6000,
              });
              break;
            case 'CANCELADA':
              toast.error(`❌ Venda Cancelada`, {
                description: `${clientName} foi cancelada`,
                duration: 5000,
              });
              break;
            case 'EM_ANALISE':
              if (isCEO || isBackoffice) {
                toast.info(`📋 Nova Venda para Análise`, {
                  description: `${clientName} aguardando aprovação`,
                  duration: 4000,
                });
              }
              break;
            case 'INSTALADA':
              toast.success(`✅ Venda Instalada!`, {
                description: `${clientName} foi instalada com sucesso`,
                duration: 5000,
              });
              break;
            default:
              toast.info(`Status Atualizado`, {
                description: `${clientName}: ${oldStatus} → ${newStatus}`,
                duration: 4000,
              });
          }
        }
      )
      .subscribe();

    return () => {
      isSubscribedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [user, isCEO, isBackoffice, isSeller]);
}