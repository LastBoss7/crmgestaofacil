import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Building2, 
  User, 
  Phone, 
  MapPin, 
  CreditCard,
  FileText,
  Calendar,
  Briefcase,
  Users,
  Info,
  History
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { StatusBadge } from '@/components/ui/status-badge';
import { Sale, Profile } from '@/types/database';
import { SaleTimeline } from './SaleTimeline';

interface SaleDetailsProps {
  sale: Sale;
  seller?: Profile;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (date: string | null | undefined) => {
  if (!date) return '-';
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
};

const InfoField = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
  <div className="space-y-1">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <p className="font-medium text-sm">{value || '-'}</p>
  </div>
);

const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="flex items-center gap-2">
    <Icon className="h-4 w-4 text-primary" />
    <span className="font-semibold">{title}</span>
  </div>
);

export function SaleDetails({ sale, seller }: SaleDetailsProps) {
  const NEGOTIATION_TYPE_LABELS: Record<string, string> = {
    novo: 'Novo Cliente',
    portabilidade: 'Portabilidade',
    upgrade: 'Upgrade',
    migracao: 'Migração',
    bl_solo: 'BL Solo',
    vivo_total: 'VIVO TOTAL',
    banda_larga: 'Banda Larga',
  };

  return (
    <div className="space-y-4">
      {/* Header Info - Always visible */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h3 className="font-bold text-lg">{sale.nome_fantasia || sale.razao_social}</h3>
            <p className="text-sm text-muted-foreground">{sale.cnpj_cliente}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={sale.status} />
            <p className="text-2xl font-bold text-primary">{formatCurrency(Number(sale.valor_mensal))}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t">
          <InfoField label="Data da Venda" value={formatDate(sale.data_venda)} />
          <InfoField label="Equipe" value={sale.equipe} />
          <InfoField label="Tipo de Negociação" value={NEGOTIATION_TYPE_LABELS[sale.tipo_negociacao || ''] || sale.tipo_negociacao} />
          <InfoField label="Vendedor" value={seller?.nome} />
        </div>
      </div>

      <Accordion type="multiple" defaultValue={['empresa', 'contatos']} className="space-y-2">
        {/* Dados da Empresa */}
        <AccordionItem value="empresa" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <SectionHeader icon={Building2} title="Dados da Empresa" />
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoField label="CNPJ" value={sale.cnpj_cliente} />
              <InfoField label="Razão Social" value={sale.razao_social} />
              <InfoField label="Nome Fantasia" value={sale.nome_fantasia} />
              <InfoField label="E-mail" value={sale.email} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Contatos */}
        <AccordionItem value="contatos" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <SectionHeader icon={Phone} title="Contatos" />
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoField label="Contato Responsável" value={sale.contato_responsavel} />
              <InfoField label="Telefone Responsável" value={sale.telefone_responsavel} />
              <InfoField label="Telefone 1" value={sale.telefone_1} />
              <InfoField label="Telefone 2" value={sale.telefone_2} />
              <InfoField label="Telefone Portabilidade" value={sale.telefone_portabilidade} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Endereço de Instalação */}
        <AccordionItem value="endereco" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <SectionHeader icon={MapPin} title="Endereço de Instalação" />
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <InfoField 
                  label="Endereço Completo" 
                  value={[
                    sale.endereco_rua,
                    sale.endereco_numero && `nº ${sale.endereco_numero}`,
                    sale.endereco_bairro,
                    sale.endereco_cidade,
                  ].filter(Boolean).join(', ') || '-'} 
                />
              </div>
              <InfoField label="CEP" value={sale.endereco_cep} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Proprietário */}
        <AccordionItem value="proprietario" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <SectionHeader icon={User} title="Dados do Proprietário" />
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoField label="Nome" value={sale.proprietario_nome} />
              <InfoField label="CPF" value={sale.proprietario_cpf} />
              <InfoField label="RG" value={sale.proprietario_rg} />
              <InfoField label="Nome da Mãe" value={sale.proprietario_mae} />
              <InfoField label="Data de Nascimento" value={formatDate(sale.proprietario_nascimento)} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Gestor de Conta */}
        <AccordionItem value="gestor" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <SectionHeader icon={Briefcase} title="Dados do Gestor de Conta" />
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoField label="Nome" value={sale.gestor_nome} />
              <InfoField label="CPF" value={sale.gestor_cpf} />
              <InfoField label="RG" value={sale.gestor_rg} />
              <InfoField label="Nome da Mãe" value={sale.gestor_mae} />
              <InfoField label="Data de Nascimento" value={formatDate(sale.gestor_nascimento)} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Cedente da Linha */}
        <AccordionItem value="cedente" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <SectionHeader icon={Users} title="Dados do Cedente da Linha" />
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoField label="Nome" value={sale.cedente_nome} />
              <InfoField label="CPF" value={sale.cedente_cpf} />
              <InfoField label="RG" value={sale.cedente_rg} />
              <InfoField label="Nome da Mãe" value={sale.cedente_mae} />
              <InfoField label="Data de Nascimento" value={formatDate(sale.cedente_nascimento)} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Plano Contratado */}
        <AccordionItem value="plano" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <SectionHeader icon={CreditCard} title="Plano Contratado" />
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoField label="Produtos/Serviços" value={sale.produtos} />
              <InfoField label="Plano Contratado" value={sale.plano_contratado} />
              <InfoField label="Valor Mensal Total" value={formatCurrency(Number(sale.valor_mensal))} />
              <div />
              <InfoField label="Valor BL" value={formatCurrency(Number(sale.bl_valor || 0))} />
              <InfoField label="Valor VIVO Total" value={formatCurrency(Number(sale.vivo_total_valor || 0))} />
              <InfoField label="Valor Móvel" value={formatCurrency(Number(sale.movel_valor || 0))} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Informações Adicionais */}
        <AccordionItem value="info" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <SectionHeader icon={Info} title="Informações Adicionais" />
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Observações do Vendedor</Label>
                <p className="font-medium text-sm whitespace-pre-wrap">{sale.observacoes_vendedor || '-'}</p>
              </div>
              {sale.motivo_pendencia && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <Label className="text-xs text-amber-400">Motivo da Pendência</Label>
                  <p className="text-sm text-amber-300 whitespace-pre-wrap">{sale.motivo_pendencia}</p>
                </div>
              )}
              {sale.status === 'CANCELADA' && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                  <Label className="text-xs text-destructive">Motivo do Cancelamento</Label>
                  <p className="text-sm text-destructive whitespace-pre-wrap">
                    {(sale as any).motivo_cancelamento || 'Não informado'}
                  </p>
                </div>
              )}
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                <InfoField label="Criado em" value={format(new Date(sale.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} />
                <InfoField label="Última atualização" value={format(new Date(sale.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Histórico e Timeline */}
        <AccordionItem value="historico" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <SectionHeader icon={History} title="Histórico de Alterações" />
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <SaleTimeline saleId={sale.id} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
