import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().trim().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const signupSchema = z.object({
  nome: z.string().trim().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100, 'Nome muito longo'),
  email: z.string().trim().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const Auth = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ nome: '', email: '', password: '' });

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = signupSchema.safeParse(signupData);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(signupData.email, signupData.password, signupData.nome);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Este e-mail já está cadastrado');
      } else {
        toast.error('Erro ao criar conta. Tente novamente.');
      }
    } else {
      toast.success('Conta criada com sucesso!');
      navigate('/dashboard');
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-hero">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
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
              <form onSubmit={handleSignup}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-nome">Nome completo</Label>
                    <Input
                      id="signup-nome"
                      type="text"
                      placeholder="Seu nome"
                      value={signupData.nome}
                      onChange={(e) => setSignupData({ ...signupData, nome: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-mail</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex-col gap-2">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      'Criar conta'
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Novos usuários precisam ter uma role atribuída pelo CEO
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
