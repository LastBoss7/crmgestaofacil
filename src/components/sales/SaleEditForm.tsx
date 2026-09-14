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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  commission_rate: string;
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
  const { profile, user, isCEO } = useAuth();
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
    commission_rate: String(sale.commission_rate || 0),
    produtos: sale.produtos || '',
    observacoes_vendedor: sale.observacoes_vendedor || '',
  });

  // Use stored client_type; fallback to inference for legacy rows without it
  const [clientType, setClientType] = useState<'PJ' | 'PF'>(() => {
    if (sale.client_type === 'PF' || sale.client_type === 'PJ') return sale.client_type;
    const digits = (sale.cnpj_cliente || '').replace(/\D/g, '');
    return digits.length === 11 ? 'PF' : 'PJ';
  });
  
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  
  // Document management state
  const [existingDocuments, setExistingDocuments] = useState<string[]>(sale.documentos || []);
  const [removedDocuments, setRemovedDocuments] = useState<string[]>([]);
  const [newDocuments, setNewDocuments] = useState<File[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (clientType === 'PF') {
      updateForm('cnpj_cliente', maskCPF(value));
      return;
    }
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

  // Document management functions
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!validTypes.includes(file.type)) {
        toast.error(`Arquivo "${file.name}" não é suportado. Use PDF ou imagens.`);
        continue;
      }
      if (file.size > maxSize) {
        toast.error(`Arquivo "${file.name}" excede 10MB.`);
        continue;
      }
      validFiles.push(file);
    }
    
    setNewDocuments(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeNewDocument = (index: number) => {
    setNewDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingDocument = (path: string) => {
    setExistingDocuments(prev => prev.filter(p => p !== path));
    setRemovedDocuments(prev => prev.includes(path) ? prev : [...prev, path]);
  };


  const uploadNewDocuments = async (saleId: string): Promise<string[]> => {
    const urls: string[] = [];
    
    for (const file of newDocuments) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${saleId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('sale-documents')
        .upload(fileName, file);
      
      if (error) {
        console.error('Error uploading document:', error);
        toast.error(`Erro ao enviar ${file.name}`);
      } else {
        urls.push(fileName);
      }
    }
    
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (clientType !== 'PF' && clientType !== 'PJ') {
      toast.error("Tipo de cliente inválido: selecione 'PF' ou 'PJ'");
      return;
    }

    if (!form.cnpj_cliente.trim() || !form.razao_social.trim()) {
      toast.error(clientType === 'PF' ? 'CPF e Nome Completo são obrigatórios' : 'CNPJ e Razão Social são obrigatórios');
      return;
    }
    const docDigits = form.cnpj_cliente.replace(/\D/g, '');
    if (clientType === 'PF' && docDigits.length !== 11) {
      toast.error('CPF deve ter 11 dígitos');
      return;
    }
    if (clientType === 'PJ' && docDigits.length !== 14) {
      toast.error('CNPJ deve ter 14 dígitos');
      return;
    }
    const commissionRate = Number(form.commission_rate.replace(',', '.'));
    if (isCEO && (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100)) {
      toast.error('A taxa de comissão deve estar entre 0% e 100%');
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
        commission_rate: 'Taxa de Comissão',
        bl_valor: 'Valor BL',
        vivo_total_valor: 'Valor VIVO Total',
        movel_valor: 'Valor Móvel',
        data_venda: 'Data da Venda',
        tipo_negociacao: 'Tipo de Negociação',
      };

      Object.keys(form).forEach((key) => {
        const formKey = key as keyof FormData;
        const saleKey = key as keyof Sale;
        let formValue = form[formKey];
        const saleValue = sale[saleKey];
        
        // For produtos field, combine with plano_contratado
        if (key === 'produtos') {
          formValue = [form.plano_contratado, form.produtos]
            .filter(Boolean)
            .join(' | ') || '';
        }
        
        // Convert both to strings for comparison
        const formStr = formValue?.toString() || '';
        const saleStr = saleValue?.toString() || '';
        
        if (formStr !== saleStr) {
          // Handle numeric fields
          if (['bl_valor', 'vivo_total_valor', 'movel_valor', 'valor_mensal', 'commission_rate'].includes(key)) {
            updates[key] = parseFloat(form[formKey]) || 0;
          } else if (key === 'produtos') {
            // Use the combined value for produtos
            updates[key] = formValue || null;
          } else {
            updates[key] = form[formKey] || null;
          }
          
          changedFields.push({
            field: fieldLabels[key] || key,
            oldValue: saleStr || null,
            newValue: formStr || null,
          });
        }
      });

      if (!isCEO) delete updates.commission_rate;

      // Track client_type change (not in FormData)
      const previousClientType = (sale.client_type === 'PF' || sale.client_type === 'PJ')
        ? sale.client_type
        : ((sale.cnpj_cliente || '').replace(/\D/g, '').length === 11 ? 'PF' : 'PJ');
      if (clientType !== previousClientType) {
        updates.client_type = clientType;
        changedFields.push({
          field: 'Tipo de Cliente',
          oldValue: previousClientType,
          newValue: clientType,
        });
      }

      // Documents: handle removals + new uploads
      const originalDocs = sale.documentos || [];
      let allDocumentUrls = [...existingDocuments];
      if (newDocuments.length > 0) {
        setUploadingDocs(true);
        const newUrls = await uploadNewDocuments(sale.id);
        allDocumentUrls = [...allDocumentUrls, ...newUrls];
        setUploadingDocs(false);
      }

      const docsChanged =
        removedDocuments.length > 0 ||
        allDocumentUrls.length !== originalDocs.length ||
        allDocumentUrls.some((u, i) => u !== originalDocs[i]);

      if (docsChanged) {
        updates.documentos = allDocumentUrls;
        changedFields.push({
          field: 'Documentos',
          oldValue: `${originalDocs.length} arquivo(s)`,
          newValue: `${allDocumentUrls.length} arquivo(s)`,
        });
      }

      if (Object.keys(updates).length === 0 && newDocuments.length === 0 && removedDocuments.length === 0) {
        toast.info('Nenhuma alteração detectada');
        setLoading(false);
        return;
      }


      const { data: fnData, error: fnError } = await supabase.functions.invoke('update-sale', {
        body: { sale_id: sale.id, updates },
      });

      if (fnError) {
        // Tenta extrair mensagem do corpo de resposta (FunctionsHttpError)
        let serverMessage: string | null = null;
        try {
          const ctx: any = (fnError as any).context;
          if (ctx && typeof ctx.json === 'function') {
            const parsed = await ctx.json();
            serverMessage = parsed?.error ?? null;
          }
        } catch { /* ignore */ }
        throw new Error(serverMessage || fnError.message || 'Falha ao atualizar venda');
      }
      if (fnData?.error) throw new Error(fnData.error);

      // Record history for all changed fields
      if (changedFields.length > 0) {
        await recordChange(sale.id, changedFields);
      }

      // Add comment about the edit
      if (user && profile) {
        const changesSummary = changedFields.map(c => c.field).join(', ');
        if (changesSummary) {
          await supabase.from('sale_comments').insert({
            sale_id: sale.id,
            user_id: user.id,
            user_name: profile.nome,
            user_role: 'SELLER',
            message: `Campos editados: ${changesSummary}`,
            company_id: profile.company_id,
          });
        }
      }

      // Best-effort: remove deleted files from storage AFTER DB update succeeds
      if (removedDocuments.length > 0) {
        const { error: removeError } = await supabase.storage
          .from('sale-documents')
          .remove(removedDocuments);
        if (removeError) {
          console.warn('Falha ao remover arquivos do storage:', removeError);
        }
        setRemovedDocuments([]);
      }

      toast.success('Venda atualizada com sucesso!');
      onSuccess();
    } catch (error) {
      console.error('Error updating sale:', error);
      toast.error('Erro ao atualizar venda');
    } finally {
      setLoading(false);
      setUploadingDocs(false);
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
            <SectionHeader icon={Building2} title={clientType === 'PF' ? 'Dados do Cliente (Pessoa Física)' : 'Dados da Empresa'} />
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <Tabs
              value={clientType}
              onValueChange={(v) => {
                const next = v as 'PJ' | 'PF';
                setClientType(next);
                setForm(prev => ({ ...prev, cnpj_cliente: '', nome_fantasia: next === 'PF' ? '' : prev.nome_fantasia }));
              }}
              className="mb-4"
            >
              <TabsList>
                <TabsTrigger value="PJ">Pessoa Jurídica (CNPJ)</TabsTrigger>
                <TabsTrigger value="PF">Pessoa Física (CPF)</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cnpj_cliente">{clientType === 'PF' ? 'CPF *' : 'CNPJ *'}</Label>
                <div className="relative">
                  <Input
                    id="cnpj_cliente"
                    value={form.cnpj_cliente}
                    onChange={(e) => handleCnpjChange(e.target.value)}
                    placeholder={clientType === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                    maxLength={clientType === 'PF' ? 14 : 18}
                  />
                  {loadingCnpj && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="razao_social">{clientType === 'PF' ? 'Nome Completo *' : 'Razão Social *'}</Label>
                <Input
                  id="razao_social"
                  value={form.razao_social}
                  onChange={(e) => updateForm('razao_social', e.target.value)}
                  placeholder={clientType === 'PF' ? 'Nome completo do cliente' : 'Razão Social da empresa'}
                />
              </div>
              
              {clientType === 'PJ' && (
                <div className="space-y-2">
                  <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                  <Input
                    id="nome_fantasia"
                    value={form.nome_fantasia}
                    onChange={(e) => updateForm('nome_fantasia', e.target.value)}
                    placeholder="Nome Fantasia"
                  />
                </div>
              )}
              
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

              <div className="space-y-2">
                <Label htmlFor="tipo_negociacao">Tipo de Negociação</Label>
                <Select value={form.tipo_negociacao} onValueChange={(v) => updateForm('tipo_negociacao', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo Cliente</SelectItem>
                    <SelectItem value="portabilidade">Portabilidade</SelectItem>
                    <SelectItem value="upgrade">Upgrade</SelectItem>
                    <SelectItem value="migracao">Migração</SelectItem>
                    <SelectItem value="bl_solo">BL Solo</SelectItem>
                    <SelectItem value="vivo_total">VIVO TOTAL</SelectItem>
                    <SelectItem value="banda_larga">Banda Larga</SelectItem>
                    <SelectItem value="bl_tel_fixo">BL + Tel Fixo</SelectItem>
                    <SelectItem value="renovacao">Renovação</SelectItem>
                  </SelectContent>
                </Select>
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
              {isCEO && (
                <div className="space-y-2">
                  <Label htmlFor="commission_rate">Comissão desta venda (%)</Label>
                  <Input
                    id="commission_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={form.commission_rate}
                    onChange={(e) => updateForm('commission_rate', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Comissão estimada calculada sobre o valor mensal.</p>
                </div>
              )}
              
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

        {/* Documentos */}
        <AccordionItem value="documentos" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <SectionHeader icon={Upload} title={`Documentos (${existingDocuments.length + newDocuments.length})`} />
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4">
              {/* Existing Documents */}
              {existingDocuments.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Documentos Existentes</Label>
                  <div className="space-y-2">
                    {existingDocuments.map((doc, index) => {
                      const fileName = doc.split('/').pop() || doc;
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 border rounded-lg bg-muted/30"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <File className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-sm truncate">{fileName}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={async () => {
                                const { data, error } = await supabase.storage
                                  .from('sale-documents')
                                  .createSignedUrl(doc, 60 * 10);
                                if (error || !data?.signedUrl) {
                                  toast.error('Não foi possível gerar o link do documento');
                                  return;
                                }
                                window.open(data.signedUrl, '_blank');
                              }}
                              className="text-xs text-primary hover:underline"
                            >
                              Ver
                            </button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeExistingDocument(doc)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              title="Remover documento"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* New Documents to Upload */}
              {newDocuments.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Novos Documentos</Label>
                  <div className="space-y-2">
                    {newDocuments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 border rounded-lg border-primary/30 bg-primary/5"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <File className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-sm truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeNewDocument(index)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Button */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  multiple
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Documento
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Formatos aceitos: PDF, JPG, PNG, WEBP (máx. 10MB cada)
                </p>
              </div>
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
