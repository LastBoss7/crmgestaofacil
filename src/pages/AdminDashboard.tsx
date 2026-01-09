import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  Users, 
  Search, 
  Eye,
  MoreHorizontal,
  Loader2,
  ShieldCheck,
  Calendar,
  Ticket,
  Plus,
  Copy,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface CompanyStats {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  created_at: string;
  owner_id: string;
  users_count: number;
  active: boolean;
}

interface InviteCode {
  id: string;
  code: string;
  created_at: string;
  expires_at: string | null;
  used_at: string | null;
  used_by_company_id: string | null;
  is_active: boolean;
}

const AdminDashboard = () => {
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<CompanyStats | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all companies with stats
  const { data: companies, isLoading } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: async () => {
      // Get all companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (companiesError) throw companiesError;

      // Get stats for each company
      const companiesWithStats: CompanyStats[] = await Promise.all(
        (companiesData || []).map(async (company) => {
          // Count users
          const { count: usersCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id);

          return {
            ...company,
            active: company.active ?? true,
            users_count: usersCount || 0,
          };
        })
      );

      return companiesWithStats;
    },
    enabled: isSuperAdmin,
  });

  // Fetch invite codes
  const { data: inviteCodes, isLoading: loadingCodes } = useQuery({
    queryKey: ['admin-invite-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_invite_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as InviteCode[];
    },
    enabled: isSuperAdmin,
  });

  // Toggle company active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ companyId, active }: { companyId: string; active: boolean }) => {
      const { error } = await supabase
        .from('companies')
        .update({ active })
        .eq('id', companyId);
      
      if (error) throw error;
    },
    onSuccess: (_, { active }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      toast.success(active ? 'Empresa ativada com sucesso' : 'Empresa desativada com sucesso');
    },
    onError: () => {
      toast.error('Erro ao atualizar status da empresa');
    },
  });

  // Generate invite code
  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createInviteCodeMutation = useMutation({
    mutationFn: async () => {
      const code = generateCode();
      const { error } = await supabase
        .from('company_invite_codes')
        .insert({
          code,
          created_by: user?.id,
        });
      
      if (error) throw error;
      return code;
    },
    onSuccess: (code) => {
      queryClient.invalidateQueries({ queryKey: ['admin-invite-codes'] });
      toast.success(`Código ${code} gerado com sucesso!`);
    },
    onError: () => {
      toast.error('Erro ao gerar código');
    },
  });

  const deleteInviteCodeMutation = useMutation({
    mutationFn: async (codeId: string) => {
      const { error } = await supabase
        .from('company_invite_codes')
        .delete()
        .eq('id', codeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invite-codes'] });
      toast.success('Código removido');
    },
    onError: () => {
      toast.error('Erro ao remover código');
    },
  });

  // Calculate totals
  const totals = {
    companies: companies?.length || 0,
    users: companies?.reduce((sum, c) => sum + c.users_count, 0) || 0,
  };

  // Filter companies by search
  const filteredCompanies = companies?.filter(
    (c) =>
      c.razao_social.toLowerCase().includes(search.toLowerCase()) ||
      c.nome_fantasia?.toLowerCase().includes(search.toLowerCase()) ||
      c.cnpj.includes(search)
  );

  if (superAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const viewCompanyDetails = (company: CompanyStats) => {
    setSelectedCompany(company);
    setDetailsOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Painel Administrativo</h1>
                <p className="text-sm text-muted-foreground">Gerenciamento de empresas</p>
              </div>
            </div>
            <Badge variant="outline" className="border-primary/50 text-primary">
              Super Admin
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Empresas
              </CardTitle>
              <Building2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.companies}</div>
              <p className="text-xs text-muted-foreground mt-1">cadastradas na plataforma</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Usuários
              </CardTitle>
              <Users className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.users}</div>
              <p className="text-xs text-muted-foreground mt-1">em todas as empresas</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Códigos de Convite
              </CardTitle>
              <Ticket className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {inviteCodes?.filter(c => !c.used_at && c.is_active).length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">disponíveis para uso</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="companies" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="companies" className="gap-2">
              <Building2 className="h-4 w-4" />
              Empresas
            </TabsTrigger>
            <TabsTrigger value="codes" className="gap-2">
              <Ticket className="h-4 w-4" />
              Códigos de Convite
            </TabsTrigger>
          </TabsList>

          {/* Companies Tab */}
          <TabsContent value="companies">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Empresas Cadastradas</CardTitle>
                    <CardDescription>
                      Gerencie todas as empresas da plataforma
                    </CardDescription>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar empresa..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Empresa</TableHead>
                          <TableHead>CNPJ</TableHead>
                          <TableHead className="text-center">Usuários</TableHead>
                          <TableHead>Criada em</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCompanies?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              Nenhuma empresa encontrada
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredCompanies?.map((company) => (
                            <TableRow key={company.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-foreground">
                                    {company.nome_fantasia || company.razao_social}
                                  </p>
                                  {company.nome_fantasia && (
                                    <p className="text-xs text-muted-foreground">
                                      {company.razao_social}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {company.cnpj}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary">{company.users_count}</Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {format(new Date(company.created_at), "dd/MM/yyyy", { locale: ptBR })}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Switch
                                    checked={company.active}
                                    onCheckedChange={(checked) => 
                                      toggleActiveMutation.mutate({ companyId: company.id, active: checked })
                                    }
                                    disabled={toggleActiveMutation.isPending}
                                  />
                                  <Badge variant={company.active ? "default" : "secondary"}>
                                    {company.active ? 'Ativa' : 'Inativa'}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => viewCompanyDetails(company)}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      Ver detalhes
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invite Codes Tab */}
          <TabsContent value="codes">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Códigos de Convite</CardTitle>
                    <CardDescription>
                      Gere códigos para novas empresas se cadastrarem
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => createInviteCodeMutation.mutate()}
                    disabled={createInviteCodeMutation.isPending}
                  >
                    {createInviteCodeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Gerar Código
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingCodes ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Criado em</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead>Usado em</TableHead>
                          <TableHead className="w-20">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inviteCodes?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              Nenhum código gerado ainda
                            </TableCell>
                          </TableRow>
                        ) : (
                          inviteCodes?.map((code) => (
                            <TableRow key={code.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-lg font-bold tracking-widest">
                                    {code.code}
                                  </span>
                                  {!code.used_at && code.is_active && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => {
                                        navigator.clipboard.writeText(code.code);
                                        toast.success('Código copiado!');
                                      }}
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {format(new Date(code.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </TableCell>
                              <TableCell className="text-center">
                                {code.used_at ? (
                                  <Badge variant="secondary">Utilizado</Badge>
                                ) : code.is_active ? (
                                  <Badge variant="default" className="bg-emerald-500">Disponível</Badge>
                                ) : (
                                  <Badge variant="destructive">Inativo</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {code.used_at 
                                  ? format(new Date(code.used_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                  : '-'
                                }
                              </TableCell>
                              <TableCell>
                                {!code.used_at && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => deleteInviteCodeMutation.mutate(code.id)}
                                    disabled={deleteInviteCodeMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Company Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Empresa</DialogTitle>
            <DialogDescription>
              Informações completas sobre a empresa selecionada
            </DialogDescription>
          </DialogHeader>
          {selectedCompany && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Razão Social</p>
                  <p className="font-medium">{selectedCompany.razao_social}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nome Fantasia</p>
                  <p className="font-medium">{selectedCompany.nome_fantasia || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CNPJ</p>
                  <p className="font-mono">{selectedCompany.cnpj}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data de Cadastro</p>
                  <p className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(selectedCompany.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="font-medium mb-3">Estatísticas</h4>
                <div className="text-center p-4 rounded-lg bg-secondary/50">
                  <Users className="h-6 w-6 mx-auto text-primary mb-2" />
                  <p className="text-3xl font-bold">{selectedCompany.users_count}</p>
                  <p className="text-sm text-muted-foreground">Usuários cadastrados</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
