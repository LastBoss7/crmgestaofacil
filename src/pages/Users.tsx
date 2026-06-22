import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Profile, AppRole, ROLE_LABELS, UserRole } from '@/types/database';
import { Plus, Search, UserCheck, UserX, Shield, UserPlus, Users2, KeyRound, Eye, EyeOff, Settings2, Trash2 } from 'lucide-react';
import { CreateUserDialog } from '@/components/users/CreateUserDialog';
import { CoordinatorTeamsDialog } from '@/components/users/CoordinatorTeamsDialog';
import { BackofficeTeamsDialog } from '@/components/users/BackofficeTeamsDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface UserWithRole extends Profile {
  role?: AppRole;
  team_name?: string;
  coordinator_team_names?: string[]; // For coordinators who manage multiple teams
  backoffice_team_names?: string[]; // For backoffice users who access multiple teams
}

const Users = () => {
  const navigate = useNavigate();
  const { canManageUsers, loading: authLoading, isCEO, isSupervisor, role } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isCoordinatorTeamsOpen, setIsCoordinatorTeamsOpen] = useState(false);
  const [isBackofficeTeamsOpen, setIsBackofficeTeamsOpen] = useState(false);
  const [newRole, setNewRole] = useState<AppRole | ''>('');
  const [newTeamId, setNewTeamId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Wait for both auth loading to complete AND role to be loaded
    // Role is loaded asynchronously after auth, so we need to wait for it
    if (!authLoading && role !== null && !canManageUsers) {
      navigate('/dashboard');
      toast.error('Acesso não autorizado');
    }
  }, [canManageUsers, authLoading, navigate, role]);

  const fetchUsers = async () => {
    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      toast.error('Erro ao carregar usuários');
      setLoading(false);
      return;
    }

    // Fetch all roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*');

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
    }

    // Fetch all teams
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('id, name');

    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
    }

    // Fetch coordinator team assignments
    const { data: coordinatorTeamsData, error: coordTeamsError } = await supabase
      .from('coordinator_teams')
      .select('coordinator_id, team_id');

    if (coordTeamsError) {
      console.error('Error fetching coordinator teams:', coordTeamsError);
    }

    // Fetch backoffice team assignments
    const { data: backofficeTeamsData, error: backofficeTeamsError } = await supabase
      .from('backoffice_teams')
      .select('backoffice_id, team_id');

    if (backofficeTeamsError) {
      console.error('Error fetching backoffice teams:', backofficeTeamsError);
    }

    setTeams(teamsData || []);

    // Create maps
    const rolesMap: Record<string, AppRole> = {};
    (roles || []).forEach((r: UserRole) => {
      rolesMap[r.user_id] = r.role;
    });

    const teamsMap: Record<string, string> = {};
    (teamsData || []).forEach((t) => {
      teamsMap[t.id] = t.name;
    });

    // Create coordinator teams map (coordinator_id -> array of team names)
    const coordinatorTeamsMap: Record<string, string[]> = {};
    (coordinatorTeamsData || []).forEach((ct) => {
      const teamName = teamsMap[ct.team_id];
      if (teamName) {
        if (!coordinatorTeamsMap[ct.coordinator_id]) {
          coordinatorTeamsMap[ct.coordinator_id] = [];
        }
        coordinatorTeamsMap[ct.coordinator_id].push(teamName);
      }
    });

    // Create backoffice teams map (backoffice_id -> array of team names)
    const backofficeTeamsMap: Record<string, string[]> = {};
    (backofficeTeamsData || []).forEach((bt) => {
      const teamName = teamsMap[bt.team_id];
      if (teamName) {
        if (!backofficeTeamsMap[bt.backoffice_id]) {
          backofficeTeamsMap[bt.backoffice_id] = [];
        }
        backofficeTeamsMap[bt.backoffice_id].push(teamName);
      }
    });

    const usersWithRoles: UserWithRole[] = (profiles || []).map((p: Profile) => ({
      ...p,
      role: rolesMap[p.id],
      team_name: p.team_id ? teamsMap[p.team_id] : undefined,
      coordinator_team_names: rolesMap[p.id] === 'COORDENADOR' ? coordinatorTeamsMap[p.id] : undefined,
      backoffice_team_names: rolesMap[p.id] === 'BACKOFFICE' ? backofficeTeamsMap[p.id] : undefined,
    }));

    setUsers(usersWithRoles);
    setLoading(false);
  };

  useEffect(() => {
    if (canManageUsers) {
      fetchUsers();
    }
  }, [canManageUsers]);

  const handleUserUpdate = async () => {
    if (!selectedUser || !newRole) return;

    // Check if role already exists
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', selectedUser.id)
      .maybeSingle();

    let roleError;
    
    if (existingRole) {
      // Update existing role
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', selectedUser.id);
      roleError = updateError;
    } else {
      // Insert new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: selectedUser.id, role: newRole });
      roleError = insertError;
    }

    if (roleError) {
      toast.error('Erro ao atualizar função');
      console.error(roleError);
      return;
    }

    // Update team_id for SUPERVISOR, BACKOFFICE or SELLER users
    if ((newRole === 'SUPERVISOR' || newRole === 'BACKOFFICE' || newRole === 'SELLER') && newTeamId !== selectedUser.team_id) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ team_id: newTeamId })
        .eq('id', selectedUser.id);

      if (profileError) {
        toast.error('Erro ao atualizar equipe');
        console.error(profileError);
        return;
      }
    }

    toast.success('Usuário atualizado com sucesso!');
    setIsEditOpen(false);
    fetchUsers();
  };

  const handleToggleActive = async (user: UserWithRole) => {
    const { error } = await supabase
      .from('profiles')
      .update({ active: !user.active })
      .eq('id', user.id);

    if (error) {
      toast.error('Erro ao atualizar status');
      console.error(error);
    } else {
      toast.success(user.active ? 'Usuário desativado' : 'Usuário ativado');
      fetchUsers();
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) {
      toast.error('Preencha a nova senha');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setIsResettingPassword(true);

    try {
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: {
          userId: selectedUser.id,
          newPassword: newPassword,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error('Erro ao redefinir senha: ' + error.message);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Senha de ${selectedUser.nome} redefinida com sucesso!`);
      setIsResetPasswordOpen(false);
      setNewPassword('');
      setShowPassword(false);
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Erro ao redefinir senha');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
    setShowPassword(true);
    toast.success('Senha gerada! Anote antes de salvar.');
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: selectedUser.id },
      });
      if (error) {
        toast.error('Erro ao excluir usuário: ' + error.message);
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      toast.success(`Usuário ${selectedUser.nome} excluído com sucesso`);
      setIsDeleteOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error('Erro ao excluir usuário');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date));
  };

  if (authLoading || !canManageUsers) {
    return null;
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
            <p className="text-muted-foreground">
              Gerencie os usuários e suas permissões
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Novo Usuário
          </Button>
        </div>

        {/* Search */}
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="shadow-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">Nenhum usuário encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Equipe</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.nome}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.role ? (
                            <Badge variant="outline" className="gap-1">
                              <Shield className="h-3 w-3" />
                              {ROLE_LABELS[user.role]}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Sem função</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {/* Show coordinator teams if user is a coordinator */}
                          {user.role === 'COORDENADOR' && user.coordinator_team_names && user.coordinator_team_names.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {user.coordinator_team_names.map((teamName, idx) => (
                                <Badge key={idx} variant="secondary" className="gap-1">
                                  <Users2 className="h-3 w-3" />
                                  {teamName}
                                </Badge>
                              ))}
                            </div>
                          ) : user.role === 'BACKOFFICE' && user.backoffice_team_names && user.backoffice_team_names.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {user.backoffice_team_names.map((teamName, idx) => (
                                <Badge key={idx} variant="secondary" className="gap-1">
                                  <Users2 className="h-3 w-3" />
                                  {teamName}
                                </Badge>
                              ))}
                            </div>
                          ) : user.team_name ? (
                            <Badge variant="secondary" className="gap-1">
                              <Users2 className="h-3 w-3" />
                              {user.team_name}
                            </Badge>
                          ) : user.role === 'COORDENADOR' ? (
                            <span className="text-muted-foreground text-sm italic">Sem equipes atribuídas</span>
                          ) : user.role === 'BACKOFFICE' ? (
                            <span className="text-muted-foreground text-sm italic">Acesso apenas à própria equipe</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.active ? 'default' : 'secondary'}>
                            {user.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Editar função"
                            onClick={() => {
                              setSelectedUser(user);
                              setNewRole(user.role || '');
                              setNewTeamId(user.team_id || null);
                              setIsEditOpen(true);
                            }}
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Redefinir senha"
                            onClick={() => {
                              setSelectedUser(user);
                              setNewPassword('');
                              setShowPassword(false);
                              setIsResetPasswordOpen(true);
                            }}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title={user.active ? 'Desativar usuário' : 'Ativar usuário'}
                            onClick={() => handleToggleActive(user)}
                          >
                            {user.active ? (
                              <UserX className="h-4 w-4 text-destructive" />
                            ) : (
                              <UserCheck className="h-4 w-4 text-emerald-600" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Excluir usuário"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Alterar função e equipe de {selectedUser?.nome}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Função</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a função" />
                  </SelectTrigger>
                  <SelectContent>
                    {isCEO && <SelectItem value="CEO">CEO (Super Admin)</SelectItem>}
                    {isCEO && <SelectItem value="COORDENADOR">Coordenador</SelectItem>}
                    {(isCEO || isSupervisor) && <SelectItem value="SUPERVISOR">Supervisor</SelectItem>}
                    {(isCEO || isSupervisor) && <SelectItem value="BACKOFFICE">Qualidade</SelectItem>}
                    <SelectItem value="SELLER">Vendedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Coordinator teams management button */}
              {newRole === 'COORDENADOR' && selectedUser && isCEO && (
                <div className="space-y-2">
                  <Label>Equipes do Coordenador</Label>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setIsCoordinatorTeamsOpen(true)}
                  >
                    <Settings2 className="h-4 w-4 mr-2" />
                    Gerenciar Equipes do Coordenador
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Defina quais equipes o coordenador terá acesso
                  </p>
                </div>
              )}

              {/* Team selector for SUPERVISOR, BACKOFFICE and SELLER */}
              {(newRole === 'SUPERVISOR' || newRole === 'BACKOFFICE' || newRole === 'SELLER') && (
                <div className="space-y-2">
                  <Label>
                    Equipe {newRole === 'SUPERVISOR' ? '(Equipe que lidera)' : newRole === 'BACKOFFICE' ? '(Unidade)' : ''}
                  </Label>
                  <Select 
                    value={newTeamId || 'none'} 
                    onValueChange={(v) => setNewTeamId(v === 'none' ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a equipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem equipe</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {newRole === 'SUPERVISOR' && (
                    <p className="text-xs text-muted-foreground">
                      O supervisor gerenciará esta equipe
                    </p>
                  )}
                </div>
              )}

              {/* Backoffice teams management button */}
              {newRole === 'BACKOFFICE' && selectedUser && isCEO && (
                <div className="space-y-2">
                  <Label>Equipes do Qualidade</Label>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setIsBackofficeTeamsOpen(true)}
                  >
                    <Settings2 className="h-4 w-4 mr-2" />
                    Gerenciar Equipes do Qualidade
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Defina quais equipes adicionais o Qualidade terá acesso (opcional)
                  </p>
                </div>
              )}

              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="text-sm font-medium">Permissões:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {newRole === 'CEO' && (
                    <>
                      <li>• Acesso total ao sistema</li>
                      <li>• Gerenciar usuários e funções</li>
                      <li>• Ver todas as vendas</li>
                      <li>• Alterar status de vendas</li>
                    </>
                  )}
                  {newRole === 'COORDENADOR' && (
                    <>
                      <li>• Ver vendas das equipes atribuídas</li>
                      <li>• Alterar status de vendas</li>
                      <li>• Gerenciar usuários das equipes</li>
                      <li>• Gerenciar metas e feedbacks</li>
                      <li>• Enviar broadcasts para equipes</li>
                    </>
                  )}
                  {newRole === 'SUPERVISOR' && (
                    <>
                      <li>• Gerenciar equipes</li>
                      <li>• Cadastrar vendedores</li>
                      <li>• Ver todas as vendas da empresa</li>
                      <li>• Enviar feedbacks</li>
                    </>
                  )}
                  {newRole === 'BACKOFFICE' && (
                    <>
                      <li>• Ver vendas da sua equipe</li>
                      <li>• Alterar status de vendas</li>
                      <li>• Editar dados das vendas</li>
                    </>
                  )}
                  {newRole === 'SELLER' && (
                    <>
                      <li>• Cadastrar novas vendas</li>
                      <li>• Ver apenas suas próprias vendas</li>
                      <li>• Não pode alterar status</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleUserUpdate} disabled={!newRole}>
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create User Dialog */}
        <CreateUserDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onUserCreated={fetchUsers}
        />

        {/* Reset Password Dialog */}
        <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Redefinir Senha
              </DialogTitle>
              <DialogDescription>
                Definir uma nova senha para {selectedUser?.nome}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                    onClick={generatePassword}
                  >
                    Gerar senha
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isResettingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/30 p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <strong>Atenção:</strong> Anote a senha antes de salvar. Ela não poderá ser visualizada depois.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsResetPasswordOpen(false);
                    setNewPassword('');
                    setShowPassword(false);
                  }}
                  disabled={isResettingPassword}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleResetPassword} 
                  disabled={isResettingPassword || newPassword.length < 6}
                >
                  {isResettingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Redefinir Senha'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Coordinator Teams Dialog */}
        {selectedUser && (
          <CoordinatorTeamsDialog
            open={isCoordinatorTeamsOpen}
            onOpenChange={setIsCoordinatorTeamsOpen}
            coordinatorId={selectedUser.id}
            coordinatorName={selectedUser.nome}
            onTeamsUpdated={fetchUsers}
          />
        )}

        {/* Backoffice Teams Dialog */}
        {selectedUser && (
          <BackofficeTeamsDialog
            open={isBackofficeTeamsOpen}
            onOpenChange={setIsBackofficeTeamsOpen}
            backofficeId={selectedUser.id}
            backofficeName={selectedUser.nome}
            onTeamsUpdated={fetchUsers}
          />
        )}

        {/* Delete confirmation */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir <strong>{selectedUser?.nome}</strong>?
                Esta ação é permanente e removerá o acesso, perfil e funções deste usuário.
                Vendas já cadastradas serão mantidas no histórico.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); handleDeleteUser(); }}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Excluindo...</>
                ) : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default Users;
