import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSaleHistory } from '@/hooks/useSaleHistory';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Sale, SaleStatus, SALE_STATUS_LABELS } from '@/types/database';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface SaleStatusActionsProps {
  sale: Sale;
  onStatusUpdated: () => void;
  onClose: () => void;
}

export function SaleStatusActions({ sale, onStatusUpdated, onClose }: SaleStatusActionsProps) {
  const { isCEO, isBackoffice, isSeller, user, profile, role } = useAuth();
  const { recordStatusChange } = useSaleHistory();
  const [statusUpdate, setStatusUpdate] = useState({
    status: sale.status,
    motivo_pendencia: sale.motivo_pendencia || '',
  });
  const [loading, setLoading] = useState(false);

  const canApprove = isCEO || isBackoffice;
  const isOwner = sale.seller_id === user?.id;

  // Workflow status options based on role
  const getAvailableStatuses = (): SaleStatus[] => {
    if (isCEO) {
      // CEO pode fazer tudo
      return ['NOVA', 'EM_ANALISE', 'PENDENCIA', 'APROVADA', 'INSTALADA', 'CANCELADA'];
    }
    if (isBackoffice) {
      // Backoffice analisa, aprova ou devolve
      return ['EM_ANALISE', 'PENDENCIA', 'APROVADA', 'CANCELADA'];
    }
    if (isSeller && isOwner) {
      // Vendedor só pode colocar em análise (submeter para aprovação)
      if (sale.status === 'NOVA' || sale.status === 'PENDENCIA') {
        return ['EM_ANALISE'];
      }
    }
    return [];
  };

  const availableStatuses = getAvailableStatuses();

  const handleQuickAction = async (newStatus: SaleStatus, motivo?: string) => {
    setLoading(true);

    const oldStatus = sale.status;
    const updateData: Partial<Sale> = { status: newStatus };
    if (motivo) {
      updateData.motivo_pendencia = motivo;
    }

    const { error } = await supabase
      .from('sales')
      .update(updateData)
      .eq('id', sale.id);

    if (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    } else {
      // Record history
      await recordStatusChange(sale.id, oldStatus, newStatus);

      // Add comment about the status change
      if (user && profile && role) {
        await supabase.from('sale_comments').insert({
          sale_id: sale.id,
          user_id: user.id,
          user_name: profile.nome,
          user_role: role,
          message: `Status alterado para: ${SALE_STATUS_LABELS[newStatus]}${motivo ? ` - Motivo: ${motivo}` : ''}`,
        });
      }
      toast.success(`Status atualizado para: ${SALE_STATUS_LABELS[newStatus]}`);
      onStatusUpdated();
      onClose();
    }

    setLoading(false);
  };

  const handleStatusUpdate = async () => {
    if (!statusUpdate.status) return;

    if (statusUpdate.status === 'PENDENCIA' && !statusUpdate.motivo_pendencia.trim()) {
      toast.error('Informe o motivo da pendência');
      return;
    }

    await handleQuickAction(
      statusUpdate.status,
      statusUpdate.status === 'PENDENCIA' ? statusUpdate.motivo_pendencia : undefined
    );
  };

  // Quick actions for Backoffice/CEO
  if (canApprove && (sale.status === 'NOVA' || sale.status === 'EM_ANALISE')) {
    return (
      <div className="space-y-4 border-t pt-4">
        <h3 className="font-semibold text-sm">Ações Rápidas</h3>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant="default"
            size="sm"
            className="gap-2 bg-green-600 hover:bg-green-700"
            onClick={() => handleQuickAction('APROVADA')}
            disabled={loading}
          >
            <CheckCircle className="h-4 w-4" />
            Aprovar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-orange-300 text-orange-600 hover:bg-orange-50"
            onClick={() => setStatusUpdate({ ...statusUpdate, status: 'PENDENCIA' })}
            disabled={loading}
          >
            <AlertTriangle className="h-4 w-4" />
            Devolver com Pendência
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
            onClick={() => handleQuickAction('CANCELADA')}
            disabled={loading}
          >
            <XCircle className="h-4 w-4" />
            Cancelar
          </Button>
        </div>

        {statusUpdate.status === 'PENDENCIA' && (
          <div className="space-y-3 p-4 rounded-lg border border-orange-200 bg-orange-50">
            <Label className="text-orange-700">Motivo da Pendência *</Label>
            <Textarea
              placeholder="Ex: Falta de documentos, CNPJ inválido, etc..."
              value={statusUpdate.motivo_pendencia}
              onChange={(e) => setStatusUpdate({ ...statusUpdate, motivo_pendencia: e.target.value })}
              className="bg-white"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatusUpdate({ ...statusUpdate, status: sale.status })}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="bg-orange-600 hover:bg-orange-700"
                onClick={handleStatusUpdate}
                disabled={loading || !statusUpdate.motivo_pendencia.trim()}
              >
                Confirmar Pendência
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Seller submit for analysis
  if (isSeller && isOwner && (sale.status === 'NOVA' || sale.status === 'PENDENCIA')) {
    return (
      <div className="space-y-4 border-t pt-4">
        <h3 className="font-semibold text-sm">Ações</h3>
        <Button
          className="w-full gap-2"
          onClick={() => handleQuickAction('EM_ANALISE')}
          disabled={loading}
        >
          <Clock className="h-4 w-4" />
          Enviar para Análise
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Sua venda será analisada pelo Backoffice
        </p>
      </div>
    );
  }

  // CEO/Backoffice full control select
  if (isCEO || isBackoffice) {
    return (
      <div className="space-y-4 border-t pt-4">
        <h3 className="font-semibold text-sm">Alterar Status</h3>
        <div className="space-y-3">
          <Select
            value={statusUpdate.status}
            onValueChange={(v) => setStatusUpdate({ ...statusUpdate, status: v as SaleStatus })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              {availableStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {SALE_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {statusUpdate.status === 'PENDENCIA' && (
            <div className="space-y-2">
              <Label>Motivo da Pendência</Label>
              <Textarea
                placeholder="Descreva o motivo..."
                value={statusUpdate.motivo_pendencia}
                onChange={(e) => setStatusUpdate({ ...statusUpdate, motivo_pendencia: e.target.value })}
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleStatusUpdate} disabled={loading} className="flex-1">
              Salvar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}