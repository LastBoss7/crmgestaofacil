import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Loader2, Users, Building } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

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

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite');
  
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [checkingCnpj, setCheckingCnpj] = useState(false);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(!!inviteCode);
  
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
        setLoadingInvite(false);
        return;
      }

      // Get company name
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
      
      setLoadingInvite(false);
    };

    loadInvite();
  }, [inviteCode]);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Format CNPJ as user types
  const formatCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18);
  };

  // Check if CNPJ already exists
  const checkCnpj = async (cnpj: string) => {
    if (cnpj.replace(/\D/g, '').length < 14) {
      setCnpjError(null);
      return;
    }

    setCheckingCnpj(true);
    const { data, error } = await supabase.rpc('cnpj_exists', { check_cnpj: cnpj });
    setCheckingCnpj(false);

    if (data === true) {
      setCnpjError('Este CNPJ já está cadastrado');
    } else {
      setCnpjError(null);
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
      toast.success('Login realizado com sucesso!');
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

    // 1. Create user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: companyData.email,
      password: companyData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          nome: companyData.nome
        }
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

    // 2. Create company
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

    // 3. Update profile with company_id
    await supabase
      .from('profiles')
      .update({ company_id: companyResult.id })
      .eq('id', authData.user.id);

    // 4. Assign CEO role
    await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'CEO'
      });

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

    // 1. Create user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: inviteSignupData.email,
      password: inviteSignupData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          nome: inviteSignupData.nome
        }
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

    // 2. Update profile with company_id
    await supabase
      .from('profiles')
      .update({ company_id: inviteData.company_id })
      .eq('id', authData.user.id);

    // 3. Assign role from invite
    await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: inviteData.role as 'CEO' | 'BACKOFFICE' | 'SELLER'
      });

    // 4. Mark invite as used
    await supabase
      .from('team_invites')
      .update({
        used_at: new Date().toISOString(),
        used_by: authData.user.id
      })
      .eq('id', inviteData.id);

    setIsLoading(false);
    toast.success('Conta criada com sucesso!');
    navigate('/dashboard');
  };

  if (authLoading || loadingInvite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-hero">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Invite signup flow
  if (inviteData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-hero p-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-primary/20 p-3">
                <Users className="h-10 w-10 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white">Convite de Equipe</h1>
            <p className="mt-2 text-white/70">
              Você foi convidado para fazer parte de
            </p>
            <p className="text-xl font-semibold text-primary-foreground bg-primary/30 px-4 py-2 rounded-lg mt-2">
              {inviteData.company_name}
            </p>
          </div>

          <Card className="border-none shadow-2xl">
            <form onSubmit={handleInviteSignup}>
              <CardHeader>
                <CardTitle>Criar sua conta</CardTitle>
                <CardDescription>
                  Preencha seus dados para entrar na equipe
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-nome">Nome completo</Label>
                  <Input
                    id="invite-nome"
                    type="text"
                    placeholder="Seu nome"
                    value={inviteSignupData.nome}
                    onChange={(e) => setInviteSignupData({ ...inviteSignupData, nome: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-email">E-mail</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={inviteSignupData.email}
                    onChange={(e) => setInviteSignupData({ ...inviteSignupData, email: e.target.value })}
                    required
                    disabled={!!inviteData.email}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-password">Senha</Label>
                  <Input
                    id="invite-password"
                    type="password"
                    placeholder="••••••"
                    value={inviteSignupData.password}
                    onChange={(e) => setInviteSignupData({ ...inviteSignupData, password: e.target.value })}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    'Entrar na Equipe'
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-primary/20 p-3">
              <Building2 className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">CRM Telecom</h1>
          <p className="mt-2 text-white/70">Vendas Corporativas</p>
        </div>

        <Card className="border-none shadow-2xl">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar Empresa</TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-mail</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleCompanySignup}>
                <CardContent className="space-y-4">
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                      <Building className="h-4 w-4" />
                      Dados da Empresa
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-cnpj">CNPJ *</Label>
                    <Input
                      id="signup-cnpj"
                      type="text"
                      placeholder="00.000.000/0000-00"
                      value={companyData.cnpj}
                      onChange={(e) => {
                        const formatted = formatCnpj(e.target.value);
                        setCompanyData({ ...companyData, cnpj: formatted });
                        checkCnpj(formatted);
                      }}
                      className={cnpjError ? 'border-destructive' : ''}
                      required
                    />
                    {checkingCnpj && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Verificando CNPJ...
                      </p>
                    )}
                    {cnpjError && (
                      <p className="text-xs text-destructive">{cnpjError}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-razao">Razão Social *</Label>
                    <Input
                      id="signup-razao"
                      type="text"
                      placeholder="Nome da empresa"
                      value={companyData.razao_social}
                      onChange={(e) => setCompanyData({ ...companyData, razao_social: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-fantasia">Nome Fantasia</Label>
                    <Input
                      id="signup-fantasia"
                      type="text"
                      placeholder="Nome fantasia (opcional)"
                      value={companyData.nome_fantasia}
                      onChange={(e) => setCompanyData({ ...companyData, nome_fantasia: e.target.value })}
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                      <Users className="h-4 w-4" />
                      Dados do Proprietário
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-nome">Seu nome completo *</Label>
                    <Input
                      id="signup-nome"
                      type="text"
                      placeholder="Seu nome"
                      value={companyData.nome}
                      onChange={(e) => setCompanyData({ ...companyData, nome: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-mail *</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={companyData.email}
                      onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha *</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••"
                      value={companyData.password}
                      onChange={(e) => setCompanyData({ ...companyData, password: e.target.value })}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex-col gap-2">
                  <Button type="submit" className="w-full" disabled={isLoading || !!cnpjError}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando empresa...
                      </>
                    ) : (
                      'Cadastrar Empresa'
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Você será o CEO/proprietário da empresa
                  </p>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
