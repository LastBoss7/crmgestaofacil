import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Building2, ArrowRight, Check, Eye, EyeOff, ArrowLeft, Mail, Lock, User } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';

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

type AuthMode = 'login' | 'signup';
type SignupStep = 1 | 2;

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3, ease: "easeOut" }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const Auth = () => {
  const navigate = useNavigate();
  const { user, signIn, loading: authLoading } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingCnpj, setCheckingCnpj] = useState(false);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [cnpjValid, setCnpjValid] = useState(false);
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
    navigate('/onboarding');
  };

  const canProceedStep1 = companyData.cnpj.replace(/\D/g, '').length >= 14 && 
                          cnpjValid && 
                          companyData.razao_social.length >= 2;

  const resetSignup = () => {
    setSignupStep(1);
    setCompanyData({ nome: '', email: '', password: '', cnpj: '', razao_social: '', nome_fantasia: '' });
    setCnpjError(null);
    setCnpjValid(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <img src={logo} alt="Logo" className="h-16 w-16 object-contain" />
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-primary/10 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-purple-500/10 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      {/* Left Panel - Branding */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12"
      >
        {/* Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center"
        >
          <img src={logo} alt="Logo" className="h-14 w-14 object-contain" />
        </motion.div>

        {/* Hero Text */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="space-y-6"
        >
          <h1 className="text-5xl font-bold text-foreground leading-tight">
            Gerencie suas vendas
            <br />
            <span className="gradient-text">de forma inteligente</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-md leading-relaxed">
            Plataforma completa para gestão de vendas corporativas com acompanhamento em tempo real.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div 
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="flex items-center gap-10"
        >
          {[
            { value: '500+', label: 'Empresas' },
            { value: '10k+', label: 'Vendas' },
            { value: '98%', label: 'Satisfação' },
          ].map((stat) => (
            <motion.div 
              key={stat.label}
              variants={fadeInUp}
              className="text-center"
            >
              <p className="text-4xl font-bold gradient-text">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:hidden flex items-center justify-center mb-8"
          >
            <img src={logo} alt="Logo" className="h-16 w-16 object-contain" />
          </motion.div>

          {/* Auth Card */}
          <Card className="glass-card border-0 shadow-2xl">
            <CardHeader className="text-center pb-2">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <CardTitle className="text-2xl font-bold">
                  {mode === 'login' ? 'Bem-vindo de volta' : 'Cadastrar Empresa'}
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-2">
                  {mode === 'login' 
                    ? 'Entre com suas credenciais para acessar' 
                    : 'Cadastre sua empresa para começar'
                  }
                </CardDescription>
              </motion.div>
            </CardHeader>
            
            <CardContent className="pt-6">
              {/* Mode Tabs */}
              <div className="flex gap-1 p-1 bg-secondary/50 rounded-xl mb-6">
                <button
                  onClick={() => { setMode('login'); resetSignup(); }}
                  className={cn(
                    "flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-300",
                    mode === 'login' 
                      ? "bg-background text-foreground shadow-md" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Entrar
                </button>
                <button
                  onClick={() => { setMode('signup'); resetSignup(); }}
                  className={cn(
                    "flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-300",
                    mode === 'signup' 
                      ? "bg-background text-foreground shadow-md" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Criar Empresa
                </button>
              </div>

              <AnimatePresence mode="wait">
                {/* Login Form */}
                {mode === 'login' && (
                  <motion.form 
                    key="login"
                    onSubmit={handleLogin} 
                    className="space-y-5"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="space-y-2">
                      <Label className="text-foreground text-sm font-medium">E-mail</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="seu@email.com"
                          value={loginData.email}
                          onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                          className="h-12 pl-10 bg-secondary/30 border-border/50 focus:border-primary/50"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-foreground text-sm font-medium">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          className="h-12 pl-10 pr-12 bg-secondary/30 border-border/50 focus:border-primary/50"
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

                    <Button type="submit" disabled={isLoading} className="w-full h-12 text-base font-medium">
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          Entrar
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </motion.form>
                )}

                {/* Company Signup Flow */}
                {mode === 'signup' && (
                  <motion.div
                    key="signup"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <AnimatePresence mode="wait">
                      {/* Step 1 - Company Data */}
                      {signupStep === 1 && (
                        <motion.div 
                          key="step1"
                          className="space-y-5"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-emerald-500/20">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-foreground">Dados da Empresa</h3>
                              <p className="text-sm text-muted-foreground">Passo 1 de 2</p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label className="text-foreground text-sm font-medium">CNPJ</Label>
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
                                    "h-12 pr-10 bg-secondary/30 border-border/50",
                                    cnpjError && "border-destructive focus:border-destructive",
                                    cnpjValid && "border-primary focus:border-primary"
                                  )}
                                />
                                {checkingCnpj && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                                {cnpjValid && <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />}
                              </div>
                              {cnpjError && <p className="text-xs text-destructive">{cnpjError}</p>}
                            </div>

                            <div className="space-y-2">
                              <Label className="text-foreground text-sm font-medium">Razão Social</Label>
                              <Input
                                type="text"
                                placeholder="Nome oficial da empresa"
                                value={companyData.razao_social}
                                onChange={(e) => setCompanyData({ ...companyData, razao_social: e.target.value })}
                                className="h-12 bg-secondary/30 border-border/50"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-foreground text-sm font-medium">Nome Fantasia (opcional)</Label>
                              <Input
                                type="text"
                                placeholder="Nome comercial"
                                value={companyData.nome_fantasia}
                                onChange={(e) => setCompanyData({ ...companyData, nome_fantasia: e.target.value })}
                                className="h-12 bg-secondary/30 border-border/50"
                              />
                            </div>
                          </div>

                          <Button
                            onClick={() => setSignupStep(2)}
                            disabled={!canProceedStep1}
                            className="w-full h-12 text-base font-medium"
                          >
                            Continuar
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </motion.div>
                      )}

                      {/* Step 2 - Admin Data */}
                      {signupStep === 2 && (
                        <motion.form 
                          key="step2"
                          onSubmit={handleCompanySignup} 
                          className="space-y-5"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                        >
                          <button
                            type="button"
                            onClick={() => setSignupStep(1)}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                          >
                            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                            Voltar
                          </button>

                          <div>
                            <h3 className="text-lg font-semibold text-foreground">Dados do Administrador</h3>
                            <p className="text-sm text-muted-foreground">Passo 2 de 2</p>
                          </div>

                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label className="text-foreground text-sm font-medium">Seu Nome</Label>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  type="text"
                                  placeholder="Nome completo"
                                  value={companyData.nome}
                                  onChange={(e) => setCompanyData({ ...companyData, nome: e.target.value })}
                                  className="h-12 pl-10 bg-secondary/30 border-border/50"
                                  required
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-foreground text-sm font-medium">E-mail</Label>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  type="email"
                                  placeholder="seu@email.com"
                                  value={companyData.email}
                                  onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                                  className="h-12 pl-10 bg-secondary/30 border-border/50"
                                  required
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-foreground text-sm font-medium">Senha</Label>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  type={showPassword ? 'text' : 'password'}
                                  placeholder="Mínimo 6 caracteres"
                                  value={companyData.password}
                                  onChange={(e) => setCompanyData({ ...companyData, password: e.target.value })}
                                  className="h-12 pl-10 pr-12 bg-secondary/30 border-border/50"
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

                          <Button type="submit" disabled={isLoading} className="w-full h-12 text-base font-medium">
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Criar Conta'}
                          </Button>
                        </motion.form>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
