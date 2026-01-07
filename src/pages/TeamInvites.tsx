import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserPlus, Copy, Trash2, Loader2, Link as LinkIcon, Clock, CheckCircle } from 'lucide-react';

interface TeamInvite {
  id: string;
  invite_code: string;
  email: string | null;
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
    email: '',
    role: 'SELLER' as 'SELLER' | 'BACKOFFICE',
    expiresInDays: '7'
  });

  const fetchData = async () => {
    if (!user) return;

    // Get company
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

    // Get invites
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
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 16; i++) {
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
      email: newInvite.email || null,
      role: newInvite.role,
      invited_by: user!.id,
      expires_at: expiresAt.toISOString()
    });

    setCreating(false);

    if (error) {
      toast.error('Erro ao criar convite');
      return;
    }

    toast.success('Convite criado com sucesso!');
    setIsDialogOpen(false);
    setNewInvite({ email: '', role: 'SELLER', expiresInDays: '7' });
    fetchData();
  };

  const handleCopyLink = async (code: string) => {
    const link = `${window.location.origin}/auth?invite=${code}`;
    await navigator.clipboard.writeText(link);
    toast.success('Link copiado para a área de transferência!');
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
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getInviteStatus = (invite: TeamInvite) => {
    if (invite.used_at) {
      return { label: 'Usado', variant: 'default' as const, icon: CheckCircle };
    }
    if (new Date(invite.expires_at) < new Date()) {
      return { label: 'Expirado', variant: 'secondary' as const, icon: Clock };
    }
    return { label: 'Ativo', variant: 'outline' as const, icon: LinkIcon };
  };

  if (!isCEO) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">
            Apenas o proprietário da empresa pode gerenciar convites.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Convites de Equipe</h1>
            <p className="text-muted-foreground">
              {company 
                ? `Convide pessoas para ${company.nome_fantasia || company.razao_social}` 
                : 'Gerencie os convites da sua equipe'}
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Novo Convite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Convite</DialogTitle>
                <DialogDescription>
                  Gere um link único para convidar um membro para sua equipe
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail (opcional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={newInvite.email}
                    onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Se informado, apenas este e-mail poderá usar o convite
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Função</Label>
                  <Select
                    value={newInvite.role}
                    onValueChange={(v) => setNewInvite({ ...newInvite, role: v as 'SELLER' | 'BACKOFFICE' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SELLER">Vendedor</SelectItem>
                      <SelectItem value="BACKOFFICE">Backoffice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Validade</Label>
                  <Select
                    value={newInvite.expiresInDays}
                    onValueChange={(v) => setNewInvite({ ...newInvite, expiresInDays: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 dia</SelectItem>
                      <SelectItem value="7">7 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateInvite} disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Convite'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Invites List */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Convites Enviados</CardTitle>
            <CardDescription>
              Gerencie os links de convite da sua equipe
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : invites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhum convite criado</p>
                <p className="text-muted-foreground">
                  Crie convites para adicionar membros à sua equipe
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((invite) => {
                    const status = getInviteStatus(invite);
                    const StatusIcon = status.icon;
                    const isActive = !invite.used_at && new Date(invite.expires_at) > new Date();
                    
                    return (
                      <TableRow key={invite.id}>
                        <TableCell>
                          {invite.email || <span className="text-muted-foreground">Qualquer</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {invite.role === 'SELLER' ? 'Vendedor' : 'Backoffice'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(invite.expires_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {isActive && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyLink(invite.invite_code)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteInvite(invite.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default TeamInvites;
