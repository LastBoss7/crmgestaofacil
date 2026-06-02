import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSaleHistory } from '@/hooks/useSaleHistory';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { CheckCircle, XCircle, Clock, AlertTriangle, Send, CalendarClock } from 'lucide-react';

interface SaleStatusActionsProps {
  sale: Sale;
  onStatusUpdated: () => void;
  onClose: () => void;
}

export function SaleStatusActions({ sale, onStatusUpdated, onClose }: SaleStatusActionsProps) {
  const { isCEO, isBackoffice, isSupervisor, isSeller, isCoordinator, user, profile, role } = useAuth();
  const { recordStatusChange } = useSaleHistory();
  const [statusUpdate, setStatusUpdate] = useState({
    status: sale.status,
    motivo_pendencia: sale.motivo_pendencia || '',
    motivo_cancelamento: sale.motivo_cancelamento || '',
  });
  const [instalacaoData, setInstalacaoData] = useState('');
  const [instalacaoHorario, setInstalacaoHorario] = useState('');
  const [justificativaCorrecao, setJustificativaCorrecao] = useState('');
  const [showJustificativaField, setShowJustificativaField] = useState(false);
  const [showCancellationReason, setShowCancellationReason] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'VENDA_AUDITADA' | null;
  }>({ open: false, action: null });

  const canApprove = isCEO || isBackoffice || isSupervisor || isCoordinator;
  const isOwner = sale.seller_id === user?.id;

  // Workflow status options based on role
  const getAvailableStatuses = (): SaleStatus[] => {
    if (isCEO) {
      // CEO pode fazer tudo
      return ['PRE_ANALISE', 'AGUARDANDO_AUDITORIA', 'PENDENCIA', 'VENDA_AUDITADA', 'INSTALACAO_MARCADA', 'INSTALADA', 'CANCELADA', 'ACEITE_ENVIADO', 'CHAMADO_EM_ABERTO', 'DESCONECTADO', 'ENVIADO_PARA_SAV', 'IMPUTADA'];
    }
    if (isCoordinator) {
      // Coordenador pode gerenciar vendas das equipes atribuídas
      return ['PRE_ANALISE', 'AGUARDANDO_AUDITORIA', 'PENDENCIA', 'VENDA_AUDITADA', 'INSTALACAO_MARCADA', 'INSTALADA', 'CANCELADA', 'ACEITE_ENVIADO', 'CHAMADO_EM_ABERTO', 'DESCONECTADO', 'ENVIADO_PARA_SAV', 'IMPUTADA'];
    }
    if (isBackoffice) {
      // Backoffice analisa, aprova ou devolve
      return ['AGUARDANDO_AUDITORIA', 'PENDENCIA', 'VENDA_AUDITADA', 'INSTALACAO_MARCADA', 'INSTALADA', 'CANCELADA', 'ACEITE_ENVIADO', 'CHAMADO_EM_ABERTO', 'DESCONECTADO', 'ENVIADO_PARA_SAV', 'IMPUTADA'];
    }
    if (isSupervisor) {
      // Supervisor pode gerenciar vendas da equipe
      return ['PRE_ANALISE', 'AGUARDANDO_AUDITORIA', 'PENDENCIA', 'VENDA_AUDITADA', 'INSTALACAO_MARCADA', 'INSTALADA', 'CANCELADA', 'ACEITE_ENVIADO', 'CHAMADO_EM_ABERTO', 'DESCONECTADO', 'ENVIADO_PARA_SAV', 'IMPUTADA'];
    }
    if (isSeller && isOwner) {
      // Vendedor pode usar: Pré-Análise, Aguardando Auditoria, Aceite Enviado, Chamado em Aberto, Desconectado, Enviado para SAV
      return ['PRE_ANALISE', 'AGUARDANDO_AUDITORIA', 'ACEITE_ENVIADO', 'CHAMADO_EM_ABERTO', 'DESCONECTADO', 'ENVIADO_PARA_SAV'];
    }
    return [];
  };

  const availableStatuses = getAvailableStatuses();

  const handleQuickAction = async (newStatus: SaleStatus, motivo?: string, justificativa?: string, motivoCancelamento?: string, dataInstalacao?: string, horarioInstalacao?: string) => {
    setLoading(true);

    const oldStatus = sale.status;
    const updateData: Record<string, unknown> = { status: newStatus };
    if (motivo) {
      updateData.motivo_pendencia = motivo;
    }
    if (motivoCancelamento && newStatus === 'CANCELADA') {
      updateData.motivo_cancelamento = motivoCancelamento;
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
        let message = `Status alterado para: ${SALE_STATUS_LABELS[newStatus]}`;
        if (motivo) {
          message += ` - Motivo: ${motivo}`;
        }
        if (justificativa) {
          message += ` - Correções realizadas: ${justificativa}`;
        }
        if (dataInstalacao && horarioInstalacao) {
          message += ` - Instalação agendada para: ${dataInstalacao} às ${horarioInstalacao}`;
        }
        
        await supabase.from('sale_comments').insert({
          sale_id: sale.id,
          user_id: user.id,
          user_name: profile.nome,
          user_role: role,
          message,
          company_id: profile.company_id,
        });
      }

      // Send notification to seller when status changes to PENDENCIA
      if (newStatus === 'PENDENCIA' && sale.seller_id && sale.seller_id !== user?.id) {
        await supabase.from('notifications').insert({
          user_id: sale.seller_id,
          title: '⚠️ Venda devolvida com pendência',
          message: `Sua venda para "${sale.razao_social}" foi devolvida. Motivo: ${motivo || 'Verifique os dados'}`,
          type: 'alert',
          reference_id: sale.id,
          reference_type: 'sale',
          company_id: sale.company_id,
        });
      }

      // Send notification to backoffice/supervisors when seller resubmits
      if (newStatus === 'AGUARDANDO_AUDITORIA' && oldStatus === 'PENDENCIA' && isSeller) {
        // Get backoffice users from the same team
        const { data: teamMembers } = await supabase
          .from('profiles')
          .select('id')
          .eq('team_id', profile?.team_id)
          .neq('id', user?.id);

        const { data: backofficeUsers } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'BACKOFFICE');

        const backofficeIds = backofficeUsers?.map(u => u.user_id) || [];
        const teamMemberIds = teamMembers?.map(m => m.id) || [];
        const notifyIds = backofficeIds.filter(id => teamMemberIds.includes(id));

        for (const userId of notifyIds) {
          await supabase.from('notifications').insert({
            user_id: userId,
            title: '🔄 Venda reenviada para auditoria',
            message: `${profile?.nome} corrigiu e reenviou a venda "${sale.razao_social}" para análise.${justificativa ? ` Justificativa: ${justificativa}` : ''}`,
            type: 'info',
            reference_id: sale.id,
            reference_type: 'sale',
            company_id: sale.company_id,
          });
        }
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

    if (statusUpdate.status === 'CANCELADA' && !statusUpdate.motivo_cancelamento.trim()) {
      toast.error('Informe o motivo do cancelamento');
      return;
    }

    if (statusUpdate.status === 'INSTALACAO_MARCADA' && (!instalacaoData || !instalacaoHorario)) {
      toast.error('Informe a data e horário da instalação');
      return;
    }

    await handleQuickAction(
      statusUpdate.status,
      statusUpdate.status === 'PENDENCIA' ? statusUpdate.motivo_pendencia : undefined,
      undefined,
      statusUpdate.status === 'CANCELADA' ? statusUpdate.motivo_cancelamento : undefined,
      statusUpdate.status === 'INSTALACAO_MARCADA' ? instalacaoData : undefined,
      statusUpdate.status === 'INSTALACAO_MARCADA' ? instalacaoHorario : undefined
    );
  };

  const handleCancellation = () => {
    if (!statusUpdate.motivo_cancelamento.trim()) {
      toast.error('Informe o motivo do cancelamento');
      return;
    }
    handleQuickAction('CANCELADA', undefined, undefined, statusUpdate.motivo_cancelamento);
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
            className="gap-2 border-teal-500/50 text-teal-500 hover:bg-teal-500/10"
            onClick={() => handleQuickAction('ACEITE_ENVIADO')}
            disabled={loading}
          >
            <Send className="h-4 w-4" />
            Aceite Enviado
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
            onClick={() => setShowCancellationReason(true)}
            disabled={loading}
          >
            <XCircle className="h-4 w-4" />
            Cancelar
          </Button>
        </div>

        <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open, action: null })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Auditar Venda</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja marcar esta venda como auditada? Esta ação não poderá ser desfeita facilmente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  handleQuickAction('VENDA_AUDITADA');
                  setConfirmDialog({ open: false, action: null });
                }}
              >
                Sim, Auditar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {showCancellationReason && (
          <div className="space-y-3 p-4 rounded-lg border border-destructive/30 bg-destructive/10">
            <Label className="text-destructive">Motivo do Cancelamento *</Label>
            <Textarea
              placeholder="Ex: Cliente desistiu, duplicidade, dados incorretos, sem viabilidade técnica..."
              value={statusUpdate.motivo_cancelamento}
              onChange={(e) => setStatusUpdate({ ...statusUpdate, motivo_cancelamento: e.target.value })}
              className="bg-card border-border"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowCancellationReason(false);
                  setStatusUpdate({ ...statusUpdate, motivo_cancelamento: '' });
                }}
              >
                Voltar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleCancellation}
                disabled={loading || !statusUpdate.motivo_cancelamento.trim()}
              >
                Confirmar Cancelamento
              </Button>
            </div>
          </div>
        )}

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

  // Seller quick action when sale is in PENDENCIA - needs to resend for review
  if (isSeller && isOwner && sale.status === 'PENDENCIA') {
    const handleResubmit = () => {
      if (!justificativaCorrecao.trim()) {
        toast.error('Informe o que foi corrigido antes de reenviar');
        return;
      }
      handleQuickAction('AGUARDANDO_AUDITORIA', undefined, justificativaCorrecao);
    };

    return (
      <div className="space-y-4 border-t pt-4">
        <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-amber-600">Venda com Pendência</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {sale.motivo_pendencia || 'Verifique os dados e corrija os problemas apontados.'}
              </p>
            </div>
          </div>
        </div>

        {!showJustificativaField ? (
          <>
            <h3 className="font-semibold text-sm">Ações</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="default"
                size="sm"
                className="gap-2"
                onClick={() => setShowJustificativaField(true)}
                disabled={loading}
              >
                <Clock className="h-4 w-4" />
                Reenviar para Auditoria
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleQuickAction('PRE_ANALISE')}
                disabled={loading}
              >
                Voltar para Pré-Análise
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Após corrigir os dados, clique em "Reenviar para Auditoria" para que o Backoffice analise novamente.
            </p>
          </>
        ) : (
          <div className="space-y-3 p-4 rounded-lg border border-primary/30 bg-primary/5">
            <Label>O que foi corrigido? *</Label>
            <Textarea
              placeholder="Ex: Corrigido CNPJ do cliente, adicionado documento de identidade, atualizado telefone..."
              value={justificativaCorrecao}
              onChange={(e) => setJustificativaCorrecao(e.target.value)}
              className="bg-card border-border min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              Descreva as correções realizadas para ajudar na análise do Backoffice
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowJustificativaField(false);
                  setJustificativaCorrecao('');
                }}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleResubmit}
                disabled={loading || !justificativaCorrecao.trim()}
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Confirmar e Reenviar
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Seller full control select for other statuses
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
            <Button
              onClick={handleStatusUpdate}
              disabled={
                loading ||
                (statusUpdate.status === 'CANCELADA' && !statusUpdate.motivo_cancelamento.trim())
              }
              className="flex-1"
            >
              Salvar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // CEO/Backoffice/Supervisor full control select
  if (isCEO || isBackoffice || isSupervisor) {
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
              <Label>Motivo da Pendência *</Label>
              <Textarea
                placeholder="Descreva o motivo..."
                value={statusUpdate.motivo_pendencia}
                onChange={(e) => setStatusUpdate({ ...statusUpdate, motivo_pendencia: e.target.value })}
              />
            </div>
          )}

          {statusUpdate.status === 'CANCELADA' && (
            <div className="space-y-2">
              <Label>Motivo do Cancelamento *</Label>
              <Textarea
                placeholder="Ex: Cliente desistiu, duplicidade, dados incorretos, sem viabilidade técnica..."
                value={statusUpdate.motivo_cancelamento}
                onChange={(e) => setStatusUpdate({ ...statusUpdate, motivo_cancelamento: e.target.value })}
              />
            </div>
          )}

          {statusUpdate.status === 'INSTALACAO_MARCADA' && (
            <div className="space-y-3 p-4 rounded-lg border border-primary/30 bg-primary/5">
              <div className="flex items-center gap-2 text-primary">
                <CalendarClock className="h-4 w-4" />
                <Label className="text-primary font-medium">Agendamento da Instalação *</Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Data</Label>
                  <Input
                    type="date"
                    value={instalacaoData}
                    onChange={(e) => setInstalacaoData(e.target.value)}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Horário</Label>
                  <Input
                    type="time"
                    value={instalacaoHorario}
                    onChange={(e) => setInstalacaoHorario(e.target.value)}
                    className="bg-card"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleStatusUpdate}
              disabled={
                loading ||
                (statusUpdate.status === 'CANCELADA' && !statusUpdate.motivo_cancelamento.trim()) ||
                (statusUpdate.status === 'PENDENCIA' && !statusUpdate.motivo_pendencia.trim()) ||
                (statusUpdate.status === 'INSTALACAO_MARCADA' && (!instalacaoData || !instalacaoHorario))
              }
              className="flex-1"
            >
              Salvar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}