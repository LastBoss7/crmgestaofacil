import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  UserPlus, 
  Copy, 
  Trash2, 
  Loader2, 
  Clock, 
  CheckCircle, 
  Shield, 
  Briefcase,
  Sparkles,
  KeyRound
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamInvite {
  id: string;
  invite_code: string;
  role: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

interface Company {
  id: string;
  nome_fantasia: string | null;
  razao_social: string;
}

const TeamInvites = () => {
  const { user, isCEO } = useAuth();
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [newInvite, setNewInvite] = useState({
    role: 'SELLER' as 'SELLER' | 'BACKOFFICE',
    expiresInDays: '7'
  });

  const fetchData = async () => {
    if (!user) return;

    const { data: companyData } = await supabase
      .from('companies')
      .select('id, nome_fantasia, razao_social')
      .eq('owner_id', user.id)
      .single();

    if (!companyData) {
      setLoading(false);
      return;
    }

    setCompany(companyData);

    const { data: invitesData, error } = await supabase
      .from('team_invites')
      .select('*')
      .eq('company_id', companyData.id)
      .order('created_at', { ascending: false });

    if (!error && invitesData) {
      setInvites(invitesData);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateInvite = async () => {
    if (!company) return;

    setCreating(true);

    const inviteCode = generateInviteCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(newInvite.expiresInDays));

    const { error } = await supabase.from('team_invites').insert({
      company_id: company.id,
      invite_code: inviteCode,
      role: newInvite.role,
      invited_by: user!.id,
      expires_at: expiresAt.toISOString()
    });

    setCreating(false);

    if (error) {
      toast.error('Erro ao criar convite');
      return;
    }

    toast.success('Código gerado com sucesso!');
    setIsDialogOpen(false);
    setNewInvite({ role: 'SELLER', expiresInDays: '7' });
    fetchData();
  };

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast.success('Código copiado!');
  };

  const handleDeleteInvite = async (id: string) => {
    const { error } = await supabase
      .from('team_invites')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir convite');
      return;
    }

    toast.success('Convite excluído');
    fetchData();
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date));
  };

  const getInviteStatus = (invite: TeamInvite) => {
    if (invite.used_at) {
      return { label: 'Usado', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle };
    }
    if (new Date(invite.expires_at) < new Date()) {
      return { label: 'Expirado', color: 'text-white/40', bg: 'bg-white/5', border: 'border-white/10', icon: Clock };
    }
    return { label: 'Ativo', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', icon: Sparkles };
  };

  const getRoleInfo = (role: string) => {
    if (role === 'BACKOFFICE') {
      return { label: 'Backoffice', icon: Shield, color: 'from-blue-500 to-cyan-500' };
    }
    return { label: 'Vendedor', icon: Briefcase, color: 'from-violet-500 to-purple-500' };
  };

  if (!isCEO) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <p className="text-white/50">
            Apenas o proprietário da empresa pode gerenciar convites.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl blur-xl opacity-50" />
              <div className="relative p-4 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl">
                <UserPlus className="h-8 w-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Convites</h1>
              <p className="text-white/50">
                {company ? `Gerencie a equipe de ${company.nome_fantasia || company.razao_social}` : 'Gerencie sua equipe'}
              </p>
            </div>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white gap-2 shadow-lg shadow-violet-500/25">
                <UserPlus className="h-4 w-4" />
                Gerar Código
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white text-xl">Novo Código de Convite</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Role Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-white/70">Função do Membro</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewInvite({ ...newInvite, role: 'SELLER' })}
                      className={cn(
                        "p-4 rounded-xl border transition-all duration-200 text-left",
                        newInvite.role === 'SELLER'
                          ? "bg-gradient-to-br from-violet-500/20 to-purple-500/20 border-violet-500/50"
                          : "bg-white/[0.02] border-white/10 hover:bg-white/[0.04]"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          newInvite.role === 'SELLER' 
                            ? "bg-gradient-to-br from-violet-500 to-purple-600" 
                            : "bg-white/10"
                        )}>
                          <Briefcase className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">Vendedor</p>
                          <p className="text-white/40 text-xs">Cadastra vendas</p>
                        </div>
                      </div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setNewInvite({ ...newInvite, role: 'BACKOFFICE' })}
                      className={cn(
                        "p-4 rounded-xl border transition-all duration-200 text-left",
                        newInvite.role === 'BACKOFFICE'
                          ? "bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/50"
                          : "bg-white/[0.02] border-white/10 hover:bg-white/[0.04]"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          newInvite.role === 'BACKOFFICE' 
                            ? "bg-gradient-to-br from-blue-500 to-cyan-600" 
                            : "bg-white/10"
                        )}>
                          <Shield className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">Backoffice</p>
                          <p className="text-white/40 text-xs">Valida vendas</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
                
                {/* Expiry Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-white/70">Validade do Código</label>
                  <Select
                    value={newInvite.expiresInDays}
                    onValueChange={(v) => setNewInvite({ ...newInvite, expiresInDays: v })}
                  >
                    <SelectTrigger className="bg-white/[0.04] border-white/10 text-white h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      <SelectItem value="1" className="text-white">1 dia</SelectItem>
                      <SelectItem value="7" className="text-white">7 dias</SelectItem>
                      <SelectItem value="30" className="text-white">30 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter className="gap-3">
                <Button 
                  variant="ghost" 
                  onClick={() => setIsDialogOpen(false)}
                  className="text-white/60 hover:text-white hover:bg-white/5"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateInvite} 
                  disabled={creating}
                  className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white gap-2"
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="h-4 w-4" />
                  )}
                  Gerar Código
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-white/[0.02] border-white/[0.06] backdrop-blur-xl">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                  <Sparkles className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {invites.filter(i => !i.used_at && new Date(i.expires_at) > new Date()).length}
                  </p>
                  <p className="text-sm text-white/40">Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/[0.02] border-white/[0.06] backdrop-blur-xl">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {invites.filter(i => i.used_at).length}
                  </p>
                  <p className="text-sm text-white/40">Usados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/[0.02] border-white/[0.06] backdrop-blur-xl">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <Clock className="h-5 w-5 text-white/40" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {invites.filter(i => !i.used_at && new Date(i.expires_at) < new Date()).length}
                  </p>
                  <p className="text-sm text-white/40">Expirados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invites List */}
        <Card className="bg-white/[0.02] border-white/[0.06] backdrop-blur-xl overflow-hidden">
          <div className="p-6 border-b border-white/[0.06]">
            <h2 className="text-lg font-semibold text-white">Códigos Gerados</h2>
            <p className="text-sm text-white/40">Compartilhe o código com o novo membro</p>
          </div>
          
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
              </div>
            ) : invites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] mb-4">
                  <UserPlus className="h-10 w-10 text-white/20" />
                </div>
                <p className="text-lg font-medium text-white">Nenhum convite criado</p>
                <p className="text-white/40 text-sm mt-1">
                  Clique em "Gerar Código" para convidar membros
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {invites.map((invite) => {
                  const status = getInviteStatus(invite);
                  const roleInfo = getRoleInfo(invite.role);
                  const StatusIcon = status.icon;
                  const RoleIcon = roleInfo.icon;
                  const isActive = !invite.used_at && new Date(invite.expires_at) > new Date();
                  
                  return (
                    <div 
                      key={invite.id} 
                      className={cn(
                        "p-5 flex items-center justify-between transition-colors",
                        isActive ? "hover:bg-white/[0.02]" : "opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        {/* Role Icon */}
                        <div className={cn(
                          "p-2.5 rounded-xl bg-gradient-to-br",
                          roleInfo.color
                        )}>
                          <RoleIcon className="h-5 w-5 text-white" />
                        </div>
                        
                        {/* Code */}
                        <div>
                          <div className="flex items-center gap-3">
                            <code className="text-lg font-mono font-bold text-white tracking-widest">
                              {invite.invite_code}
                            </code>
                            {isActive && (
                              <button
                                onClick={() => handleCopyCode(invite.invite_code)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                                title="Copiar código"
                              >
                                <Copy className="h-3.5 w-3.5 text-white/60" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm text-white/40">{roleInfo.label}</span>
                            <span className="text-white/20">•</span>
                            <span className="text-sm text-white/40">Expira {formatDate(invite.expires_at)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {/* Status Badge */}
                        <div className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border",
                          status.bg,
                          status.border,
                          status.color
                        )}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </div>
                        
                        {/* Delete Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteInvite(invite.id)}
                          className="h-9 w-9 p-0 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default TeamInvites;
