import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { StatusBadge } from '@/components/ui/status-badge';
import { supabase } from '@/integrations/supabase/client';
import { Sale, SaleStatus, SALE_STATUS_LABELS, Profile } from '@/types/database';
import { Plus, Search, Filter, Eye, History, Download, FileSpreadsheet, FileText, FileIcon, ImageIcon, Loader2, Upload, X, Printer, Pencil, Package, Users2, CalendarDays, DollarSign, Info } from 'lucide-react';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SaleComments } from '@/components/sales/SaleComments';
import { SaleStatusActions } from '@/components/sales/SaleStatusActions';
import { SaleForm } from '@/components/sales/SaleForm';
import { SaleEditForm } from '@/components/sales/SaleEditForm';
import { SaleDetails } from '@/components/sales/SaleDetails';
import { ChangeSellerDialog } from '@/components/sales/ChangeSellerDialog';
import { PendingSalesAlert } from '@/components/sales/PendingSalesAlert';
import { CancelledSalesAnalysis } from '@/components/dashboard/CancelledSalesAnalysis';
import { exportToExcel, exportToPDF, exportSaleDetailsToPDF, getPeriodLabel } from '@/lib/export-utils';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface SaleWithSeller extends Sale {
  seller?: Profile;
}

const Sales = () => {
  const navigate = useNavigate();
  const { user, profile, isSeller, isCEO, isBackoffice, isSupervisor, isCoordinator } = useAuth();
  const [sales, setSales] = useState<SaleWithSeller[]>([]);
  const [sellers, setSellers] = useState<Record<string, Profile>>({});
  const [teams, setTeams] = useState<Record<string, string>>({});
  const [teamsList, setTeamsList] = useState<{ id: string; name: string }[]>([]);
  const [userTeamName, setUserTeamName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SaleStatus[]>([]);
  const [planoFilter, setPlanoFilter] = useState<string[]>([]);
  const [teamFilter, setTeamFilter] = useState<string[]>([]);
  const [sellerFilter, setSellerFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleWithSeller | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newDocuments, setNewDocuments] = useState<File[]>([]);
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Fetch user's team name for export info
  useEffect(() => {
    const fetchUserTeamName = async () => {
      if (profile?.team_id) {
        const { data } = await supabase
          .from('teams')
          .select('name')
          .eq('id', profile.team_id)
          .maybeSingle();
        if (data) {
          setUserTeamName(data.name);
        }
      }
    };
    fetchUserTeamName();
  }, [profile?.team_id]);

  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf';
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      if (!isValidType) toast.error(`${file.name}: Tipo de arquivo não suportado`);
      if (!isValidSize) toast.error(`${file.name}: Arquivo muito grande (máx 10MB)`);
      return isValidType && isValidSize;
    });
    setNewDocuments(prev => [...prev, ...validFiles]);
    if (e.target) e.target.value = '';
  };

  const removeNewDocument = (index: number) => {
    setNewDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadNewDocuments = async () => {
    if (!selectedSale || newDocuments.length === 0) return;
    
    setIsUploadingDocs(true);
    try {
      const uploadedPaths: string[] = [];
      
      for (const file of newDocuments) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${selectedSale.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('sale-documents')
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;
        uploadedPaths.push(fileName);
      }
      
      const existingDocs = selectedSale.documentos || [];
      const allDocs = [...existingDocs, ...uploadedPaths];
      
      const { error: updateError } = await supabase
        .from('sales')
        .update({ documentos: allDocs } as any)
        .eq('id', selectedSale.id);
      
      if (updateError) throw updateError;
      
      setSelectedSale({ ...selectedSale, documentos: allDocs });
      setNewDocuments([]);
      toast.success(`${uploadedPaths.length} documento(s) adicionado(s)`);
      fetchSales();
    } catch (error) {
      console.error('Error uploading documents:', error);
      toast.error('Erro ao enviar documentos');
    } finally {
      setIsUploadingDocs(false);
    }
  };

  const fetchSales = async () => {
    if (!user) return;

    // Use sales_secure view for reading - masks sensitive data based on user role
    let query = supabase
      .from('sales_secure')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Filter by company_id for multi-tenancy
    if (profile?.company_id) {
      query = query.eq('company_id', profile.company_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching sales:', error);
      toast.error('Erro ao carregar vendas');
    } else {
      setSales((data || []) as SaleWithSeller[]);
      
      // Fetch seller profiles
      const sellerIds = [...new Set((data || []).map(s => s.seller_id).filter(Boolean))];
      if (sellerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', sellerIds);
        
        const sellersMap: Record<string, Profile> = {};
        (profilesData || []).forEach((p: Profile) => {
          sellersMap[p.id] = p;
        });
        setSellers(sellersMap);
      }
    }
    setLoading(false);
  };

  const fetchTeams = async () => {
    const { data } = await supabase.from('teams').select('id, name').order('name');
    if (data) {
      const teamsMap: Record<string, string> = {};
      data.forEach((t: { id: string; name: string }) => {
        teamsMap[t.id] = t.name;
      });
      setTeams(teamsMap);
      setTeamsList(data);
    }
  };

  useEffect(() => {
    fetchSales();
    fetchTeams();
  }, [user, profile?.company_id]);

  const handleSaleCreated = () => {
    setIsNewSaleOpen(false);
    fetchSales();
  };


  // Get unique planos for filter
  const uniquePlanos = useMemo(() => {
    const planos = sales
      .map(s => s.plano_contratado)
      .filter((p): p is string => Boolean(p && p.trim()));
    return [...new Set(planos)].sort();
  }, [sales]);

  // Get unique sellers for filter
  const sellerOptions = useMemo(() => {
    return Object.values(sellers)
      .filter(s => s.nome)
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map(s => ({ value: s.id, label: s.nome }));
  }, [sellers]);

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const matchesSearch =
        sale.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.cnpj_cliente.includes(searchTerm) ||
        (sale.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      
      // Multi-select filter: if no status selected, show all
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(sale.status);
      
      // Plano filter
      const matchesPlano = planoFilter.length === 0 || 
        (sale.plano_contratado && planoFilter.includes(sale.plano_contratado));
      
      // Team filter - match by team name or team ID
      const matchesTeam = teamFilter.length === 0 || 
        (sale.equipe && (
          teamFilter.includes(sale.equipe) ||
          teamFilter.some(teamId => teams[teamId] === sale.equipe)
        ));
      
      // Seller filter
      const matchesSeller = sellerFilter.length === 0 || 
        (sale.seller_id && sellerFilter.includes(sale.seller_id));
      
      // Date range filter - compare dates as strings to avoid timezone issues
      const matchesDateRange = (() => {
        if (!dateRange?.from) return true;
        
        // Format dates as YYYY-MM-DD for proper comparison
        const formatDateString = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        
        // Get sale date - prefer data_venda, fallback to created_at
        let saleDateStr: string;
        if (sale.data_venda) {
          // data_venda is already in YYYY-MM-DD format
          saleDateStr = sale.data_venda;
        } else {
          // Extract date from created_at timestamp
          const createdDate = new Date(sale.created_at);
          saleDateStr = formatDateString(createdDate);
        }
        
        const fromStr = formatDateString(dateRange.from);
        
        if (dateRange.to) {
          const toStr = formatDateString(dateRange.to);
          return saleDateStr >= fromStr && saleDateStr <= toStr;
        }
        return saleDateStr >= fromStr;
      })();
      
      return matchesSearch && matchesStatus && matchesPlano && matchesTeam && matchesSeller && matchesDateRange;
    });
  }, [sales, searchTerm, statusFilter, planoFilter, teamFilter, sellerFilter, teams, dateRange]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, planoFilter, teamFilter, sellerFilter, dateRange]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredSales.length / pageSize));
  const paginatedSales = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredSales.slice(startIndex, startIndex + pageSize);
  }, [filteredSales, currentPage, pageSize]);

  // Calculate total revenue for filtered sales (CEO only feature) - excludes cancelled sales
  const filteredSalesRevenue = useMemo(() => {
    return filteredSales
      .filter(sale => sale.status !== 'CANCELADA')
      .reduce((acc, sale) => acc + (Number(sale.valor_mensal) || 0), 0);
  }, [filteredSales]);

  // Count cancelled sales excluded from revenue
  const cancelledSalesCount = useMemo(() => {
    return filteredSales.filter(sale => sale.status === 'CANCELADA').length;
  }, [filteredSales]);

  // Get status filter label for display
  const statusFilterLabel = useMemo(() => {
    if (statusFilter.length === 0) return 'Todas as vendas';
    if (statusFilter.length === 1) return SALE_STATUS_LABELS[statusFilter[0]];
    return `${statusFilter.length} status selecionados`;
  }, [statusFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date));
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vendas</h1>
            <p className="text-muted-foreground">
              {isSeller ? 'Suas vendas cadastradas' : 'Todas as vendas do sistema'}
            </p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    const exportedBy = {
                      name: profile?.nome || 'Usuário',
                      team: userTeamName || undefined,
                    };
                    exportToExcel(filteredSales, sellers, `vendas-${new Date().toISOString().split('T')[0]}`, exportedBy);
                    toast.success('Arquivo Excel exportado!');
                  }}
                  className="gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Exportar Excel
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const exportedBy = {
                      name: profile?.nome || 'Usuário',
                      team: userTeamName || undefined,
                    };
                    exportToPDF(filteredSales, sellers, getPeriodLabel('all'), `vendas-${new Date().toISOString().split('T')[0]}`, exportedBy);
                    toast.success('Arquivo PDF exportado!');
                  }}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Exportar PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={isNewSaleOpen} onOpenChange={setIsNewSaleOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Venda
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Cadastrar Nova Venda</DialogTitle>
                  <DialogDescription>
                    Preencha todos os dados necessários para a contratação
                  </DialogDescription>
                </DialogHeader>
                {user && (
                  <SaleForm
                    userId={user.id}
                    onSuccess={handleSaleCreated}
                    onCancel={() => setIsNewSaleOpen(false)}
                  />
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Pending Sales Alert - Only for CEO and Backoffice */}
        {(isCEO || isBackoffice) && !loading && (
          <PendingSalesAlert sales={sales} />
        )}

        {/* Filters */}
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, CNPJ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                placeholder="Filtrar por data"
                className="w-full sm:w-auto"
              />
              <MultiSelectFilter
                options={(Object.entries(SALE_STATUS_LABELS) as [SaleStatus, string][]).map(([value, label]) => ({
                  value,
                  label,
                }))}
                selected={statusFilter}
                onChange={(selected) => setStatusFilter(selected as SaleStatus[])}
                placeholder="Filtrar status"
                title="Filtrar por Status"
                icon={<Filter className="h-4 w-4" />}
                className="w-full sm:w-auto"
              />
              {uniquePlanos.length > 0 && (
                <MultiSelectFilter
                  options={uniquePlanos.map(plano => ({
                    value: plano,
                    label: plano,
                  }))}
                  selected={planoFilter}
                  onChange={(selected) => setPlanoFilter(selected)}
                  placeholder="Filtrar plano"
                  title="Filtrar por Plano"
                  icon={<Package className="h-4 w-4" />}
                  className="w-full sm:w-auto"
                />
              )}
              {/* Team filter - only show for CEO/Coordinator/Supervisor */}
              {!isSeller && teamsList.length > 0 && (
                <MultiSelectFilter
                  options={teamsList.map(team => ({
                    value: team.id,
                    label: team.name,
                  }))}
                  selected={teamFilter}
                  onChange={(selected) => setTeamFilter(selected)}
                  placeholder="Filtrar equipe"
                  title="Filtrar por Equipe"
                  icon={<Users2 className="h-4 w-4" />}
                  className="w-full sm:w-auto"
                />
              )}
              {/* Seller filter - only show for non-sellers */}
              {!isSeller && sellerOptions.length > 0 && (
                <MultiSelectFilter
                  options={sellerOptions}
                  selected={sellerFilter}
                  onChange={(selected) => setSellerFilter(selected)}
                  placeholder="Filtrar vendedor"
                  title="Filtrar por Vendedor"
                  icon={<Users2 className="h-4 w-4" />}
                  className="w-full sm:w-auto"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Summary Card - CEO always, others when seller filter is active */}
        {(isCEO || (!isSeller && sellerFilter.length > 0)) && !loading && filteredSales.length > 0 && (
          <Card className="shadow-card border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {sellerFilter.length === 1 && sellers[sellerFilter[0]]
                        ? `Faturamento de ${sellers[sellerFilter[0]].nome}`
                        : `Faturamento: ${statusFilterLabel}`}
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(filteredSalesRevenue)}
                    </p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {filteredSales.length} {filteredSales.length === 1 ? 'venda' : 'vendas'} encontrada{filteredSales.length !== 1 && 's'}
                  </p>
                  {cancelledSalesCount > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-xs text-destructive/80 flex items-center gap-1 cursor-help justify-end">
                          {cancelledSalesCount} cancelada{cancelledSalesCount !== 1 && 's'} excluída{cancelledSalesCount !== 1 && 's'}
                          <Info className="h-3 w-3" />
                        </p>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[250px]">
                        <p>Vendas canceladas são excluídas do cálculo de faturamento para refletir apenas a receita ativa.</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cancelled Sales Analysis - CEO only */}
        {isCEO && !loading && (
          <CancelledSalesAnalysis 
            sales={filteredSales} 
            teams={teams} 
            sellers={sellers}
            exportedBy={{
              name: profile?.nome || 'Usuário',
              team: userTeamName || undefined,
            }}
          />
        )}

        {/* Sales Table */}
        <Card className="shadow-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : filteredSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">Nenhuma venda encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      {!isSeller && <TableHead>Vendedor</TableHead>}
                      {!isSeller && <TableHead>Equipe</TableHead>}
                      <TableHead>Produtos</TableHead>
                      <TableHead>Valor Mensal</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sale.razao_social}</p>
                            <p className="text-xs text-muted-foreground">{sale.cnpj_cliente}</p>
                          </div>
                        </TableCell>
                        {!isSeller && (
                          <TableCell>
                            {sale.seller_id && sellers[sale.seller_id]
                              ? sellers[sale.seller_id].nome
                              : '-'}
                          </TableCell>
                        )}
                        {!isSeller && (
                          <TableCell>
                            <span className="text-sm">{sale.equipe || '-'}</span>
                          </TableCell>
                        )}
                        <TableCell className="max-w-[250px]">
                          {sale.plano_contratado || sale.produtos ? (
                            <div className="flex flex-wrap gap-1.5">
                              {sale.plano_contratado && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary/15 text-primary border border-primary/20">
                                  {sale.plano_contratado}
                                </span>
                              )}
                              {sale.produtos && !sale.produtos.includes(sale.plano_contratado || '') && (
                                <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                                  {sale.produtos}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(Number(sale.valor_mensal))}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={sale.status} />
                        </TableCell>
                        <TableCell>{formatDate(sale.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSale(sale);
                              setIsDetailOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {!loading && filteredSales.length > 0 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredSales.length}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            )}
          </CardContent>
        </Card>

        {/* Sale Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={(open) => {
          setIsDetailOpen(open);
          if (!open) setIsEditMode(false);
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>{isEditMode ? 'Editar Venda' : 'Detalhes da Venda'}</DialogTitle>
                  <DialogDescription>
                    {isEditMode ? 'Edite os dados da venda e salve as alterações' : 'Informações completas da venda'}
                  </DialogDescription>
                </div>
                {/* Edit button - Show for seller when sale is in PENDENCIA or for CEO/Coordinator/Backoffice/Supervisor */}
                {selectedSale && !isEditMode && (
                  (isSeller && selectedSale.seller_id === user?.id && selectedSale.status === 'PENDENCIA') ||
                  isCEO || isCoordinator || isBackoffice || isSupervisor
                ) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setIsEditMode(true)}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar Dados
                  </Button>
                )}
              </div>
            </DialogHeader>
            {selectedSale && (
              <div className="space-y-6">
                {isEditMode ? (
                  <SaleEditForm
                    sale={selectedSale}
                    onSuccess={() => {
                      setIsEditMode(false);
                      fetchSales();
                      // Update selected sale with fresh data
                      setIsDetailOpen(false);
                    }}
                    onCancel={() => setIsEditMode(false)}
                  />
                ) : (
                  <>
                    {/* CEO: Change Seller Button */}
                    <div className="flex justify-end">
                      <ChangeSellerDialog
                        saleId={selectedSale.id}
                        currentSellerId={selectedSale.seller_id}
                        currentSellerName={selectedSale.seller_id ? sellers[selectedSale.seller_id]?.nome : undefined}
                        onSuccess={() => {
                          fetchSales();
                          setIsDetailOpen(false);
                        }}
                      />
                    </div>

                    {/* Complete Sale Details */}
                    <SaleDetails 
                      sale={selectedSale} 
                      seller={selectedSale.seller_id ? sellers[selectedSale.seller_id] : undefined}
                    />

                {/* Documents Section */}
                <div className="space-y-3">
                  <Label className="text-muted-foreground">Documentos Anexados</Label>
                  
                  {/* Existing documents */}
                  {selectedSale.documentos && selectedSale.documentos.length > 0 ? (
                    <div className="grid gap-2">
                      {selectedSale.documentos.map((docUrl, index) => {
                        const fileName = docUrl.split('/').pop() || `Documento ${index + 1}`;
                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
                        const isPdf = /\.pdf$/i.test(fileName);
                        
                        return (
                          <div
                            key={index}
                            className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {isImage ? (
                                <ImageIcon className="h-5 w-5 text-blue-500 shrink-0" />
                              ) : isPdf ? (
                                <FileText className="h-5 w-5 text-red-500 shrink-0" />
                              ) : (
                                <FileIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                              )}
                              <span className="text-sm truncate">{fileName}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-2 shrink-0"
                              onClick={() => {
                                const { data } = supabase.storage
                                  .from('sale-documents')
                                  .getPublicUrl(docUrl);
                                window.open(data.publicUrl, '_blank');
                              }}
                            >
                              <Download className="h-4 w-4" />
                              Baixar
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum documento anexado</p>
                  )}
                  
                  {/* New documents to upload */}
                  {newDocuments.length > 0 && (
                    <div className="space-y-2 border-t pt-3">
                      <Label className="text-sm text-muted-foreground">Novos documentos para enviar:</Label>
                      <div className="grid gap-2">
                        {newDocuments.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between rounded-lg border border-dashed border-primary/50 bg-primary/5 p-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {file.type.startsWith('image/') ? (
                                <ImageIcon className="h-5 w-5 text-blue-500 shrink-0" />
                              ) : (
                                <FileText className="h-5 w-5 text-red-500 shrink-0" />
                              )}
                              <span className="text-sm truncate">{file.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({(file.size / 1024 / 1024).toFixed(2)} MB)
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeNewDocument(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button
                        onClick={uploadNewDocuments}
                        disabled={isUploadingDocs}
                        className="w-full gap-2"
                      >
                        {isUploadingDocs ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Enviar {newDocuments.length} documento(s)
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {/* Add document button */}
                  <input
                    ref={docInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    className="hidden"
                    onChange={handleDocumentSelect}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => docInputRef.current?.click()}
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Documento
                  </Button>
                </div>

                {/* Actions: History and Print */}
                <div className="flex justify-end gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      const sellerName = selectedSale.seller_id ? sellers[selectedSale.seller_id]?.nome : undefined;
                      // Resolve team name from UUID or use existing name
                      const teamName = selectedSale.equipe 
                        ? (teams[selectedSale.equipe] || selectedSale.equipe) 
                        : undefined;
                      const exportedBy = {
                        name: profile?.nome || 'Usuário',
                        team: userTeamName || undefined,
                      };
                      exportSaleDetailsToPDF(
                        selectedSale, 
                        sellerName,
                        `venda-${selectedSale.cnpj_cliente.replace(/\D/g, '')}-${new Date().toISOString().split('T')[0]}`,
                        teamName,
                        exportedBy
                      );
                      toast.success('PDF gerado com sucesso!');
                    }}
                  >
                    <Printer className="h-4 w-4" />
                    Exportar PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => navigate(`/vendas/${selectedSale.id}/historico`)}
                  >
                    <History className="h-4 w-4" />
                    Ver Histórico
                  </Button>
                </div>

                {/* Chat/Comments Section */}
                <SaleComments saleId={selectedSale.id} />

                {/* Status Actions */}
                <SaleStatusActions
                  sale={selectedSale}
                  onStatusUpdated={fetchSales}
                  onClose={() => setIsDetailOpen(false)}
                />
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Sales;
