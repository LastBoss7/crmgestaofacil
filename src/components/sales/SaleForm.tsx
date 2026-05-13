import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Building2, Phone, MapPin, User, Users, FileText, DollarSign, Loader2, Upload, X, File, Target, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { maskCPF, maskCNPJ, maskCEP, maskPhone } from '@/lib/masks';

const saleSchema = z.object({
  cnpj_cliente: z.string().trim().min(14, 'CNPJ inválido'),
  razao_social: z.string().trim().min(2, 'Razão social obrigatória'),
  email: z.string().email('E-mail inválido').or(z.literal('')),
  telefone_1: z.string().trim().min(10, 'Telefone 1 obrigatório'),
  telefone_2: z.string().trim().min(10, 'Telefone 2 obrigatório'),
});

interface SaleFormProps {
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  // Info básica
  data_venda: string;
  tipo_negociacao: string;
  // Dados empresa
  cnpj_cliente: string;
  razao_social: string;
  nome_fantasia: string;
  email: string;
  // Contatos
  telefone_1: string;
  telefone_2: string;
  telefone_portabilidade: string;
  // Endereço
  endereco_rua: string;
  endereco_numero: string;
  endereco_bairro: string;
  endereco_cidade: string;
  endereco_cep: string;
  // Proprietário
  proprietario_nome: string;
  proprietario_cpf: string;
  proprietario_rg: string;
  proprietario_nascimento: string;
  proprietario_mae: string;
  // Gestor
  gestor_nome: string;
  gestor_cpf: string;
  gestor_rg: string;
  gestor_nascimento: string;
  gestor_mae: string;
  // Cedente
  cedente_nome: string;
  cedente_cpf: string;
  cedente_rg: string;
  cedente_nascimento: string;
  cedente_mae: string;
  // Plano
  plano_contratado: string;
  bl_valor: string;
  vivo_total_valor: string;
  movel_valor: string;
  valor_mensal: string;
  // Outros
  produtos: string;
  observacoes_vendedor: string;
  campaign_id: string;
}

const initialFormData: FormData = {
  data_venda: (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })(),
  tipo_negociacao: '',
  cnpj_cliente: '',
  razao_social: '',
  nome_fantasia: '',
  email: '',
  telefone_1: '',
  telefone_2: '',
  telefone_portabilidade: '',
  endereco_rua: '',
  endereco_numero: '',
  endereco_bairro: '',
  endereco_cidade: '',
  endereco_cep: '',
  proprietario_nome: '',
  proprietario_cpf: '',
  proprietario_rg: '',
  proprietario_nascimento: '',
  proprietario_mae: '',
  gestor_nome: '',
  gestor_cpf: '',
  gestor_rg: '',
  gestor_nascimento: '',
  gestor_mae: '',
  cedente_nome: '',
  cedente_cpf: '',
  cedente_rg: '',
  cedente_nascimento: '',
  cedente_mae: '',
  plano_contratado: '',
  bl_valor: '',
  vivo_total_valor: '',
  movel_valor: '',
  valor_mensal: '',
  produtos: '',
  observacoes_vendedor: '',
  campaign_id: '',
};

type FieldErrors = Partial<Record<keyof FormData, string>>;

export const SaleForm = ({ userId, onSuccess, onCancel }: SaleFormProps) => {
  const { profile, loading: authLoading } = useAuth();
  const [form, setForm] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormData, boolean>>>({});
  const [documents, setDocuments] = useState<File[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Multiple portability phone numbers state (with operator)
  const [portabilityPhones, setPortabilityPhones] = useState<{ phone: string; operator: string }[]>([{ phone: '', operator: '' }]);

  // Fetch team name for the seller - with retry capability
  const { data: teamData, isLoading: isLoadingTeam, refetch: refetchTeam } = useQuery({
    queryKey: ['seller-team', profile?.team_id],
    queryFn: async () => {
      if (!profile?.team_id) return null;
      const { data, error } = await supabase
        .from('teams')
        .select('name')
        .eq('id', profile.team_id)
        .single();

      if (error) {
        console.error('Error fetching team:', error);
        throw error;
      }
      return data;
    },
    enabled: !!profile?.team_id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 3, // Retry up to 3 times on failure
    retryDelay: 500,
  });

  // Fetch active campaigns
  const { data: activeCampaigns = [] } = useQuery({
    queryKey: ['active-campaigns', profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_campaigns')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  const validateField = (field: keyof FormData, value: string): string | undefined => {
    switch (field) {
      case 'cnpj_cliente':
        const cleanCnpj = value.replace(/\D/g, '');
        if (!cleanCnpj) return 'CNPJ é obrigatório';
        if (cleanCnpj.length !== 14) return 'CNPJ deve ter 14 dígitos';
        return undefined;
      case 'razao_social':
        if (!value.trim()) return 'Razão Social é obrigatória';
        if (value.trim().length < 2) return 'Razão Social deve ter pelo menos 2 caracteres';
        return undefined;
      case 'telefone_1':
        const cleanTel1 = value.replace(/\D/g, '');
        if (!cleanTel1) return 'Telefone 1 é obrigatório';
        if (cleanTel1.length < 10) return 'Telefone deve ter pelo menos 10 dígitos';
        return undefined;
      case 'telefone_2':
        const cleanTel2 = value.replace(/\D/g, '');
        if (!cleanTel2) return 'Telefone 2 é obrigatório';
        if (cleanTel2.length < 10) return 'Telefone deve ter pelo menos 10 dígitos';
        return undefined;
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'E-mail inválido';
        return undefined;
      case 'valor_mensal':
        if (!value || parseFloat(value) <= 0) return 'Valor mensal é obrigatório';
        return undefined;
      case 'plano_contratado':
        if (!value || !value.trim()) return 'Plano contratado é obrigatório';
        return undefined;
      default:
        return undefined;
    }
  };

  const updateForm = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Validate on change if field was already touched
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, form[field]);
    setErrors(prev => ({ ...prev, [field]: error }));
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

  // Portability phones handlers
  const handlePortabilityPhoneChange = (index: number, value: string) => {
    const maskedValue = maskPhone(value);
    setPortabilityPhones(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], phone: maskedValue };
      return updated;
    });
    // Update form field with all phones joined by " | "
    const allPhones = [...portabilityPhones];
    allPhones[index] = { ...allPhones[index], phone: maskedValue };
    const formattedPhones = allPhones
      .filter(p => p.phone.trim())
      .map(p => p.operator ? `${p.phone} - ${p.operator}` : p.phone)
      .join(' | ');
    updateForm('telefone_portabilidade', formattedPhones);
  };

  const handlePortabilityOperatorChange = (index: number, value: string) => {
    setPortabilityPhones(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], operator: value };
      return updated;
    });
    // Update form field with all phones joined by " | "
    const allPhones = [...portabilityPhones];
    allPhones[index] = { ...allPhones[index], operator: value };
    const formattedPhones = allPhones
      .filter(p => p.phone.trim())
      .map(p => p.operator ? `${p.phone} - ${p.operator}` : p.phone)
      .join(' | ');
    updateForm('telefone_portabilidade', formattedPhones);
  };

  const addPortabilityPhone = () => {
    setPortabilityPhones(prev => [...prev, { phone: '', operator: '' }]);
  };

  const removePortabilityPhone = (index: number) => {
    if (portabilityPhones.length <= 1) return;
    setPortabilityPhones(prev => {
      const updated = prev.filter((_, i) => i !== index);
      // Update form field with remaining phones
      const formattedPhones = updated
        .filter(p => p.phone.trim())
        .map(p => p.operator ? `${p.phone} - ${p.operator}` : p.phone)
        .join(' | ');
      updateForm('telefone_portabilidade', formattedPhones);
      return updated;
    });
  };

  const handleCpfChange = (field: 'proprietario_cpf' | 'gestor_cpf' | 'cedente_cpf', value: string) => {
    const maskedValue = maskCPF(value);
    updateForm(field, maskedValue);
  };

  // Calculate total when values change
  const totalPlano = (
    (parseFloat(form.bl_valor) || 0) +
    (parseFloat(form.vivo_total_valor) || 0) +
    (parseFloat(form.movel_valor) || 0)
  ).toFixed(2);

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
    
    setDocuments(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadDocuments = async (saleId: string): Promise<string[]> => {
    const urls: string[] = [];
    
    for (const file of documents) {
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
    
    // Wait for data to load
    if (authLoading || isLoadingTeam) {
      toast.error('Aguarde o carregamento dos dados...');
      return;
    }
    
    // Determine team name - use current data or refetch if needed
    let finalTeamName = teamData?.name;
    
    // If team data is missing but profile has team_id, try to refetch
    if (profile?.team_id && !finalTeamName) {
      toast.info('Carregando dados da equipe...');
      try {
        const result = await refetchTeam();
        if (result.data?.name) {
          finalTeamName = result.data.name;
        } else {
          toast.error('Não foi possível carregar os dados da equipe. Tente novamente.');
          return;
        }
      } catch (error) {
        console.error('Error refetching team:', error);
        toast.error('Erro ao carregar dados da equipe. Tente novamente.');
        return;
      }
    }
    
    // Validate team assignment
    if (!profile?.team_id || !finalTeamName) {
      toast.error('Você não está vinculado a nenhuma equipe. Solicite ao seu supervisor para vincular você a uma equipe antes de cadastrar vendas.');
      return;
    }
    
    // Validate all required fields
    const requiredFields: (keyof FormData)[] = ['cnpj_cliente', 'razao_social', 'telefone_1', 'telefone_2'];
    const newErrors: FieldErrors = {};
    let hasErrors = false;

    requiredFields.forEach(field => {
      const error = validateField(field, form[field]);
      if (error) {
        newErrors[field] = error;
        hasErrors = true;
      }
    });

    // Also validate email if provided
    if (form.email) {
      const emailError = validateField('email', form.email);
      if (emailError) {
        newErrors.email = emailError;
        hasErrors = true;
      }
    }

    // Validate plano_contratado is required
    if (!form.plano_contratado || !form.plano_contratado.trim()) {
      newErrors.plano_contratado = 'Plano contratado é obrigatório';
      hasErrors = true;
    }

    // Validate documents are required
    if (documents.length === 0) {
      toast.error('É obrigatório anexar pelo menos um documento para cadastrar a venda');
      return;
    }

    if (hasErrors) {
      setErrors(newErrors);
      setTouched(requiredFields.reduce((acc, field) => ({ ...acc, [field]: true }), {}));
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    setLoading(true);

    try {
      // Combine plano_contratado with produtos - plano comes first
      const produtosFinal = [form.plano_contratado, form.produtos]
        .filter(Boolean)
        .join(' | ') || null;

      const { data: saleData, error } = await supabase.from('sales').insert({
        seller_id: userId,
        company_id: profile?.company_id || null,
        data_venda: form.data_venda || null,
        equipe: finalTeamName, // Use the validated team name
        tipo_negociacao: form.tipo_negociacao || null,
        cnpj_cliente: form.cnpj_cliente,
        razao_social: form.razao_social,
        nome_fantasia: form.nome_fantasia || null,
        email: form.email || null,
        telefone_1: form.telefone_1 || null,
        telefone_2: form.telefone_2 || null,
        telefone_portabilidade: form.telefone_portabilidade || null,
        endereco_rua: form.endereco_rua || null,
        endereco_numero: form.endereco_numero || null,
        endereco_bairro: form.endereco_bairro || null,
        endereco_cidade: form.endereco_cidade || null,
        endereco_cep: form.endereco_cep || null,
        proprietario_nome: form.proprietario_nome || null,
        proprietario_cpf: form.proprietario_cpf || null,
        proprietario_rg: form.proprietario_rg || null,
        proprietario_nascimento: form.proprietario_nascimento || null,
        proprietario_mae: form.proprietario_mae || null,
        gestor_nome: form.gestor_nome || null,
        gestor_cpf: form.gestor_cpf || null,
        gestor_rg: form.gestor_rg || null,
        gestor_nascimento: form.gestor_nascimento || null,
        gestor_mae: form.gestor_mae || null,
        cedente_nome: form.cedente_nome || null,
        cedente_cpf: form.cedente_cpf || null,
        cedente_rg: form.cedente_rg || null,
        cedente_nascimento: form.cedente_nascimento || null,
        cedente_mae: form.cedente_mae || null,
        plano_contratado: form.plano_contratado || null,
        bl_valor: parseFloat(form.bl_valor) || 0,
        vivo_total_valor: parseFloat(form.vivo_total_valor) || 0,
        movel_valor: parseFloat(form.movel_valor) || 0,
        valor_mensal: parseFloat(form.valor_mensal) || parseFloat(totalPlano) || 0,
        produtos: produtosFinal,
        observacoes_vendedor: form.observacoes_vendedor || null,
        status: 'PRE_ANALISE',
        campaign_id: form.campaign_id || null,
      }).select('id').single();

      if (error) throw error;

      // Upload documents if any
      if (documents.length > 0 && saleData?.id) {
        setUploadingDocs(true);
        const docUrls = await uploadDocuments(saleData.id);
        
        if (docUrls.length > 0) {
          await supabase
            .from('sales')
            .update({ documentos: docUrls } as any)
            .eq('id', saleData.id);
        }
        setUploadingDocs(false);
      }

      toast.success('Venda cadastrada com sucesso!');
      onSuccess();
    } catch (error) {
      console.error('Error creating sale:', error);
      toast.error('Erro ao cadastrar venda');
    } finally {
      setLoading(false);
      setUploadingDocs(false);
    }
  };

  const SectionHeader = ({ icon: Icon, title }: { icon: typeof Calendar; title: string }) => (
    <div className="flex items-center gap-2 mb-4">
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <h3 className="font-semibold text-lg">{title}</h3>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informações Básicas */}
      <div>
        <SectionHeader icon={Calendar} title="Informações da Venda" />
        
        {/* Team info badge, loading state, or warning */}
        {authLoading || isLoadingTeam ? (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Carregando dados da equipe...</span>
          </div>
        ) : teamData?.name ? (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Equipe:</span>
            <span className="text-sm font-medium text-primary">{teamData.name}</span>
          </div>
        ) : (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Você não está vinculado a nenhuma equipe. Solicite ao seu supervisor para vincular você a uma equipe antes de cadastrar vendas.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="data_venda">Data da Venda *</Label>
            <Input
              id="data_venda"
              type="date"
              value={form.data_venda}
              onChange={(e) => updateForm('data_venda', e.target.value)}
              required
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
          {activeCampaigns.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="campaign_id" className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                Campanha
              </Label>
              <Select value={form.campaign_id || "none"} onValueChange={(v) => updateForm('campaign_id', v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Vincular a campanha..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {activeCampaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Dados da Empresa */}
      <div>
        <SectionHeader icon={Building2} title="Dados da Empresa" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cnpj" className={errors.cnpj_cliente ? 'text-destructive' : ''}>CNPJ *</Label>
            <div className="relative">
              <Input
                id="cnpj"
                placeholder="00.000.000/0000-00"
                value={form.cnpj_cliente}
                onChange={(e) => handleCnpjChange(e.target.value)}
                onBlur={() => handleBlur('cnpj_cliente')}
                className={errors.cnpj_cliente ? 'border-destructive focus-visible:ring-destructive' : ''}
                required
              />
              {loadingCnpj && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {errors.cnpj_cliente && <p className="text-sm text-destructive">{errors.cnpj_cliente}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="razao" className={errors.razao_social ? 'text-destructive' : ''}>Razão Social *</Label>
            <Input
              id="razao"
              placeholder="Nome da empresa"
              value={form.razao_social}
              onChange={(e) => updateForm('razao_social', e.target.value)}
              onBlur={() => handleBlur('razao_social')}
              className={errors.razao_social ? 'border-destructive focus-visible:ring-destructive' : ''}
              required
            />
            {errors.razao_social && <p className="text-sm text-destructive">{errors.razao_social}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="fantasia">Nome Fantasia</Label>
            <Input
              id="fantasia"
              placeholder="Nome fantasia"
              value={form.nome_fantasia}
              onChange={(e) => updateForm('nome_fantasia', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className={errors.email ? 'text-destructive' : ''}>E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="empresa@email.com"
              value={form.email}
              onChange={(e) => updateForm('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>
        </div>
      </div>

      <Separator />

      {/* Contatos */}
      <div>
        <SectionHeader icon={Phone} title="Contatos" />
        <p className="text-sm text-muted-foreground mb-4">Obrigatório preencher 2 números</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="tel1" className={errors.telefone_1 ? 'text-destructive' : ''}>Telefone 1 *</Label>
            <Input
              id="tel1"
              placeholder="(00) 00000-0000"
              value={form.telefone_1}
              onChange={(e) => handlePhoneChange('telefone_1', e.target.value)}
              onBlur={() => handleBlur('telefone_1')}
              className={errors.telefone_1 ? 'border-destructive focus-visible:ring-destructive' : ''}
              required
            />
            {errors.telefone_1 && <p className="text-sm text-destructive">{errors.telefone_1}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tel2" className={errors.telefone_2 ? 'text-destructive' : ''}>Telefone 2 *</Label>
            <Input
              id="tel2"
              placeholder="(00) 00000-0000"
              value={form.telefone_2}
              onChange={(e) => handlePhoneChange('telefone_2', e.target.value)}
              onBlur={() => handleBlur('telefone_2')}
              className={errors.telefone_2 ? 'border-destructive focus-visible:ring-destructive' : ''}
              required
            />
            {errors.telefone_2 && <p className="text-sm text-destructive">{errors.telefone_2}</p>}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <div className="flex items-center justify-between">
              <Label>Telefone Portabilidade + Operadora</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPortabilityPhone}
                className="h-7 gap-1 text-xs"
              >
                <Plus className="h-3 w-3" />
                Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {portabilityPhones.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex items-center justify-center h-9 w-9 rounded-md bg-muted text-muted-foreground text-xs font-medium shrink-0">
                    {index + 1}
                  </div>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={item.phone}
                    onChange={(e) => handlePortabilityPhoneChange(index, e.target.value)}
                    className="flex-1"
                  />
                  <Select
                    value={item.operator}
                    onValueChange={(value) => handlePortabilityOperatorChange(index, value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Operadora" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIVO">Vivo</SelectItem>
                      <SelectItem value="CLARO">Claro</SelectItem>
                      <SelectItem value="TIM">TIM</SelectItem>
                      <SelectItem value="OI">Oi</SelectItem>
                      <SelectItem value="NEXTEL">Nextel</SelectItem>
                      <SelectItem value="ALGAR">Algar</SelectItem>
                      <SelectItem value="OUTRA">Outra</SelectItem>
                    </SelectContent>
                  </Select>
                  {portabilityPhones.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePortabilityPhone(index)}
                      className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Endereço */}
      <div>
        <SectionHeader icon={MapPin} title="Dados da Instalação" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 sm:col-span-2 lg:col-span-2">
            <Label htmlFor="rua">Rua</Label>
            <Input
              id="rua"
              placeholder="Nome da rua"
              value={form.endereco_rua}
              onChange={(e) => updateForm('endereco_rua', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="numero">Número</Label>
            <Input
              id="numero"
              placeholder="123"
              value={form.endereco_numero}
              onChange={(e) => updateForm('endereco_numero', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bairro">Bairro</Label>
            <Input
              id="bairro"
              placeholder="Bairro"
              value={form.endereco_bairro}
              onChange={(e) => updateForm('endereco_bairro', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cidade">Cidade</Label>
            <Input
              id="cidade"
              placeholder="Cidade"
              value={form.endereco_cidade}
              onChange={(e) => updateForm('endereco_cidade', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cep">CEP</Label>
            <div className="relative">
              <Input
                id="cep"
                placeholder="00000-000"
                value={form.endereco_cep}
                onChange={(e) => handleCepChange(e.target.value)}
              />
              {loadingCep && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Proprietário */}
      <div>
        <SectionHeader icon={User} title="Dados do Proprietário" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="prop_nome">Nome</Label>
            <Input
              id="prop_nome"
              placeholder="Nome completo"
              value={form.proprietario_nome}
              onChange={(e) => updateForm('proprietario_nome', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prop_cpf">CPF</Label>
            <Input
              id="prop_cpf"
              placeholder="000.000.000-00"
              value={form.proprietario_cpf}
              onChange={(e) => handleCpfChange('proprietario_cpf', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prop_rg">RG</Label>
            <Input
              id="prop_rg"
              placeholder="RG"
              value={form.proprietario_rg}
              onChange={(e) => updateForm('proprietario_rg', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prop_nasc">Data de Nascimento</Label>
            <Input
              id="prop_nasc"
              type="date"
              value={form.proprietario_nascimento}
              onChange={(e) => updateForm('proprietario_nascimento', e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="prop_mae">Nome Completo da Mãe</Label>
            <Input
              id="prop_mae"
              placeholder="Nome da mãe"
              value={form.proprietario_mae}
              onChange={(e) => updateForm('proprietario_mae', e.target.value)}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Gestor */}
      <div>
        <SectionHeader icon={Users} title="Dados do Gestor de Conta" />
        <p className="text-sm text-muted-foreground mb-4">
          Preencher se o responsável não for o proprietário
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="gest_nome">Nome</Label>
            <Input
              id="gest_nome"
              placeholder="Nome completo"
              value={form.gestor_nome}
              onChange={(e) => updateForm('gestor_nome', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gest_cpf">CPF</Label>
            <Input
              id="gest_cpf"
              placeholder="000.000.000-00"
              value={form.gestor_cpf}
              onChange={(e) => handleCpfChange('gestor_cpf', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gest_rg">RG</Label>
            <Input
              id="gest_rg"
              placeholder="RG"
              value={form.gestor_rg}
              onChange={(e) => updateForm('gestor_rg', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gest_nasc">Data de Nascimento</Label>
            <Input
              id="gest_nasc"
              type="date"
              value={form.gestor_nascimento}
              onChange={(e) => updateForm('gestor_nascimento', e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="gest_mae">Nome Completo da Mãe</Label>
            <Input
              id="gest_mae"
              placeholder="Nome da mãe"
              value={form.gestor_mae}
              onChange={(e) => updateForm('gestor_mae', e.target.value)}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Cedente */}
      <div>
        <SectionHeader icon={Users} title="Dados do Cedente da Linha" />
        <p className="text-sm text-muted-foreground mb-4">
          Quando a conta não estiver na mesma titularidade
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="ced_nome">Nome</Label>
            <Input
              id="ced_nome"
              placeholder="Nome completo"
              value={form.cedente_nome}
              onChange={(e) => updateForm('cedente_nome', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ced_cpf">CPF</Label>
            <Input
              id="ced_cpf"
              placeholder="000.000.000-00"
              value={form.cedente_cpf}
              onChange={(e) => handleCpfChange('cedente_cpf', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ced_rg">RG</Label>
            <Input
              id="ced_rg"
              placeholder="RG"
              value={form.cedente_rg}
              onChange={(e) => updateForm('cedente_rg', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ced_nasc">Data de Nascimento</Label>
            <Input
              id="ced_nasc"
              type="date"
              value={form.cedente_nascimento}
              onChange={(e) => updateForm('cedente_nascimento', e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ced_mae">Nome Completo da Mãe</Label>
            <Input
              id="ced_mae"
              placeholder="Nome da mãe"
              value={form.cedente_mae}
              onChange={(e) => updateForm('cedente_mae', e.target.value)}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Plano */}
      <div>
        <SectionHeader icon={DollarSign} title="Plano Contratado" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 sm:col-span-2 lg:col-span-4">
            <Label htmlFor="plano" className="flex items-center gap-1">
              Plano <span className="text-destructive">*</span>
            </Label>
            <Input
              id="plano"
              placeholder="Ex: Vivo Fibra 300MB + Vivo Total"
              value={form.plano_contratado}
              onChange={(e) => updateForm('plano_contratado', e.target.value)}
              onBlur={() => handleBlur('plano_contratado')}
              className={errors.plano_contratado && touched.plano_contratado ? 'border-destructive' : ''}
            />
            {errors.plano_contratado && touched.plano_contratado && (
              <p className="text-sm text-destructive">{errors.plano_contratado}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bl">BL Valor (R$)</Label>
            <Input
              id="bl"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.bl_valor}
              onChange={(e) => updateForm('bl_valor', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vivo_total">Vivo Total Valor (R$)</Label>
            <Input
              id="vivo_total"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.vivo_total_valor}
              onChange={(e) => updateForm('vivo_total_valor', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="movel">Móvel Valor (R$)</Label>
            <Input
              id="movel"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.movel_valor}
              onChange={(e) => updateForm('movel_valor', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="total">Valor Total do Plano (R$)</Label>
            <Input
              id="total"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.valor_mensal || totalPlano}
              onChange={(e) => updateForm('valor_mensal', e.target.value)}
              className="font-semibold"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Observações */}
      <div>
        <SectionHeader icon={FileText} title="Informações Adicionais" />
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="produtos">Produtos/Serviços</Label>
            <Textarea
              id="produtos"
              placeholder="Lista de produtos e serviços contratados..."
              value={form.produtos}
              onChange={(e) => updateForm('produtos', e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="obs">Observação Adicional</Label>
            <Textarea
              id="obs"
              placeholder="Observações importantes sobre a venda..."
              value={form.observacoes_vendedor}
              onChange={(e) => updateForm('observacoes_vendedor', e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Documentos */}
      <div>
        <SectionHeader icon={Upload} title="Documentos *" />
        <p className="text-sm text-muted-foreground mb-4">
          <span className="text-destructive font-medium">Obrigatório:</span> Anexe pelo menos um documento relacionado à venda (PDF, imagens). Máximo 10MB por arquivo.
        </p>
        <div className="space-y-4">
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              documents.length === 0 
                ? 'border-destructive/50 hover:border-destructive bg-destructive/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className={`h-8 w-8 mx-auto mb-2 ${documents.length === 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            <p className={`text-sm ${documents.length === 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {documents.length === 0 
                ? 'Clique para adicionar documentos (obrigatório)' 
                : 'Clique para adicionar mais documentos'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, JPG, PNG, WebP
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {documents.length > 0 && (
            <div className="space-y-2">
              {documents.map((file, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                >
                  <div className="flex items-center gap-3">
                    <File className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDocument(index)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || uploadingDocs}>
          {loading || uploadingDocs ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {uploadingDocs ? 'Enviando documentos...' : 'Salvando...'}
            </span>
          ) : (
            'Cadastrar Venda'
          )}
        </Button>
      </div>
    </form>
  );
};
