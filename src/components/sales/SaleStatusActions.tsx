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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'VENDA_AUDITADA' | 'CANCELADA' | null;
  }>({ open: false, action: null });

  const canApprove = isCEO || isBackoffice;
  const isOwner = sale.seller_id === user?.id;

  // Workflow status options based on role
  const getAvailableStatuses = (): SaleStatus[] => {
    if (isCEO) {
      // CEO pode fazer tudo
      return ['PRE_ANALISE', 'AGUARDANDO_AUDITORIA', 'PENDENCIA', 'VENDA_AUDITADA', 'INSTALACAO_MARCADA', 'INSTALADA', 'CANCELADA', 'ACEITE_ENVIADO', 'CHAMADO_EM_ABERTO', 'DESCONECTADO'];
    }
    if (isBackoffice) {
      // Backoffice analisa, aprova ou devolve
      return ['AGUARDANDO_AUDITORIA', 'PENDENCIA', 'VENDA_AUDITADA', 'INSTALACAO_MARCADA', 'CANCELADA', 'ACEITE_ENVIADO', 'CHAMADO_EM_ABERTO', 'DESCONECTADO'];
    }
    if (isSeller && isOwner) {
      // Vendedor pode usar: Pré-Análise, Aguardando Auditoria, Aceite Enviado, Chamado em Aberto, Desconectado
      return ['PRE_ANALISE', 'AGUARDANDO_AUDITORIA', 'ACEITE_ENVIADO', 'CHAMADO_EM_ABERTO', 'DESCONECTADO'];
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
  if (canApprove && (sale.status === 'PRE_ANALISE' || sale.status === 'AGUARDANDO_AUDITORIA')) {
    return (
      <div className="space-y-4 border-t pt-4">
        <h3 className="font-semibold text-sm">Ações Rápidas</h3>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant="default"
            size="sm"
            className="gap-2 bg-green-600 hover:bg-green-700"
            onClick={() => setConfirmDialog({ open: true, action: 'VENDA_AUDITADA' })}
            disabled={loading}
          >
            <CheckCircle className="h-4 w-4" />
            Auditar Venda
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
            onClick={() => setStatusUpdate({ ...statusUpdate, status: 'PENDENCIA' })}
            disabled={loading}
          >
            <AlertTriangle className="h-4 w-4" />
            Devolver com Pendência
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-red-500/50 text-red-500 hover:bg-red-500/10"
            onClick={() => setConfirmDialog({ open: true, action: 'CANCELADA' })}
            disabled={loading}
          >
            <XCircle className="h-4 w-4" />
            Cancelar
          </Button>
        </div>

        <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open, action: null })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmDialog.action === 'VENDA_AUDITADA' ? 'Auditar Venda' : 'Cancelar Venda'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDialog.action === 'VENDA_AUDITADA'
                  ? 'Tem certeza que deseja marcar esta venda como auditada? Esta ação não poderá ser desfeita facilmente.'
                  : 'Tem certeza que deseja cancelar esta venda? Esta ação não poderá ser desfeita facilmente.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction
                className={confirmDialog.action === 'VENDA_AUDITADA' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-destructive hover:bg-destructive/90'}
                onClick={() => {
                  if (confirmDialog.action) {
                    handleQuickAction(confirmDialog.action);
                  }
                  setConfirmDialog({ open: false, action: null });
                }}
              >
                {confirmDialog.action === 'VENDA_AUDITADA' ? 'Sim, Auditar' : 'Sim, Cancelar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {statusUpdate.status === 'PENDENCIA' && (
          <div className="space-y-3 p-4 rounded-lg border border-orange-500/30 bg-orange-500/10">
            <Label className="text-orange-400">Motivo da Pendência *</Label>
            <Textarea
              placeholder="Ex: Falta de documentos, CNPJ inválido, etc..."
              value={statusUpdate.motivo_pendencia}
              onChange={(e) => setStatusUpdate({ ...statusUpdate, motivo_pendencia: e.target.value })}
              className="bg-card border-border"
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
                className="bg-orange-600 hover:bg-orange-700 text-white"
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

  // Seller full control select
  if (isSeller && isOwner && availableStatuses.length > 0) {
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