import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { 
  User,
  Mail,
  Camera,
  Save,
  Loader2,
  Shield,
  Calendar,
  BadgeCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Profile = () => {
  const { user, profile, role } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setNome(profile.nome || '');
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'CEO':
        return { label: 'CEO', color: 'from-amber-500 to-orange-500' };
      case 'BACKOFFICE':
        return { label: 'Backoffice', color: 'from-blue-500 to-cyan-500' };
      case 'SELLER':
        return { label: 'Vendedor', color: 'from-emerald-500 to-teal-500' };
      default:
        return { label: 'Usuário', color: 'from-gray-500 to-gray-600' };
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione uma imagem válida.',
        variant: 'destructive'
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'A imagem deve ter no máximo 2MB.',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add timestamp to avoid cache
      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(urlWithTimestamp);
      toast({
        title: 'Foto atualizada',
        description: 'Sua foto de perfil foi atualizada com sucesso.'
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Erro ao enviar foto',
        description: 'Não foi possível atualizar sua foto de perfil.',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !nome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, preencha seu nome.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nome: nome.trim() })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso.'
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar seu perfil.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const roleBadge = getRoleBadge(role);

  return (
    <Layout>
      <div className="space-y-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-pink-600 rounded-2xl blur-xl opacity-50" />
            <div className="relative p-4 bg-gradient-to-br from-primary to-pink-600 rounded-2xl">
              <User className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Meu Perfil</h1>
            <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
          </div>
        </div>

        {/* Avatar Section */}
        <Card className="bg-card border-border overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-pink-500/5" />
          <CardContent className="relative p-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Avatar */}
              <div className="relative group">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/*"
                  className="hidden"
                />
                
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-br from-primary to-pink-600 rounded-full blur opacity-50 group-hover:opacity-75 transition-opacity" />
                  <Avatar className="relative h-28 w-28 border-4 border-card">
                    <AvatarImage src={avatarUrl || undefined} alt={nome} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-pink-600 text-primary-foreground text-2xl font-bold">
                      {getInitials(nome || 'U')}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Upload overlay */}
                <div 
                  className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => !uploading && fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  ) : (
                    <Camera className="h-8 w-8 text-white" />
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-2xl font-bold text-foreground">{nome || 'Usuário'}</h2>
                <p className="text-muted-foreground">{profile?.email}</p>
                
                {/* Role Badge */}
                <div className="mt-3">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${roleBadge.color}`}>
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {roleBadge.label}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card className="bg-card border-border overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5" />
          <CardHeader className="relative border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl border border-blue-500/20">
                <User className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-foreground">Informações Pessoais</CardTitle>
                <CardDescription className="text-muted-foreground">Atualize seus dados de perfil</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative p-6 space-y-6">
            <div className="space-y-4">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="nome" className="text-muted-foreground">Nome completo</Label>
                <div className="relative">
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="bg-muted/30 border-border text-foreground placeholder:text-muted-foreground pl-10 focus:border-primary/50 focus:ring-primary/20"
                    placeholder="Seu nome"
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* E-mail (read-only) */}
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
                <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado</p>
              </div>

              {/* Cargo (read-only) */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Cargo</Label>
                <div className="relative">
                  <Input
                    value={roleBadge.label}
                    disabled
                    className="bg-muted/50 border-border text-muted-foreground pl-10"
                  />
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* Member since (read-only) */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Membro desde</Label>
                <div className="relative">
                  <Input
                    value={profile?.created_at ? format(new Date(profile.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : '-'}
                    disabled
                    className="bg-muted/50 border-border text-muted-foreground pl-10"
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSaveProfile}
                disabled={saving || !nome.trim()}
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
      </div>
    </Layout>
  );
};

export default Profile;
