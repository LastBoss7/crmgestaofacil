import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import { 
  Building2, 
  Save, 
  Bell, 
  Shield, 
  Palette,
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Loader2,
  CheckCircle2,
  Crown
} from 'lucide-react';

interface CompanyData {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
}

const Settings = () => {
  const { user, profile, isCEO } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<CompanyData | null>(null);
  
  // Company form
  const [companyName, setCompanyName] = useState('');
  const [tradeName, setTradeName] = useState('');
  
  // Preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    if (user && isCEO) {
      fetchCompanyData();
    } else {
      setLoading(false);
    }
  }, [user, isCEO]);

  const fetchCompanyData = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setCompany(data);
        setCompanyName(data.razao_social);
        setTradeName(data.nome_fantasia || '');
      }
    } catch (error) {
      console.error('Error fetching company:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!company) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          razao_social: companyName,
          nome_fantasia: tradeName || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', company.id);

      if (error) throw error;

      toast({
        title: "Configurações salvas",
        description: "As informações da empresa foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error('Error saving company:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar as informações.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isCEO) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-pink-600 rounded-2xl blur-xl opacity-50" />
            <div className="relative p-4 bg-gradient-to-br from-primary to-pink-600 rounded-2xl">
              <Crown className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Configurações</h1>
            <p className="text-muted-foreground">Gerencie sua empresa e preferências do sistema</p>
          </div>
        </div>

        {/* Company Settings */}
        <Card className="bg-card border-border overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-pink-500/5" />
          <CardHeader className="relative border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-primary/20 to-pink-500/20 rounded-xl border border-primary/20">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-foreground">Dados da Empresa</CardTitle>
                <CardDescription className="text-muted-foreground">Informações do seu negócio</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative p-6 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cnpj" className="text-muted-foreground">CNPJ</Label>
                <div className="relative">
                  <Input
                    id="cnpj"
                    value={company?.cnpj || ''}
                    disabled
                    className="bg-muted/50 border-border text-muted-foreground pl-10"
                  />
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">O CNPJ não pode ser alterado</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="razao" className="text-muted-foreground">Razão Social</Label>
                <div className="relative">
                  <Input
                    id="razao"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="bg-muted/30 border-border text-foreground placeholder:text-muted-foreground pl-10 focus:border-primary/50 focus:ring-primary/20"
                    placeholder="Nome legal da empresa"
                  />
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="fantasia" className="text-muted-foreground">Nome Fantasia</Label>
                <div className="relative">
                  <Input
                    id="fantasia"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    className="bg-muted/30 border-border text-foreground placeholder:text-muted-foreground pl-10 focus:border-primary/50 focus:ring-primary/20"
                    placeholder="Nome comercial da empresa"
                  />
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSaveCompany}
                disabled={saving}
                className="bg-gradient-to-r from-primary to-pink-600 hover:from-primary/90 hover:to-pink-700 text-primary-foreground gap-2 shadow-lg shadow-primary/25"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar Alterações
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Profile Settings */}
        <Card className="bg-card border-border overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5" />
          <CardHeader className="relative border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl border border-amber-500/20">
                <User className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-foreground">Perfil do CEO</CardTitle>
                <CardDescription className="text-muted-foreground">Suas informações pessoais</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative p-6 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Nome</Label>
                <div className="relative">
                  <Input
                    value={profile?.nome || ''}
                    disabled
                    className="bg-muted/50 border-border text-muted-foreground pl-10"
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-muted-foreground">E-mail</Label>
                <div className="relative">
                  <Input
                    value={profile?.email || ''}
                    disabled
                    className="bg-muted/50 border-border text-muted-foreground pl-10"
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-card border-border overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5" />
          <CardHeader className="relative border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl border border-blue-500/20">
                <Bell className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-foreground">Notificações</CardTitle>
                <CardDescription className="text-muted-foreground">Configure como receber alertas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Notificações por E-mail</p>
                    <p className="text-xs text-muted-foreground">Receba atualizações no seu e-mail</p>
                  </div>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Notificações Push</p>
                    <p className="text-xs text-muted-foreground">Alertas em tempo real no navegador</p>
                  </div>
                </div>
                <Switch
                  checked={pushNotifications}
                  onCheckedChange={setPushNotifications}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Sons de Alerta</p>
                    <p className="text-xs text-muted-foreground">Tocar som ao receber notificações</p>
                  </div>
                </div>
                <Switch
                  checked={soundAlerts}
                  onCheckedChange={setSoundAlerts}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="bg-card border-border overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-rose-500/5" />
          <CardHeader className="relative border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-xl border border-pink-500/20">
                <Palette className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <CardTitle className="text-foreground">Aparência</CardTitle>
                <CardDescription className="text-muted-foreground">Personalize a interface</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
              <div className="flex items-center gap-3">
                <Palette className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Modo Escuro</p>
                  <p className="text-xs text-muted-foreground">Interface com tema escuro premium</p>
                </div>
              </div>
              <Switch
                checked={darkMode}
                onCheckedChange={setDarkMode}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Settings;
