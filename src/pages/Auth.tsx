import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Building2, Users, ArrowRight, Check, Eye, EyeOff, ArrowLeft, ShoppingCart } from 'lucide-react';
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

const employeeSignupSchema = z.object({
  nome: z.string().trim().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100, 'Nome muito longo'),
  email: z.string().trim().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  inviteCode: z.string().trim().min(8, 'Código de convite inválido'),
});

interface InviteData {
  id: string;
  company_id: string;
  role: string;
  email: string | null;
  company_name?: string;
}

type AuthMode = 'login' | 'signup';
type SignupType = 'company' | 'employee' | null;
type SignupStep = 1 | 2;

const Auth = () => {
  const navigate = useNavigate();
  const { user, signIn, loading: authLoading } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [signupType, setSignupType] = useState<SignupType>(null);
  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingCnpj, setCheckingCnpj] = useState(false);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [cnpjValid, setCnpjValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [checkingCode, setCheckingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [companyData, setCompanyData] = useState({ 
    nome: '', 
    email: '', 
    password: '',
    cnpj: '',
    razao_social: '',
    nome_fantasia: ''
  });
  const [employeeData, setEmployeeData] = useState({ 
    nome: '', 
    email: '', 
    password: '',
    inviteCode: ''
  });

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

  const checkInviteCode = async (code: string) => {
    if (code.length < 8) {
      setCodeError(null);
      setInviteData(null);
      return;
    }

    setCheckingCode(true);
    const { data, error } = await supabase
      .from('team_invites')
      .select('id, company_id, role, email')
      .eq('invite_code', code)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      setCodeError('Código inválido ou expirado');
      setInviteData(null);
      setCheckingCode(false);
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
    setCodeError(null);
    setCheckingCode(false);
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

  const handleEmployeeSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteData) {
      toast.error('Código de convite inválido');
      return;
    }

    const result = employeeSignupSchema.safeParse(employeeData);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    if (inviteData.email && inviteData.email !== employeeData.email) {
      toast.error('Este convite é exclusivo para outro e-mail');
      return;
    }

    setIsLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: employeeData.email,
      password: employeeData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { nome: employeeData.nome }
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

  const canProceedCompanyStep1 = companyData.cnpj.replace(/\D/g, '').length >= 14 && 
                                  cnpjValid && 
                                  companyData.razao_social.length >= 2;

  const canProceedEmployeeStep1 = inviteData !== null && !codeError;

  const resetSignup = () => {
    setSignupType(null);
    setSignupStep(1);
    setCompanyData({ nome: '', email: '', password: '', cnpj: '', razao_social: '', nome_fantasia: '' });
    setEmployeeData({ nome: '', email: '', password: '', inviteCode: '' });
    setInviteData(null);
    setCnpjError(null);
    setCnpjValid(false);
    setCodeError(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-card border-r border-border flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <ShoppingCart className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">CRM Telecom</span>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-4xl font-semibold text-foreground leading-tight">
            Gerencie suas vendas<br />
            de forma inteligente
          </h2>
          <p className="text-lg text-muted-foreground max-w-md">
            Plataforma completa para gestão de vendas corporativas com acompanhamento em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-center">
            <p className="text-3xl font-semibold text-foreground">500+</p>
            <p className="text-sm text-muted-foreground">Empresas</p>
          </div>
          <div className="w-px h-12 bg-border" />
          <div className="text-center">
            <p className="text-3xl font-semibold text-foreground">10k+</p>
            <p className="text-sm text-muted-foreground">Vendas</p>
          </div>
          <div className="w-px h-12 bg-border" />
          <div className="text-center">
            <p className="text-3xl font-semibold text-foreground">98%</p>
            <p className="text-sm text-muted-foreground">Satisfação</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <ShoppingCart className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">CRM Telecom</span>
          </div>

          {/* Card */}
          <div className="bg-card rounded-xl border border-border p-8">
            {/* Mode Tabs */}
            <div className="flex gap-1 p-1 bg-secondary rounded-lg mb-8">
              <button
                onClick={() => { setMode('login'); resetSignup(); }}
                className={cn(
                  "flex-1 py-2.5 text-sm font-medium rounded-md transition-all duration-150",
                  mode === 'login' 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Entrar
              </button>
              <button
                onClick={() => { setMode('signup'); resetSignup(); }}
                className={cn(
                  "flex-1 py-2.5 text-sm font-medium rounded-md transition-all duration-150",
                  mode === 'signup' 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Criar Conta
              </button>
            </div>

            {/* Login Form */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-5 animate-fade-in">
                <div className="space-y-2">
                  <Label className="text-foreground text-sm">E-mail</Label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    className="h-11"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-foreground text-sm">Senha</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      className="h-11 pr-11"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full h-11">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
                </Button>
              </form>
            )}

            {/* Signup Flow */}
            {mode === 'signup' && (
              <div className="animate-fade-in">
                {/* Type Selection */}
                {signupType === null && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center mb-6">
                      Como deseja se cadastrar?
                    </p>

                    <button
                      onClick={() => setSignupType('company')}
                      className="w-full p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-secondary/50 transition-all duration-150 text-left group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">Sou uma Empresa</p>
                          <p className="text-sm text-muted-foreground">Cadastrar minha empresa</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </button>

                    <button
                      onClick={() => setSignupType('employee')}
                      className="w-full p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-secondary/50 transition-all duration-150 text-left group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                          <Users className="h-5 w-5 text-accent" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">Tenho um Convite</p>
                          <p className="text-sm text-muted-foreground">Usar código de convite</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </button>
                  </div>
                )}

                {/* Company Signup - Step 1 */}
                {signupType === 'company' && signupStep === 1 && (
                  <div className="space-y-5">
                    <button
                      onClick={() => setSignupType(null)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Voltar
                    </button>

                    <div>
                      <h3 className="text-lg font-medium text-foreground">Dados da Empresa</h3>
                      <p className="text-sm text-muted-foreground">Passo 1 de 2</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-foreground text-sm">CNPJ</Label>
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
                              "h-11 pr-10",
                              cnpjError && "border-destructive",
                              cnpjValid && "border-emerald-500"
                            )}
                          />
                          {checkingCnpj && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                          {cnpjValid && <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />}
                        </div>
                        {cnpjError && <p className="text-xs text-destructive">{cnpjError}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-foreground text-sm">Razão Social</Label>
                        <Input
                          type="text"
                          placeholder="Nome oficial da empresa"
                          value={companyData.razao_social}
                          onChange={(e) => setCompanyData({ ...companyData, razao_social: e.target.value })}
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-foreground text-sm">Nome Fantasia (opcional)</Label>
                        <Input
                          type="text"
                          placeholder="Nome comercial"
                          value={companyData.nome_fantasia}
                          onChange={(e) => setCompanyData({ ...companyData, nome_fantasia: e.target.value })}
                          className="h-11"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={() => setSignupStep(2)}
                      disabled={!canProceedCompanyStep1}
                      className="w-full h-11"
                    >
                      Continuar
                    </Button>
                  </div>
                )}

                {/* Company Signup - Step 2 */}
                {signupType === 'company' && signupStep === 2 && (
                  <form onSubmit={handleCompanySignup} className="space-y-5">
                    <button
                      type="button"
                      onClick={() => setSignupStep(1)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Voltar
                    </button>

                    <div>
                      <h3 className="text-lg font-medium text-foreground">Dados do Administrador</h3>
                      <p className="text-sm text-muted-foreground">Passo 2 de 2</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-foreground text-sm">Seu Nome</Label>
                        <Input
                          type="text"
                          placeholder="Nome completo"
                          value={companyData.nome}
                          onChange={(e) => setCompanyData({ ...companyData, nome: e.target.value })}
                          className="h-11"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-foreground text-sm">E-mail</Label>
                        <Input
                          type="email"
                          placeholder="seu@email.com"
                          value={companyData.email}
                          onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                          className="h-11"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-foreground text-sm">Senha</Label>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Mínimo 6 caracteres"
                            value={companyData.password}
                            onChange={(e) => setCompanyData({ ...companyData, password: e.target.value })}
                            className="h-11 pr-11"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <Button type="submit" disabled={isLoading} className="w-full h-11">
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Conta'}
                    </Button>
                  </form>
                )}

                {/* Employee Signup - Step 1 */}
                {signupType === 'employee' && signupStep === 1 && (
                  <div className="space-y-5">
                    <button
                      onClick={() => setSignupType(null)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Voltar
                    </button>

                    <div>
                      <h3 className="text-lg font-medium text-foreground">Código de Convite</h3>
                      <p className="text-sm text-muted-foreground">Passo 1 de 2</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-foreground text-sm">Código</Label>
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="Digite o código de 8 dígitos"
                          value={employeeData.inviteCode}
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8);
                            setEmployeeData({ ...employeeData, inviteCode: value });
                            checkInviteCode(value);
                          }}
                          className={cn(
                            "h-11 text-center text-lg tracking-widest font-mono",
                            codeError && "border-destructive",
                            inviteData && "border-emerald-500"
                          )}
                        />
                        {checkingCode && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                        {inviteData && <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />}
                      </div>
                      {codeError && <p className="text-xs text-destructive">{codeError}</p>}
                    </div>

                    {inviteData && (
                      <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-sm text-emerald-400">
                          Convite válido para <strong>{inviteData.company_name}</strong>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Cargo: {inviteData.role}
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={() => setSignupStep(2)}
                      disabled={!canProceedEmployeeStep1}
                      className="w-full h-11"
                    >
                      Continuar
                    </Button>
                  </div>
                )}

                {/* Employee Signup - Step 2 */}
                {signupType === 'employee' && signupStep === 2 && (
                  <form onSubmit={handleEmployeeSignup} className="space-y-5">
                    <button
                      type="button"
                      onClick={() => setSignupStep(1)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Voltar
                    </button>

                    <div>
                      <h3 className="text-lg font-medium text-foreground">Seus Dados</h3>
                      <p className="text-sm text-muted-foreground">Passo 2 de 2</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-foreground text-sm">Seu Nome</Label>
                        <Input
                          type="text"
                          placeholder="Nome completo"
                          value={employeeData.nome}
                          onChange={(e) => setEmployeeData({ ...employeeData, nome: e.target.value })}
                          className="h-11"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-foreground text-sm">E-mail</Label>
                        <Input
                          type="email"
                          placeholder="seu@email.com"
                          value={employeeData.email}
                          onChange={(e) => setEmployeeData({ ...employeeData, email: e.target.value })}
                          className="h-11"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-foreground text-sm">Senha</Label>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Mínimo 6 caracteres"
                            value={employeeData.password}
                            onChange={(e) => setEmployeeData({ ...employeeData, password: e.target.value })}
                            className="h-11 pr-11"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <Button type="submit" disabled={isLoading} className="w-full h-11">
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Conta'}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
