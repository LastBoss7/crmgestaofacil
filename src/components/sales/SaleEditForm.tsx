import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Calendar, Building2, Phone, MapPin, User, Users, FileText, DollarSign, Loader2, Upload, X, File, Target, Plus, Trash2, Save, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useSaleHistory } from '@/hooks/useSaleHistory';
import { Sale } from '@/types/database';
import { maskCPF, maskCNPJ, maskCEP, maskPhone } from '@/lib/masks';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface SaleEditFormProps {
  sale: Sale;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  data_venda: string;
  tipo_negociacao: string;
  cnpj_cliente: string;
  razao_social: string;
  nome_fantasia: string;
  email: string;
  telefone_1: string;
  telefone_2: string;
  telefone_portabilidade: string;
  endereco_rua: string;
  endereco_numero: string;
  endereco_bairro: string;
  endereco_cidade: string;
  endereco_cep: string;
  proprietario_nome: string;
  proprietario_cpf: string;
  proprietario_rg: string;
  proprietario_nascimento: string;
  proprietario_mae: string;
  gestor_nome: string;
  gestor_cpf: string;
  gestor_rg: string;
  gestor_nascimento: string;
  gestor_mae: string;
  cedente_nome: string;
  cedente_cpf: string;
  cedente_rg: string;
  cedente_nascimento: string;
  cedente_mae: string;
  plano_contratado: string;
  bl_valor: string;
  vivo_total_valor: string;
  movel_valor: string;
  valor_mensal: string;
  produtos: string;
  observacoes_vendedor: string;
}

const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="flex items-center gap-2">
    <Icon className="h-4 w-4 text-primary" />
    <span className="font-semibold">{title}</span>
  </div>
);

export const SaleEditForm = ({ sale, onSuccess, onCancel }: SaleEditFormProps) => {
  const { profile, user } = useAuth();
  const { recordChange } = useSaleHistory();
  
  const [form, setForm] = useState<FormData>({
    data_venda: sale.data_venda || '',
    tipo_negociacao: sale.tipo_negociacao || '',
    cnpj_cliente: sale.cnpj_cliente || '',
    razao_social: sale.razao_social || '',
    nome_fantasia: sale.nome_fantasia || '',
    email: sale.email || '',
    telefone_1: sale.telefone_1 || '',
    telefone_2: sale.telefone_2 || '',
    telefone_portabilidade: sale.telefone_portabilidade || '',
    endereco_rua: sale.endereco_rua || '',
    endereco_numero: sale.endereco_numero || '',
    endereco_bairro: sale.endereco_bairro || '',
    endereco_cidade: sale.endereco_cidade || '',
    endereco_cep: sale.endereco_cep || '',
    proprietario_nome: sale.proprietario_nome || '',
    proprietario_cpf: sale.proprietario_cpf || '',
    proprietario_rg: sale.proprietario_rg || '',
    proprietario_nascimento: sale.proprietario_nascimento || '',
    proprietario_mae: sale.proprietario_mae || '',
    gestor_nome: sale.gestor_nome || '',
    gestor_cpf: sale.gestor_cpf || '',
    gestor_rg: sale.gestor_rg || '',
    gestor_nascimento: sale.gestor_nascimento || '',
    gestor_mae: sale.gestor_mae || '',
    cedente_nome: sale.cedente_nome || '',
    cedente_cpf: sale.cedente_cpf || '',
    cedente_rg: sale.cedente_rg || '',
    cedente_nascimento: sale.cedente_nascimento || '',
    cedente_mae: sale.cedente_mae || '',
    plano_contratado: sale.plano_contratado || '',
    bl_valor: String(sale.bl_valor || ''),
    vivo_total_valor: String(sale.vivo_total_valor || ''),
    movel_valor: String(sale.movel_valor || ''),
    valor_mensal: String(sale.valor_mensal || ''),
    produtos: sale.produtos || '',
    observacoes_vendedor: sale.observacoes_vendedor || '',
  });
  
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);

  const updateForm = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const fetchCompanyByCnpj = async (cnpj: string) => {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) return;

    setLoadingCnpj(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      const data = await response.json();
      
      if (data.message || response.status !== 200) {
        toast.error('CNPJ não encontrado');
        return;
      }

      setForm(prev => ({
        ...prev,
        razao_social: data.razao_social || prev.razao_social,
        nome_fantasia: data.nome_fantasia || prev.nome_fantasia,
        email: data.email || prev.email,
        telefone_1: data.ddd_telefone_1?.replace(/\D/g, '') || prev.telefone_1,
        telefone_2: data.ddd_telefone_2?.replace(/\D/g, '') || prev.telefone_2,
        endereco_rua: data.logradouro || prev.endereco_rua,
        endereco_numero: data.numero || prev.endereco_numero,
        endereco_bairro: data.bairro || prev.endereco_bairro,
        endereco_cidade: data.municipio || prev.endereco_cidade,
        endereco_cep: data.cep?.replace(/\D/g, '') || prev.endereco_cep,
      }));
      toast.success('Dados da empresa preenchidos automaticamente');
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error);
      toast.error('Erro ao buscar dados do CNPJ');
    } finally {
      setLoadingCnpj(false);
    }
  };

  const handleCnpjChange = (value: string) => {
    const maskedValue = maskCNPJ(value);
    updateForm('cnpj_cliente', maskedValue);
    const cleanCnpj = maskedValue.replace(/\D/g, '');
    if (cleanCnpj.length === 14) {
      fetchCompanyByCnpj(cleanCnpj);
    }
  };

  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      setForm(prev => ({
        ...prev,
        endereco_rua: data.logradouro || prev.endereco_rua,
        endereco_bairro: data.bairro || prev.endereco_bairro,
        endereco_cidade: data.localidade || prev.endereco_cidade,
      }));
      toast.success('Endereço preenchido automaticamente');
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast.error('Erro ao buscar CEP');
    } finally {
      setLoadingCep(false);
    }
  };

  const handleCepChange = (value: string) => {
    const maskedValue = maskCEP(value);
    updateForm('endereco_cep', maskedValue);
    const cleanCep = maskedValue.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      fetchAddressByCep(cleanCep);
    }
  };

  const handlePhoneChange = (field: 'telefone_1' | 'telefone_2' | 'telefone_portabilidade', value: string) => {
    const maskedValue = maskPhone(value);
    updateForm(field, maskedValue);
  };

  const handleCpfChange = (field: 'proprietario_cpf' | 'gestor_cpf' | 'cedente_cpf', value: string) => {
    const maskedValue = maskCPF(value);
    updateForm(field, maskedValue);
  };

  const totalPlano = (
    (parseFloat(form.bl_valor) || 0) +
    (parseFloat(form.vivo_total_valor) || 0) +
    (parseFloat(form.movel_valor) || 0)
  ).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.cnpj_cliente.trim() || !form.razao_social.trim()) {
      toast.error('CNPJ e Razão Social são obrigatórios');
      return;
    }

    setLoading(true);

    try {
      // Build update object with only changed fields
      const updates: Record<string, any> = {};
      const changedFields: { field: string; oldValue: string | null; newValue: string | null }[] = [];
      
      // Compare and track changes
      const fieldLabels: Record<string, string> = {
        cnpj_cliente: 'CNPJ',
        razao_social: 'Razão Social',
        nome_fantasia: 'Nome Fantasia',
        email: 'E-mail',
        telefone_1: 'Telefone 1',
        telefone_2: 'Telefone 2',
        telefone_portabilidade: 'Telefone Portabilidade',
        endereco_rua: 'Endereço Rua',
        endereco_numero: 'Endereço Número',
        endereco_bairro: 'Endereço Bairro',
        endereco_cidade: 'Endereço Cidade',
        endereco_cep: 'Endereço CEP',
        proprietario_nome: 'Nome Proprietário',
        proprietario_cpf: 'CPF Proprietário',
        proprietario_rg: 'RG Proprietário',
        proprietario_nascimento: 'Nascimento Proprietário',
        proprietario_mae: 'Mãe Proprietário',
        gestor_nome: 'Nome Gestor',
        gestor_cpf: 'CPF Gestor',
        gestor_rg: 'RG Gestor',
        gestor_nascimento: 'Nascimento Gestor',
        gestor_mae: 'Mãe Gestor',
        cedente_nome: 'Nome Cedente',
        cedente_cpf: 'CPF Cedente',
        cedente_rg: 'RG Cedente',
        cedente_nascimento: 'Nascimento Cedente',
        cedente_mae: 'Mãe Cedente',
        plano_contratado: 'Plano Contratado',
        produtos: 'Produtos',
        observacoes_vendedor: 'Observações',
        valor_mensal: 'Valor Mensal',
        bl_valor: 'Valor BL',
        vivo_total_valor: 'Valor VIVO Total',
        movel_valor: 'Valor Móvel',
        data_venda: 'Data da Venda',
        tipo_negociacao: 'Tipo de Negociação',
      };

      Object.keys(form).forEach((key) => {
        const formKey = key as keyof FormData;
        const saleKey = key as keyof Sale;
        const formValue = form[formKey];
        const saleValue = sale[saleKey];
        
        // Convert both to strings for comparison
        const formStr = formValue?.toString() || '';
        const saleStr = saleValue?.toString() || '';
        
        if (formStr !== saleStr) {
          // Handle numeric fields
          if (['bl_valor', 'vivo_total_valor', 'movel_valor', 'valor_mensal'].includes(key)) {
            updates[key] = parseFloat(formValue) || 0;
          } else {
            updates[key] = formValue || null;
          }
          
          changedFields.push({
            field: fieldLabels[key] || key,
            oldValue: saleStr || null,
            newValue: formStr || null,
          });
        }
      });

      if (Object.keys(updates).length === 0) {
        toast.info('Nenhuma alteração detectada');
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('sales')
        .update(updates)
        .eq('id', sale.id);

      if (error) throw error;

      // Record history for all changed fields
      if (changedFields.length > 0) {
        await recordChange(sale.id, changedFields);
      }

      // Add comment about the edit
      if (user && profile) {
        const changesSummary = changedFields.map(c => c.field).join(', ');
        await supabase.from('sale_comments').insert({
          sale_id: sale.id,
          user_id: user.id,
          user_name: profile.nome,
          user_role: 'SELLER',
          message: `Campos editados: ${changesSummary}`,
          company_id: profile.company_id,
        });
      }

      toast.success('Venda atualizada com sucesso!');
      onSuccess();
    } catch (error) {
      console.error('Error updating sale:', error);
      toast.error('Erro ao atualizar venda');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Pendency Alert */}
      {sale.status === 'PENDENCIA' && sale.motivo_pendencia && (
        <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-600">Motivo da Pendência</h4>
              <p className="text-sm text-muted-foreground mt-1">{sale.motivo_pendencia}</p>
            </div>
          </div>
        </div>
      )}

      <Accordion type="multiple" defaultValue={['empresa', 'contatos']} className="space-y-2">
        {/* Dados da Empresa */}
        <AccordionItem value="empresa" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <SectionHeader icon={Building2} title="Dados da Empresa" />
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cnpj_cliente">CNPJ *</Label>
                <div className="relative">
                  <Input
                    id="cnpj_cliente"
                    value={form.cnpj_cliente}
                    onChange={(e) => handleCnpjChange(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                  />
                  {loadingCnpj && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="razao_social">Razão Social *</Label>
                <Input
                  id="razao_social"
                  value={form.razao_social}
                  onChange={(e) => updateForm('razao_social', e.target.value)}
                  placeholder="Razão Social da empresa"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                <Input
                  id="nome_fantasia"
                  value={form.nome_fantasia}
                  onChange={(e) => updateForm('nome_fantasia', e.target.value)}
                  placeholder="Nome Fantasia"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateForm('email', e.target.value)}
                  placeholder="email@empresa.com"
                />
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="telefone_1">Telefone 1 *</Label>
                <Input
                  id="telefone_1"
                  value={form.telefone_1}
                  onChange={(e) => handlePhoneChange('telefone_1', e.target.value)}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="telefone_2">Telefone 2</Label>
                <Input
                  id="telefone_2"
                  value={form.telefone_2}
                  onChange={(e) => handlePhoneChange('telefone_2', e.target.value)}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>
              
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="telefone_portabilidade">Telefone(s) Portabilidade</Label>
                <Input
                  id="telefone_portabilidade"
                  value={form.telefone_portabilidade}
                  onChange={(e) => updateForm('telefone_portabilidade', e.target.value)}
                  placeholder="(00) 00000-0000 - Operadora | (00) 00000-0000 - Operadora"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Endereço */}
        <AccordionItem value="endereco" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <SectionHeader icon={MapPin} title="Endereço de Instalação" />
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="endereco_cep">CEP</Label>
                <div className="relative">
                  <Input
                    id="endereco_cep"
                    value={form.endereco_cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  {loadingCep && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endereco_cidade">Cidade</Label>
                <Input
                  id="endereco_cidade"
                  value={form.endereco_cidade}
                  onChange={(e) => updateForm('endereco_cidade', e.target.value)}
                  placeholder="Cidade"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endereco_rua">Rua</Label>
                <Input
                  id="endereco_rua"
                  value={form.endereco_rua}
                  onChange={(e) => updateForm('endereco_rua', e.target.value)}
                  placeholder="Rua / Avenida"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endereco_numero">Número</Label>
                <Input
                  id="endereco_numero"
                  value={form.endereco_numero}
                  onChange={(e) => updateForm('endereco_numero', e.target.value)}
                  placeholder="Número"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endereco_bairro">Bairro</Label>
                <Input
                  id="endereco_bairro"
                  value={form.endereco_bairro}
                  onChange={(e) => updateForm('endereco_bairro', e.target.value)}
                  placeholder="Bairro"
                />
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="proprietario_nome">Nome</Label>
                <Input
                  id="proprietario_nome"
                  value={form.proprietario_nome}
                  onChange={(e) => updateForm('proprietario_nome', e.target.value)}
                  placeholder="Nome completo"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="proprietario_cpf">CPF</Label>
                <Input
                  id="proprietario_cpf"
                  value={form.proprietario_cpf}
                  onChange={(e) => handleCpfChange('proprietario_cpf', e.target.value)}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="proprietario_rg">RG</Label>
                <Input
                  id="proprietario_rg"
                  value={form.proprietario_rg}
                  onChange={(e) => updateForm('proprietario_rg', e.target.value)}
                  placeholder="RG"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="proprietario_nascimento">Data de Nascimento</Label>
                <Input
                  id="proprietario_nascimento"
                  type="date"
                  value={form.proprietario_nascimento}
                  onChange={(e) => updateForm('proprietario_nascimento', e.target.value)}
                />
              </div>
              
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="proprietario_mae">Nome da Mãe</Label>
                <Input
                  id="proprietario_mae"
                  value={form.proprietario_mae}
                  onChange={(e) => updateForm('proprietario_mae', e.target.value)}
                  placeholder="Nome da mãe"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Gestor */}
        <AccordionItem value="gestor" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <SectionHeader icon={Users} title="Dados do Gestor de Conta" />
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gestor_nome">Nome</Label>
                <Input
                  id="gestor_nome"
                  value={form.gestor_nome}
                  onChange={(e) => updateForm('gestor_nome', e.target.value)}
                  placeholder="Nome completo"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="gestor_cpf">CPF</Label>
                <Input
                  id="gestor_cpf"
                  value={form.gestor_cpf}
                  onChange={(e) => handleCpfChange('gestor_cpf', e.target.value)}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="gestor_rg">RG</Label>
                <Input
                  id="gestor_rg"
                  value={form.gestor_rg}
                  onChange={(e) => updateForm('gestor_rg', e.target.value)}
                  placeholder="RG"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="gestor_nascimento">Data de Nascimento</Label>
                <Input
                  id="gestor_nascimento"
                  type="date"
                  value={form.gestor_nascimento}
                  onChange={(e) => updateForm('gestor_nascimento', e.target.value)}
                />
              </div>
              
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="gestor_mae">Nome da Mãe</Label>
                <Input
                  id="gestor_mae"
                  value={form.gestor_mae}
                  onChange={(e) => updateForm('gestor_mae', e.target.value)}
                  placeholder="Nome da mãe"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Cedente */}
        <AccordionItem value="cedente" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <SectionHeader icon={Users} title="Dados do Cedente da Linha" />
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cedente_nome">Nome</Label>
                <Input
                  id="cedente_nome"
                  value={form.cedente_nome}
                  onChange={(e) => updateForm('cedente_nome', e.target.value)}
                  placeholder="Nome completo"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cedente_cpf">CPF</Label>
                <Input
                  id="cedente_cpf"
                  value={form.cedente_cpf}
                  onChange={(e) => handleCpfChange('cedente_cpf', e.target.value)}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cedente_rg">RG</Label>
                <Input
                  id="cedente_rg"
                  value={form.cedente_rg}
                  onChange={(e) => updateForm('cedente_rg', e.target.value)}
                  placeholder="RG"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cedente_nascimento">Data de Nascimento</Label>
                <Input
                  id="cedente_nascimento"
                  type="date"
                  value={form.cedente_nascimento}
                  onChange={(e) => updateForm('cedente_nascimento', e.target.value)}
                />
              </div>
              
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cedente_mae">Nome da Mãe</Label>
                <Input
                  id="cedente_mae"
                  value={form.cedente_mae}
                  onChange={(e) => updateForm('cedente_mae', e.target.value)}
                  placeholder="Nome da mãe"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Plano e Valores */}
        <AccordionItem value="plano" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <SectionHeader icon={DollarSign} title="Plano e Valores" />
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="produtos">Produtos/Serviços</Label>
                <Textarea
                  id="produtos"
                  value={form.produtos}
                  onChange={(e) => updateForm('produtos', e.target.value)}
                  placeholder="Descreva os produtos e serviços contratados"
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="plano_contratado">Plano Contratado</Label>
                <Input
                  id="plano_contratado"
                  value={form.plano_contratado}
                  onChange={(e) => updateForm('plano_contratado', e.target.value)}
                  placeholder="Nome do plano"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="valor_mensal">Valor Mensal Total (R$)</Label>
                <Input
                  id="valor_mensal"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.valor_mensal}
                  onChange={(e) => updateForm('valor_mensal', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bl_valor">Valor BL (R$)</Label>
                <Input
                  id="bl_valor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.bl_valor}
                  onChange={(e) => updateForm('bl_valor', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="vivo_total_valor">Valor VIVO Total (R$)</Label>
                <Input
                  id="vivo_total_valor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.vivo_total_valor}
                  onChange={(e) => updateForm('vivo_total_valor', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="movel_valor">Valor Móvel (R$)</Label>
                <Input
                  id="movel_valor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.movel_valor}
                  onChange={(e) => updateForm('movel_valor', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Observações */}
        <AccordionItem value="observacoes" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <SectionHeader icon={FileText} title="Observações" />
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-2">
              <Label htmlFor="observacoes_vendedor">Observações do Vendedor</Label>
              <Textarea
                id="observacoes_vendedor"
                value={form.observacoes_vendedor}
                onChange={(e) => updateForm('observacoes_vendedor', e.target.value)}
                placeholder="Observações adicionais sobre a venda..."
                rows={4}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} className="gap-2">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
