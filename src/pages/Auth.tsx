import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Building2, Users, ArrowRight, Check, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().trim().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const companySignupSchema = z.object({
  nome: z.string().trim().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100, 'Nome muito longo'),
  email: z.string().trim().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  cnpj: z.string().trim().min(14, 'CNPJ inválido').max(18, 'CNPJ inválido'),
  razao_social: z.string().trim().min(2, 'Razão social obrigatória').max(255, 'Razão social muito longa'),
  nome_fantasia: z.string().trim().max(255, 'Nome fantasia muito longo').optional(),
});

const inviteSignupSchema = z.object({
  nome: z.string().trim().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100, 'Nome muito longo'),
  email: z.string().trim().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

interface InviteData {
  id: string;
  company_id: string;
  role: string;
  email: string | null;
  company_name?: string;
}

type AuthMode = 'login' | 'signup' | 'invite';
type SignupStep = 1 | 2;

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite');
  
  const { user, signIn, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<AuthMode>(inviteCode ? 'invite' : 'login');
  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingCnpj, setCheckingCnpj] = useState(false);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [cnpjValid, setCnpjValid] = useState(false);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(!!inviteCode);
  const [showPassword, setShowPassword] = useState(false);
  
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [companyData, setCompanyData] = useState({ 
    nome: '', 
    email: '', 
    password: '',
    cnpj: '',
    razao_social: '',
    nome_fantasia: ''
  });
  const [inviteSignupData, setInviteSignupData] = useState({ nome: '', email: '', password: '' });

  // Load invite data if invite code present
  useEffect(() => {
    const loadInvite = async () => {
      if (!inviteCode) return;
      
      setLoadingInvite(true);
      const { data, error } = await supabase
        .from('team_invites')
        .select('id, company_id, role, email')
        .eq('invite_code', inviteCode)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        toast.error('Convite inválido ou expirado');
        setMode('login');
        setLoadingInvite(false);
        return;
      }

      const { data: companyInfo } = await supabase
        .from('companies')
        .select('nome_fantasia, razao_social')
        .eq('id', data.company_id)
        .single();

      setInviteData({
        ...data,
        company_name: companyInfo?.nome_fantasia || companyInfo?.razao_social || 'Empresa'
      });
      
      if (data.email) {
        setInviteSignupData(prev => ({ ...prev, email: data.email! }));
      }
      
      setMode('invite');
      setLoadingInvite(false);
    };

    loadInvite();
  }, [inviteCode]);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const formatCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18);
  };

  const checkCnpj = async (cnpj: string) => {
    if (cnpj.replace(/\D/g, '').length < 14) {
      setCnpjError(null);
      setCnpjValid(false);
      return;
    }

    setCheckingCnpj(true);
    const { data } = await supabase.rpc('cnpj_exists', { check_cnpj: cnpj });
    setCheckingCnpj(false);

    if (data === true) {
      setCnpjError('Este CNPJ já está cadastrado');
      setCnpjValid(false);
    } else {
      setCnpjError(null);
      setCnpjValid(true);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = loginSchema.safeParse(loginData);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginData.email, loginData.password);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('E-mail ou senha incorretos');
      } else {
        toast.error('Erro ao fazer login. Tente novamente.');
      }
    } else {
      toast.success('Bem-vindo de volta!');
      navigate('/dashboard');
    }
  };

  const handleCompanySignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = companySignupSchema.safeParse(companyData);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    if (cnpjError) {
      toast.error(cnpjError);
      return;
    }

    setIsLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: companyData.email,
      password: companyData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { nome: companyData.nome }
      }
    });

    if (authError || !authData.user) {
      setIsLoading(false);
      if (authError?.message.includes('already registered')) {
        toast.error('Este e-mail já está cadastrado');
      } else {
        toast.error('Erro ao criar conta. Tente novamente.');
      }
      return;
    }

    const { data: companyResult, error: companyError } = await supabase
      .from('companies')
      .insert({
        cnpj: companyData.cnpj,
        razao_social: companyData.razao_social,
        nome_fantasia: companyData.nome_fantasia || null,
        owner_id: authData.user.id
      })
      .select()
      .single();

    if (companyError) {
      setIsLoading(false);
      if (companyError.message.includes('duplicate key')) {
        toast.error('Este CNPJ já está cadastrado');
      } else {
        toast.error('Erro ao criar empresa. Tente novamente.');
      }
      return;
    }

    await supabase
      .from('profiles')
      .update({ company_id: companyResult.id })
      .eq('id', authData.user.id);

    await supabase
      .from('user_roles')
      .insert({ user_id: authData.user.id, role: 'CEO' });

    setIsLoading(false);
    toast.success('Empresa cadastrada com sucesso!');
    navigate('/dashboard');
  };

  const handleInviteSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteData) {
      toast.error('Convite inválido');
      return;
    }

    const result = inviteSignupSchema.safeParse(inviteSignupData);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: inviteSignupData.email,
      password: inviteSignupData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { nome: inviteSignupData.nome }
      }
    });

    if (authError || !authData.user) {
      setIsLoading(false);
      if (authError?.message.includes('already registered')) {
        toast.error('Este e-mail já está cadastrado');
      } else {
        toast.error('Erro ao criar conta. Tente novamente.');
      }
      return;
    }

    await supabase
      .from('profiles')
      .update({ company_id: inviteData.company_id })
      .eq('id', authData.user.id);

    await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: inviteData.role as 'CEO' | 'BACKOFFICE' | 'SELLER'
      });

    await supabase
      .from('team_invites')
      .update({ used_at: new Date().toISOString(), used_by: authData.user.id })
      .eq('id', inviteData.id);

    setIsLoading(false);
    toast.success('Conta criada com sucesso!');
    navigate('/dashboard');
  };

  const canProceedStep1 = companyData.cnpj.replace(/\D/g, '').length >= 14 && 
                           cnpjValid && 
                           companyData.razao_social.length >= 2;

  if (authLoading || loadingInvite) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
          <p className="text-white/40 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-violet-500/10 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/10 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      {/* Noise Texture */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')] opacity-50" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-2xl mb-6">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">
            CRM Telecom
          </h1>
          <p className="text-white/40 mt-2 text-sm">
            Gestão inteligente de vendas corporativas
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
          
          {/* Invite Mode */}
          {mode === 'invite' && inviteData && (
            <>
              <div className="p-8 text-center border-b border-white/5">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-violet-500/20 to-blue-500/20 mb-4">
                  <Users className="h-6 w-6 text-violet-400" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Você foi convidado
                </h2>
                <p className="text-white/50 text-sm">
                  Para fazer parte de
                </p>
                <p className="text-white font-medium mt-1">
                  {inviteData.company_name}
                </p>
              </div>
              
              <form onSubmit={handleInviteSignup} className="p-8 space-y-5">
                <div className="space-y-2">
                  <Label className="text-white/70 text-sm font-medium">Nome completo</Label>
                  <Input
                    type="text"
                    placeholder="Seu nome"
                    value={inviteSignupData.nome}
                    onChange={(e) => setInviteSignupData({ ...inviteSignupData, nome: e.target.value })}
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-0 rounded-xl"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-white/70 text-sm font-medium">E-mail</Label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={inviteSignupData.email}
                    onChange={(e) => setInviteSignupData({ ...inviteSignupData, email: e.target.value })}
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-0 rounded-xl"
                    disabled={!!inviteData.email}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-white/70 text-sm font-medium">Senha</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={inviteSignupData.password}
                      onChange={(e) => setInviteSignupData({ ...inviteSignupData, password: e.target.value })}
                      className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-0 rounded-xl pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-white text-slate-900 hover:bg-white/90 rounded-xl font-semibold text-base transition-all duration-200"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Entrar na Equipe'
                  )}
                </Button>
              </form>
            </>
          )}

          {/* Login/Signup Modes */}
          {mode !== 'invite' && (
            <>
              {/* Mode Switcher */}
              <div className="flex border-b border-white/5">
                <button
                  onClick={() => { setMode('login'); setSignupStep(1); }}
                  className={cn(
                    "flex-1 py-4 text-sm font-medium transition-all duration-200 relative",
                    mode === 'login' ? "text-white" : "text-white/40 hover:text-white/60"
                  )}
                >
                  Entrar
                  {mode === 'login' && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-white rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => { setMode('signup'); setSignupStep(1); }}
                  className={cn(
                    "flex-1 py-4 text-sm font-medium transition-all duration-200 relative",
                    mode === 'signup' ? "text-white" : "text-white/40 hover:text-white/60"
                  )}
                >
                  Criar Empresa
                  {mode === 'signup' && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-white rounded-full" />
                  )}
                </button>
              </div>

              {/* Login Form */}
              {mode === 'login' && (
                <form onSubmit={handleLogin} className="p-8 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-white/70 text-sm font-medium">E-mail</Label>
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-0 rounded-xl"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-white/70 text-sm font-medium">Senha</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-0 rounded-xl pr-12"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-white text-slate-900 hover:bg-white/90 rounded-xl font-semibold text-base transition-all duration-200"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      'Continuar'
                    )}
                  </Button>
                </form>
              )}

              {/* Signup Form */}
              {mode === 'signup' && (
                <form onSubmit={handleCompanySignup} className="p-8">
                  {/* Step Indicator */}
                  <div className="flex items-center justify-center gap-3 mb-8">
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all duration-300",
                      signupStep >= 1 ? "bg-white text-slate-900" : "bg-white/10 text-white/40"
                    )}>
                      {signupStep > 1 ? <Check className="h-4 w-4" /> : '1'}
                    </div>
                    <div className={cn(
                      "w-12 h-0.5 rounded-full transition-all duration-300",
                      signupStep > 1 ? "bg-white" : "bg-white/10"
                    )} />
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all duration-300",
                      signupStep >= 2 ? "bg-white text-slate-900" : "bg-white/10 text-white/40"
                    )}>
                      2
                    </div>
                  </div>

                  {/* Step 1: Company Info */}
                  {signupStep === 1 && (
                    <div className="space-y-5 animate-fade-in">
                      <div className="text-center mb-6">
                        <h3 className="text-lg font-semibold text-white">Dados da Empresa</h3>
                        <p className="text-white/40 text-sm mt-1">Informe os dados do seu negócio</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white/70 text-sm font-medium">CNPJ</Label>
                        <div className="relative">
                          <Input
                            type="text"
                            placeholder="00.000.000/0000-00"
                            value={companyData.cnpj}
                            onChange={(e) => {
                              const formatted = formatCnpj(e.target.value);
                              setCompanyData({ ...companyData, cnpj: formatted });
                              checkCnpj(formatted);
                            }}
                            className={cn(
                              "h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-0 rounded-xl pr-12",
                              cnpjError && "border-red-500/50",
                              cnpjValid && "border-green-500/50"
                            )}
                            required
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            {checkingCnpj && <Loader2 className="h-5 w-5 animate-spin text-white/40" />}
                            {cnpjValid && <Check className="h-5 w-5 text-green-400" />}
                          </div>
                        </div>
                        {cnpjError && (
                          <p className="text-red-400 text-xs mt-1">{cnpjError}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white/70 text-sm font-medium">Razão Social</Label>
                        <Input
                          type="text"
                          placeholder="Nome oficial da empresa"
                          value={companyData.razao_social}
                          onChange={(e) => setCompanyData({ ...companyData, razao_social: e.target.value })}
                          className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-0 rounded-xl"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white/70 text-sm font-medium">
                          Nome Fantasia <span className="text-white/30">(opcional)</span>
                        </Label>
                        <Input
                          type="text"
                          placeholder="Como sua empresa é conhecida"
                          value={companyData.nome_fantasia}
                          onChange={(e) => setCompanyData({ ...companyData, nome_fantasia: e.target.value })}
                          className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-0 rounded-xl"
                        />
                      </div>

                      <Button
                        type="button"
                        onClick={() => setSignupStep(2)}
                        disabled={!canProceedStep1}
                        className="w-full h-12 bg-white text-slate-900 hover:bg-white/90 rounded-xl font-semibold text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed gap-2"
                      >
                        Continuar
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Step 2: User Info */}
                  {signupStep === 2 && (
                    <div className="space-y-5 animate-fade-in">
                      <div className="text-center mb-6">
                        <h3 className="text-lg font-semibold text-white">Seus Dados</h3>
                        <p className="text-white/40 text-sm mt-1">Você será o administrador</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white/70 text-sm font-medium">Seu nome</Label>
                        <Input
                          type="text"
                          placeholder="Nome completo"
                          value={companyData.nome}
                          onChange={(e) => setCompanyData({ ...companyData, nome: e.target.value })}
                          className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-0 rounded-xl"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white/70 text-sm font-medium">E-mail</Label>
                        <Input
                          type="email"
                          placeholder="seu@email.com"
                          value={companyData.email}
                          onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                          className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-0 rounded-xl"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white/70 text-sm font-medium">Senha</Label>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={companyData.password}
                            onChange={(e) => setCompanyData({ ...companyData, password: e.target.value })}
                            className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-0 rounded-xl pr-12"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setSignupStep(1)}
                          className="flex-1 h-12 text-white/60 hover:text-white hover:bg-white/5 rounded-xl font-medium"
                        >
                          Voltar
                        </Button>
                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="flex-1 h-12 bg-white text-slate-900 hover:bg-white/90 rounded-xl font-semibold transition-all duration-200"
                        >
                          {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            'Criar Empresa'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </form>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-white/30 text-xs mt-8">
          Ao continuar, você concorda com nossos termos de uso e política de privacidade.
        </p>
      </div>
    </div>
  );
};

export default Auth;
