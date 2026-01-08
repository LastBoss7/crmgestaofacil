import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { StatusBadge } from '@/components/ui/status-badge';
import { supabase } from '@/integrations/supabase/client';
import { Sale, SaleStatus, SALE_STATUS_LABELS, Profile } from '@/types/database';
import { Plus, Search, Filter, Eye, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SaleComments } from '@/components/sales/SaleComments';
import { SaleStatusActions } from '@/components/sales/SaleStatusActions';
import { SaleForm } from '@/components/sales/SaleForm';
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
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface SaleWithSeller extends Sale {
  seller?: Profile;
}

const Sales = () => {
  const navigate = useNavigate();
  const { user, isSeller } = useAuth();
  const [sales, setSales] = useState<SaleWithSeller[]>([]);
  const [sellers, setSellers] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SaleStatus | 'ALL'>('ALL');
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleWithSeller | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchSales = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });

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
  }, [user]);

  const handleSaleCreated = () => {
    setIsNewSaleOpen(false);
    fetchSales();
  };


  const filteredSales = sales.filter((sale) => {
    const matchesSearch =
      sale.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.cnpj_cliente.includes(searchTerm) ||
      (sale.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesStatus = statusFilter === 'ALL' || sale.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
                    {filteredSales.map((sale) => (
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
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                    <Label className="text-orange-700">Motivo da Pendência</Label>
                    <p className="text-orange-800">{selectedSale.motivo_pendencia}</p>
                  </div>
                )}

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
