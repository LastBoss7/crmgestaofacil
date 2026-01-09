import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Building2, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Loader2,
  Rocket,
  Sparkles
} from 'lucide-react';
import logo from '@/assets/logo.png';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: OnboardingStep[] = [
  {
    id: 1,
    title: 'Bem-vindo!',
    description: 'Vamos configurar sua empresa em poucos passos',
    icon: <Rocket className="h-8 w-8" />,
  },
  {
    id: 2,
    title: 'Perfil da Empresa',
    description: 'Complete as informações da sua empresa',
    icon: <Building2 className="h-8 w-8" />,
  },
  {
    id: 3,
    title: 'Criar Equipe',
    description: 'Crie sua primeira equipe de vendas',
    icon: <Users className="h-8 w-8" />,
  },
  {
    id: 4,
    title: 'Tudo Pronto!',
    description: 'Sua empresa está configurada',
    icon: <CheckCircle2 className="h-8 w-8" />,
  },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [companyData, setCompanyData] = useState({
    nome_fantasia: '',
  });
  const [teamData, setTeamData] = useState({
    name: '',
    description: '',
  });
  const [createdTeamId, setCreatedTeamId] = useState<string | null>(null);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchCompanyData();
  }, [user]);

  const fetchCompanyData = async () => {
    if (!profile?.company_id) return;
    
    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single();
    
    if (data) {
      setCompany(data);
      if (data.nome_fantasia) {
        setCompanyData({ nome_fantasia: data.nome_fantasia });
      }
    }
  };

  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleUpdateCompany = async () => {
    if (!profile?.company_id) return;
    
    setIsLoading(true);
    const { error } = await supabase
      .from('companies')
      .update({ nome_fantasia: companyData.nome_fantasia })
      .eq('id', profile.company_id);

    setIsLoading(false);
    
    if (error) {
      toast.error('Erro ao atualizar empresa');
      return;
    }
    
    toast.success('Empresa atualizada!');
    handleNext();
  };

  const handleCreateTeam = async () => {
    if (!profile?.company_id || !user) return;
    
    if (!teamData.name.trim()) {
      toast.error('Nome da equipe é obrigatório');
      return;
    }
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('teams')
      .insert({
        name: teamData.name,
        description: teamData.description || null,
        company_id: profile.company_id,
        supervisor_id: user.id,
      })
      .select()
      .single();

    setIsLoading(false);
    
    if (error) {
      toast.error('Erro ao criar equipe');
      return;
    }
    
    setCreatedTeamId(data.id);
    toast.success('Equipe criada com sucesso!');
    handleNext();
  };

  const handleFinish = async () => {
    navigate('/dashboard');
    toast.success('Bem-vindo ao seu CRM!');
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center space-y-6"
          >
            <div className="flex justify-center">
              <div className="p-4 bg-primary/10 rounded-full">
                <Sparkles className="h-16 w-16 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Bem-vindo, {profile?.nome}!</h2>
              <p className="text-muted-foreground">
                Parabéns por criar sua conta! Vamos configurar sua empresa 
                {company?.razao_social && <span className="font-medium text-foreground"> ({company.razao_social})</span>} 
                {' '}em apenas alguns passos.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Building2 className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Perfil</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Equipe</p>
              </div>
            </div>
            <Button onClick={handleNext} className="w-full" size="lg">
              Começar Configuração
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="space-y-2 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h2 className="text-xl font-bold">Perfil da Empresa</h2>
              <p className="text-muted-foreground text-sm">
                Complete as informações da sua empresa
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Razão Social</p>
                <p className="font-medium">{company?.razao_social}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">CNPJ</p>
                <p className="font-medium">{company?.cnpj}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome_fantasia">Nome Fantasia (opcional)</Label>
                <Input
                  id="nome_fantasia"
                  placeholder="Como sua empresa é conhecida"
                  value={companyData.nome_fantasia}
                  onChange={(e) => setCompanyData({ ...companyData, nome_fantasia: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button onClick={handleUpdateCompany} className="flex-1" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continuar'}
                {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="space-y-2 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h2 className="text-xl font-bold">Criar Primeira Equipe</h2>
              <p className="text-muted-foreground text-sm">
                Organize seus vendedores em equipes
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team_name">Nome da Equipe *</Label>
                <Input
                  id="team_name"
                  placeholder="Ex: Equipe Vendas SP"
                  value={teamData.name}
                  onChange={(e) => setTeamData({ ...teamData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team_description">Descrição (opcional)</Label>
                <Input
                  id="team_description"
                  placeholder="Breve descrição da equipe"
                  value={teamData.description}
                  onChange={(e) => setTeamData({ ...teamData, description: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button 
                onClick={handleCreateTeam} 
                className="flex-1" 
                disabled={isLoading || !teamData.name.trim()}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Equipe'}
                {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
            <Button 
              variant="ghost" 
              onClick={handleNext} 
              className="w-full text-muted-foreground"
            >
              Pular esta etapa
            </Button>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center space-y-6"
          >
            <div className="flex justify-center">
              <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle2 className="h-16 w-16 text-green-600" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Tudo Pronto!</h2>
              <p className="text-muted-foreground">
                Sua empresa está configurada e pronta para usar o CRM.
              </p>
              <p className="text-sm text-muted-foreground">
                Para adicionar membros à sua equipe, acesse Usuários e crie novos usuários.
              </p>
            </div>
            
            <div className="grid gap-3 pt-4">
              {createdTeamId && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg text-left">
                  <Users className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Equipe criada</p>
                    <p className="text-xs text-muted-foreground">{teamData.name}</p>
                  </div>
                </div>
              )}
            </div>

            <Button onClick={handleFinish} className="w-full" size="lg">
              <Rocket className="mr-2 h-4 w-4" />
              Ir para o Dashboard
            </Button>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={logo} alt="Logo" className="h-12 w-auto" />
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Etapa {currentStep} de {steps.length}</span>
            <span>{Math.round(progress)}% completo</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`w-2 h-2 rounded-full transition-colors ${
                step.id === currentStep
                  ? 'bg-primary'
                  : step.id < currentStep
                  ? 'bg-primary/50'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <Card className="border-0 shadow-xl bg-card/95 backdrop-blur">
          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              {renderStepContent()}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Skip link */}
        {currentStep < steps.length && currentStep > 1 && (
          <div className="text-center mt-4">
            <Button 
              variant="link" 
              onClick={handleSkip}
              className="text-muted-foreground text-sm"
            >
              Pular configuração e ir para o dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
