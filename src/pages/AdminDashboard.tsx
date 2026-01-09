import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  Search, 
  Eye,
  MoreHorizontal,
  Loader2,
  ShieldCheck,
  Calendar,
  DollarSign
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

interface CompanyStats {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  created_at: string;
  owner_id: string;
  users_count: number;
  sales_count: number;
  total_value: number;
}

const AdminDashboard = () => {
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<CompanyStats | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

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

          // Count sales and total value
          const { data: salesData } = await supabase
            .from('sales')
            .select('valor_mensal')
            .eq('company_id', company.id);

          const salesCount = salesData?.length || 0;
          const totalValue = salesData?.reduce((sum, sale) => sum + (sale.valor_mensal || 0), 0) || 0;

          return {
            ...company,
            users_count: usersCount || 0,
            sales_count: salesCount,
            total_value: totalValue,
          };
        })
      );

      return companiesWithStats;
    },
    enabled: isSuperAdmin,
  });

  // Calculate totals
  const totals = {
    companies: companies?.length || 0,
    users: companies?.reduce((sum, c) => sum + c.users_count, 0) || 0,
    sales: companies?.reduce((sum, c) => sum + c.sales_count, 0) || 0,
    value: companies?.reduce((sum, c) => sum + c.total_value, 0) || 0,
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                Total Vendas
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.sales}</div>
              <p className="text-xs text-muted-foreground mt-1">registradas no sistema</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Valor Total
              </CardTitle>
              <DollarSign className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.value)}</div>
              <p className="text-xs text-muted-foreground mt-1">em vendas mensais</p>
            </CardContent>
          </Card>
        </div>

        {/* Companies Table */}
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
                      <TableHead className="text-center">Vendas</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead>Criada em</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                          <TableCell className="text-center">
                            <Badge variant="outline">{company.sales_count}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(company.total_value)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(company.created_at), "dd/MM/yyyy", { locale: ptBR })}
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
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-secondary/50">
                    <Users className="h-5 w-5 mx-auto text-primary mb-1" />
                    <p className="text-2xl font-bold">{selectedCompany.users_count}</p>
                    <p className="text-xs text-muted-foreground">Usuários</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-secondary/50">
                    <TrendingUp className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
                    <p className="text-2xl font-bold">{selectedCompany.sales_count}</p>
                    <p className="text-xs text-muted-foreground">Vendas</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-secondary/50">
                    <DollarSign className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                    <p className="text-lg font-bold">{formatCurrency(selectedCompany.total_value)}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
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
