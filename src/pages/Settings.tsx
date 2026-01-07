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
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl blur-xl opacity-50" />
            <div className="relative p-4 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl">
              <Crown className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Configurações</h1>
            <p className="text-white/50">Gerencie sua empresa e preferências do sistema</p>
          </div>
        </div>

        {/* Company Settings */}
        <Card className="bg-white/[0.02] border-white/[0.06] backdrop-blur-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/5" />
          <CardHeader className="relative border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-xl border border-violet-500/20">
                <Building2 className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-white">Dados da Empresa</CardTitle>
                <CardDescription className="text-white/40">Informações do seu negócio</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative p-6 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cnpj" className="text-white/70">CNPJ</Label>
                <div className="relative">
                  <Input
                    id="cnpj"
                    value={company?.cnpj || ''}
                    disabled
                    className="bg-white/[0.02] border-white/[0.08] text-white/50 pl-10"
                  />
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                </div>
                <p className="text-xs text-white/30">O CNPJ não pode ser alterado</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="razao" className="text-white/70">Razão Social</Label>
                <div className="relative">
                  <Input
                    id="razao"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 pl-10 focus:border-violet-500/50 focus:ring-violet-500/20"
                    placeholder="Nome legal da empresa"
                  />
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                </div>
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="fantasia" className="text-white/70">Nome Fantasia</Label>
                <div className="relative">
                  <Input
                    id="fantasia"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 pl-10 focus:border-violet-500/50 focus:ring-violet-500/20"
                    placeholder="Nome comercial da empresa"
                  />
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSaveCompany}
                disabled={saving}
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white gap-2 shadow-lg shadow-violet-500/25"
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
        <Card className="bg-white/[0.02] border-white/[0.06] backdrop-blur-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5" />
          <CardHeader className="relative border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl border border-amber-500/20">
                <User className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-white">Perfil do CEO</CardTitle>
                <CardDescription className="text-white/40">Suas informações pessoais</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative p-6 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-white/70">Nome</Label>
                <div className="relative">
                  <Input
                    value={profile?.nome || ''}
                    disabled
                    className="bg-white/[0.02] border-white/[0.08] text-white/50 pl-10"
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-white/70">E-mail</Label>
                <div className="relative">
                  <Input
                    value={profile?.email || ''}
                    disabled
                    className="bg-white/[0.02] border-white/[0.08] text-white/50 pl-10"
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-white/[0.02] border-white/[0.06] backdrop-blur-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5" />
          <CardHeader className="relative border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl border border-blue-500/20">
                <Bell className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-white">Notificações</CardTitle>
                <CardDescription className="text-white/40">Configure como receber alertas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-white/40" />
                  <div>
                    <p className="text-sm font-medium text-white">Notificações por E-mail</p>
                    <p className="text-xs text-white/40">Receba atualizações no seu e-mail</p>
                  </div>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-violet-500 data-[state=checked]:to-purple-600"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-white/40" />
                  <div>
                    <p className="text-sm font-medium text-white">Notificações Push</p>
                    <p className="text-xs text-white/40">Alertas em tempo real no navegador</p>
                  </div>
                </div>
                <Switch
                  checked={pushNotifications}
                  onCheckedChange={setPushNotifications}
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-violet-500 data-[state=checked]:to-purple-600"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-white/40" />
                  <div>
                    <p className="text-sm font-medium text-white">Sons de Alerta</p>
                    <p className="text-xs text-white/40">Tocar som ao receber notificações</p>
                  </div>
                </div>
                <Switch
                  checked={soundAlerts}
                  onCheckedChange={setSoundAlerts}
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-violet-500 data-[state=checked]:to-purple-600"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="bg-white/[0.02] border-white/[0.06] backdrop-blur-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-rose-500/5" />
          <CardHeader className="relative border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-xl border border-pink-500/20">
                <Palette className="h-5 w-5 text-pink-400" />
              </div>
              <div>
                <CardTitle className="text-white">Aparência</CardTitle>
                <CardDescription className="text-white/40">Personalize a interface</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-3">
                <Palette className="h-5 w-5 text-white/40" />
                <div>
                  <p className="text-sm font-medium text-white">Modo Escuro</p>
                  <p className="text-xs text-white/40">Interface com tema escuro premium</p>
                </div>
              </div>
              <Switch
                checked={darkMode}
                onCheckedChange={setDarkMode}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-violet-500 data-[state=checked]:to-purple-600"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Settings;
