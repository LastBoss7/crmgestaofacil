import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Profile, AppRole, ROLE_LABELS, UserRole } from '@/types/database';
import { Plus, Search, UserCheck, UserX, Shield } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface UserWithRole extends Profile {
  role?: AppRole;
}

const Users = () => {
  const navigate = useNavigate();
  const { canManageUsers, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newRole, setNewRole] = useState<AppRole | ''>('');

  useEffect(() => {
    if (!authLoading && !canManageUsers) {
      navigate('/dashboard');
      toast.error('Acesso não autorizado');
    }
  }, [canManageUsers, authLoading, navigate]);

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

    // Combine profiles with roles
    const rolesMap: Record<string, AppRole> = {};
    (roles || []).forEach((r: UserRole) => {
      rolesMap[r.user_id] = r.role;
    });

    const usersWithRoles: UserWithRole[] = (profiles || []).map((p: Profile) => ({
      ...p,
      role: rolesMap[p.id],
    }));

    setUsers(usersWithRoles);
    setLoading(false);
  };

  useEffect(() => {
    if (canManageUsers) {
      fetchUsers();
    }
  }, [canManageUsers]);

  const handleRoleUpdate = async () => {
    if (!selectedUser || !newRole) return;

    // Check if role already exists
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', selectedUser.id)
      .maybeSingle();

    let error;
    
    if (existingRole) {
      // Update existing role
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', selectedUser.id);
      error = updateError;
    } else {
      // Insert new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: selectedUser.id, role: newRole });
      error = insertError;
    }

    if (error) {
      toast.error('Erro ao atualizar função');
      console.error(error);
    } else {
      toast.success('Função atualizada com sucesso!');
      setIsEditOpen(false);
      fetchUsers();
    }
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
                          <Badge variant={user.active ? 'default' : 'secondary'}>
                            {user.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setNewRole(user.role || '');
                              setIsEditOpen(true);
                            }}
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(user)}
                          >
                            {user.active ? (
                              <UserX className="h-4 w-4 text-destructive" />
                            ) : (
                              <UserCheck className="h-4 w-4 text-green-600" />
                            )}
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

        {/* Edit Role Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Função</DialogTitle>
              <DialogDescription>
                Alterar função de {selectedUser?.nome}
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
                    <SelectItem value="CEO">CEO (Super Admin)</SelectItem>
                    <SelectItem value="BACKOFFICE">Backoffice (Admin Operacional)</SelectItem>
                    <SelectItem value="SELLER">Vendedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                  {newRole === 'BACKOFFICE' && (
                    <>
                      <li>• Ver todas as vendas</li>
                      <li>• Alterar status de vendas</li>
                      <li>• Não pode gerenciar usuários</li>
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
                <Button onClick={handleRoleUpdate} disabled={!newRole}>
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Users;
