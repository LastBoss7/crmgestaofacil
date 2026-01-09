import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { StatusBadge } from '@/components/ui/status-badge';
import { supabase } from '@/integrations/supabase/client';
import { Sale, SaleStatus, SALE_STATUS_LABELS, Profile } from '@/types/database';
import { Plus, Search, Filter, Eye, History, Download, FileSpreadsheet, FileText, FileIcon, ImageIcon, Loader2, Upload, X } from 'lucide-react';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SaleComments } from '@/components/sales/SaleComments';
import { SaleStatusActions } from '@/components/sales/SaleStatusActions';
import { SaleForm } from '@/components/sales/SaleForm';
import { PendingSalesAlert } from '@/components/sales/PendingSalesAlert';
import { exportToExcel, exportToPDF, getPeriodLabel } from '@/lib/export-utils';
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
import { toast } from 'sonner';

interface SaleWithSeller extends Sale {
  seller?: Profile;
}

const Sales = () => {
  const navigate = useNavigate();
  const { user, profile, isSeller, isCEO, isBackoffice } = useAuth();
  const [sales, setSales] = useState<SaleWithSeller[]>([]);
  const [sellers, setSellers] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SaleStatus | 'ALL'>('ALL');
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleWithSeller | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [newDocuments, setNewDocuments] = useState<File[]>([]);
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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

    let query = supabase
      .from('sales')
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

  useEffect(() => {
    fetchSales();
  }, [user, profile?.company_id]);

  const handleSaleCreated = () => {
    setIsNewSaleOpen(false);
    fetchSales();
  };


  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const matchesSearch =
        sale.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.cnpj_cliente.includes(searchTerm) ||
        (sale.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      
      const matchesStatus = statusFilter === 'ALL' || sale.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [sales, searchTerm, statusFilter]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredSales.length / pageSize));
  const paginatedSales = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredSales.slice(startIndex, startIndex + pageSize);
  }, [filteredSales, currentPage, pageSize]);

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
                    exportToExcel(filteredSales, sellers, `vendas-${new Date().toISOString().split('T')[0]}`);
                    toast.success('Arquivo Excel exportado!');
                  }}
                  className="gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Exportar Excel
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    exportToPDF(filteredSales, sellers, getPeriodLabel('all'), `vendas-${new Date().toISOString().split('T')[0]}`);
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
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, CNPJ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as SaleStatus | 'ALL')}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filtrar status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os status</SelectItem>
                  {(Object.entries(SALE_STATUS_LABELS) as [SaleStatus, string][]).map(([status, label]) => (
                    <SelectItem key={status} value={status}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

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
                            <p className="font-medium">{sale.nome_fantasia || sale.razao_social}</p>
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
                        <TableCell className="max-w-[200px] truncate">
                          {sale.produtos || '-'}
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
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Venda</DialogTitle>
              <DialogDescription>
                {selectedSale?.nome_fantasia || selectedSale?.razao_social}
              </DialogDescription>
            </DialogHeader>
            {selectedSale && (
              <div className="space-y-6">
                {/* Sale Info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">CNPJ</Label>
                    <p className="font-medium">{selectedSale.cnpj_cliente}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Razão Social</Label>
                    <p className="font-medium">{selectedSale.razao_social}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Nome Fantasia</Label>
                    <p className="font-medium">{selectedSale.nome_fantasia || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Contato</Label>
                    <p className="font-medium">{selectedSale.contato_responsavel || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Telefone</Label>
                    <p className="font-medium">{selectedSale.telefone_responsavel || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Valor Mensal</Label>
                    <p className="font-medium text-lg">{formatCurrency(Number(selectedSale.valor_mensal))}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Produtos/Serviços</Label>
                  <p className="font-medium">{selectedSale.produtos || '-'}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Observações do Vendedor</Label>
                  <p className="font-medium">{selectedSale.observacoes_vendedor || '-'}</p>
                </div>

                {selectedSale.motivo_pendencia && (
                  <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
                    <Label className="text-orange-400">Motivo da Pendência</Label>
                    <p className="text-orange-300">{selectedSale.motivo_pendencia}</p>
                  </div>
                )}

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

                {/* History Link */}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => navigate(`/vendas/${selectedSale.id}/historico`)}
                  >
                    <History className="h-4 w-4" />
                    Ver Histórico de Alterações
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
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Sales;
