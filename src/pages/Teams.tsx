import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Users, UserCog, Pencil, Trash2, UserPlus, UserMinus } from 'lucide-react';
import { Profile, Team, AppRole, ROLE_LABELS } from '@/types/database';
import { useNavigate } from 'react-router-dom';

interface TeamWithDetails extends Team {
  supervisor?: Profile;
  members?: (Profile & { role?: AppRole })[];
}

export default function Teams() {
  const { user, isCEO, isBackoffice, profile } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<TeamWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamWithDetails | null>(null);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamWithDetails | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [supervisorId, setSupervisorId] = useState('');
  
  // Available users for supervisor/members
  const [backofficeUsers, setBackofficeUsers] = useState<(Profile & { role?: AppRole })[]>([]);
  const [sellerUsers, setSellerUsers] = useState<(Profile & { role?: AppRole })[]>([]);

  const canAccessPage = isCEO || isBackoffice;

  useEffect(() => {
    if (!canAccessPage) {
      navigate('/dashboard');
      return;
    }
    fetchTeams();
    fetchUsers();
  }, [canAccessPage, navigate]);

  const fetchTeams = async () => {
    try {
      const { data: teamsData, error } = await supabase
        .from('teams')
        .select('*')
        .order('name');

      if (error) throw error;

      // Fetch supervisor and members for each team
      const teamsWithDetails: TeamWithDetails[] = await Promise.all(
        (teamsData || []).map(async (team) => {
          // Get supervisor
          const { data: supervisor } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', team.supervisor_id)
            .single();

          // Get members
          const { data: members } = await supabase
            .from('profiles')
            .select('*')
            .eq('team_id', team.id);

          // Get roles for members
          const membersWithRoles = await Promise.all(
            (members || []).map(async (member) => {
              const { data: roleData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', member.id)
                .single();
              return { ...member, role: roleData?.role as AppRole };
            })
          );

          return {
            ...team,
            supervisor: supervisor || undefined,
            members: membersWithRoles,
          };
        })
      );

      setTeams(teamsWithDetails);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast.error('Erro ao carregar equipes');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch all profiles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('active', true);

      if (error) throw error;

      // Fetch all roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('*');

      const profilesWithRoles = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return { ...profile, role: userRole?.role as AppRole };
      });

      setBackofficeUsers(profilesWithRoles.filter(p => p.role === 'BACKOFFICE'));
      setSellerUsers(profilesWithRoles.filter(p => p.role === 'SELLER'));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !supervisorId) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (editingTeam) {
        const { error } = await supabase
          .from('teams')
          .update({
            name: name.trim(),
            description: description.trim() || null,
            supervisor_id: supervisorId,
          })
          .eq('id', editingTeam.id);

        if (error) throw error;
        toast.success('Equipe atualizada com sucesso');
      } else {
        const { error } = await supabase
          .from('teams')
          .insert({
            name: name.trim(),
            description: description.trim() || null,
            supervisor_id: supervisorId,
            company_id: profile?.company_id || user?.id,
          });

        if (error) throw error;
        toast.success('Equipe criada com sucesso');
      }

      resetForm();
      setDialogOpen(false);
      fetchTeams();
    } catch (error) {
      console.error('Error saving team:', error);
      toast.error('Erro ao salvar equipe');
    }
  };

  const handleDelete = async (teamId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta equipe?')) return;

    try {
      // First remove team_id from all members
      await supabase
        .from('profiles')
        .update({ team_id: null })
        .eq('team_id', teamId);

      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;
      toast.success('Equipe excluída com sucesso');
      fetchTeams();
    } catch (error) {
      console.error('Error deleting team:', error);
      toast.error('Erro ao excluir equipe');
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!selectedTeam) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ team_id: selectedTeam.id })
        .eq('id', userId);

      if (error) throw error;
      toast.success('Membro adicionado à equipe');
      fetchTeams();
      fetchUsers();
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Erro ao adicionar membro');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ team_id: null })
        .eq('id', userId);

      if (error) throw error;
      toast.success('Membro removido da equipe');
      fetchTeams();
      fetchUsers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Erro ao remover membro');
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setSupervisorId('');
    setEditingTeam(null);
  };

  const openEditDialog = (team: TeamWithDetails) => {
    setEditingTeam(team);
    setName(team.name);
    setDescription(team.description || '');
    setSupervisorId(team.supervisor_id);
    setDialogOpen(true);
  };

  const openMembersDialog = (team: TeamWithDetails) => {
    setSelectedTeam(team);
    setMembersDialogOpen(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // For supervisors, only show sellers without a team (they can only add to their own team)
  const availableSellers = sellerUsers.filter(seller => {
    if (isCEO) {
      return !seller.team_id || seller.team_id === selectedTeam?.id;
    }
    // Supervisors can only see sellers without a team
    return !seller.team_id;
  });

  // Check if user can manage a specific team
  const canManageTeam = (team: TeamWithDetails) => {
    return isCEO || team.supervisor_id === user?.id;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Equipes</h1>
            <p className="text-muted-foreground">
              {isCEO ? 'Gerencie as equipes e seus membros' : 'Gerencie os membros da sua equipe'}
            </p>
          </div>
          {isCEO && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Equipe
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTeam ? 'Editar Equipe' : 'Nova Equipe'}</DialogTitle>
                <DialogDescription>
                  {editingTeam ? 'Atualize as informações da equipe' : 'Crie uma nova equipe para sua empresa'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Equipe *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Unidade Centro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descrição opcional da equipe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supervisor">Supervisor (Backoffice) *</Label>
                  <Select value={supervisorId} onValueChange={setSupervisorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o supervisor" />
                    </SelectTrigger>
                    <SelectContent>
                      {backofficeUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.nome} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit}>
                  {editingTeam ? 'Salvar' : 'Criar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        </div>

        {teams.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma equipe cadastrada</h3>
              <p className="text-muted-foreground text-center mb-4">
                {isCEO ? 'Crie sua primeira equipe para organizar seus vendedores' : 'Você não possui uma equipe atribuída'}
              </p>
              {isCEO && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Equipe
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {teams.map((team) => (
              <Card key={team.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {team.name}
                      </CardTitle>
                      {team.description && (
                        <CardDescription className="mt-1">{team.description}</CardDescription>
                      )}
                    </div>
                    {isCEO && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(team)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(team.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Supervisor */}
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={team.supervisor?.avatar_url || undefined} />
                      <AvatarFallback>{team.supervisor ? getInitials(team.supervisor.nome) : '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{team.supervisor?.nome || 'Sem supervisor'}</p>
                      <p className="text-sm text-muted-foreground truncate">{team.supervisor?.email}</p>
                    </div>
                    <Badge variant="secondary">
                      <UserCog className="h-3 w-3 mr-1" />
                      Supervisor
                    </Badge>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        Membros ({team.members?.length || 0})
                      </p>
                      {canManageTeam(team) && (
                        <Button variant="outline" size="sm" onClick={() => openMembersDialog(team)}>
                          <UserPlus className="h-3 w-3 mr-1" />
                          Gerenciar
                        </Button>
                      )}
                    </div>
                    {team.members && team.members.length > 0 ? (
                      <div className="space-y-2">
                        {team.members.slice(0, 3).map((member) => (
                          <div key={member.id} className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={member.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">{getInitials(member.nome)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm truncate">{member.nome}</span>
                            <Badge variant="outline" className="text-xs">
                              {ROLE_LABELS[member.role || 'SELLER']}
                            </Badge>
                          </div>
                        ))}
                        {team.members.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            + {team.members.length - 3} outros membros
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum membro na equipe</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Members Dialog */}
        <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Gerenciar Membros - {selectedTeam?.name}</DialogTitle>
              <DialogDescription>
                Adicione ou remova vendedores desta equipe
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {/* Current Members */}
              {selectedTeam?.members && selectedTeam.members.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Membros Atuais</h4>
                  <div className="space-y-2">
                    {selectedTeam.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback>{getInitials(member.nome)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{member.nome}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(member.id)}>
                          <UserMinus className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Sellers */}
              <div>
                <h4 className="font-medium mb-2">Vendedores Disponíveis</h4>
                {availableSellers.filter(s => s.team_id !== selectedTeam?.id).length > 0 ? (
                  <div className="space-y-2">
                    {availableSellers
                      .filter(s => s.team_id !== selectedTeam?.id)
                      .map((seller) => (
                        <div key={seller.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={seller.avatar_url || undefined} />
                              <AvatarFallback>{getInitials(seller.nome)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{seller.nome}</p>
                              <p className="text-xs text-muted-foreground">{seller.email}</p>
                            </div>
                          </div>
                          <Button variant="outline" size="icon" onClick={() => handleAddMember(seller.id)}>
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Todos os vendedores já estão em equipes
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
