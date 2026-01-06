import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { StatusBadge } from '@/components/ui/status-badge';
import { supabase } from '@/integrations/supabase/client';
import { Sale, SaleStatus, SALE_STATUS_LABELS, Profile } from '@/types/database';
import { Plus, Search, Filter, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SaleComments } from '@/components/sales/SaleComments';
import { SaleStatusActions } from '@/components/sales/SaleStatusActions';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { z } from 'zod';

const saleSchema = z.object({
  cnpj_cliente: z.string().trim().min(14, 'CNPJ inválido').max(18, 'CNPJ inválido'),
  razao_social: z.string().trim().min(2, 'Razão social obrigatória').max(255, 'Razão social muito longa'),
  nome_fantasia: z.string().trim().max(255, 'Nome fantasia muito longo').optional(),
  contato_responsavel: z.string().trim().max(255, 'Nome muito longo').optional(),
  telefone_responsavel: z.string().trim().max(20, 'Telefone muito longo').optional(),
  produtos: z.string().trim().max(1000, 'Descrição muito longa').optional(),
  valor_mensal: z.number().min(0, 'Valor deve ser positivo'),
  observacoes_vendedor: z.string().trim().max(2000, 'Observação muito longa').optional(),
});

interface SaleWithSeller extends Sale {
  seller?: Profile;
}

const Sales = () => {
  const { user, isSeller } = useAuth();
  const [sales, setSales] = useState<SaleWithSeller[]>([]);
  const [sellers, setSellers] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SaleStatus | 'ALL'>('ALL');
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleWithSeller | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Form state for new sale
  const [newSale, setNewSale] = useState({
    cnpj_cliente: '',
    razao_social: '',
    nome_fantasia: '',
    contato_responsavel: '',
    telefone_responsavel: '',
    produtos: '',
    valor_mensal: '',
    observacoes_vendedor: '',
  });

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

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const saleData = {
      ...newSale,
      valor_mensal: parseFloat(newSale.valor_mensal) || 0,
    };

    const result = saleSchema.safeParse(saleData);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    const { error } = await supabase.from('sales').insert({
      seller_id: user?.id,
      cnpj_cliente: newSale.cnpj_cliente,
      razao_social: newSale.razao_social,
      nome_fantasia: newSale.nome_fantasia || null,
      contato_responsavel: newSale.contato_responsavel || null,
      telefone_responsavel: newSale.telefone_responsavel || null,
      produtos: newSale.produtos || null,
      valor_mensal: parseFloat(newSale.valor_mensal) || 0,
      observacoes_vendedor: newSale.observacoes_vendedor || null,
      status: 'NOVA',
    });

    if (error) {
      toast.error('Erro ao criar venda');
      console.error(error);
    } else {
      toast.success('Venda cadastrada com sucesso!');
      setIsNewSaleOpen(false);
      setNewSale({
        cnpj_cliente: '',
        razao_social: '',
        nome_fantasia: '',
        contato_responsavel: '',
        telefone_responsavel: '',
        produtos: '',
        valor_mensal: '',
        observacoes_vendedor: '',
      });
      fetchSales();
    }
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar Nova Venda</DialogTitle>
                <DialogDescription>
                  Preencha os dados do cliente e da venda
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSale} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ *</Label>
                    <Input
                      id="cnpj"
                      placeholder="00.000.000/0000-00"
                      value={newSale.cnpj_cliente}
                      onChange={(e) => setNewSale({ ...newSale, cnpj_cliente: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="razao">Razão Social *</Label>
                    <Input
                      id="razao"
                      placeholder="Nome da empresa"
                      value={newSale.razao_social}
                      onChange={(e) => setNewSale({ ...newSale, razao_social: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fantasia">Nome Fantasia</Label>
                    <Input
                      id="fantasia"
                      placeholder="Nome fantasia"
                      value={newSale.nome_fantasia}
                      onChange={(e) => setNewSale({ ...newSale, nome_fantasia: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contato">Contato Responsável</Label>
                    <Input
                      id="contato"
                      placeholder="Nome do responsável"
                      value={newSale.contato_responsavel}
                      onChange={(e) => setNewSale({ ...newSale, contato_responsavel: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      placeholder="(00) 00000-0000"
                      value={newSale.telefone_responsavel}
                      onChange={(e) => setNewSale({ ...newSale, telefone_responsavel: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valor">Valor Mensal *</Label>
                    <Input
                      id="valor"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newSale.valor_mensal}
                      onChange={(e) => setNewSale({ ...newSale, valor_mensal: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="produtos">Produtos/Serviços</Label>
                  <Textarea
                    id="produtos"
                    placeholder="Ex: Vivo Fibra 300MB + 2 Linhas Móveis"
                    value={newSale.produtos}
                    onChange={(e) => setNewSale({ ...newSale, produtos: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="obs">Observações</Label>
                  <Textarea
                    id="obs"
                    placeholder="Observações adicionais..."
                    value={newSale.observacoes_vendedor}
                    onChange={(e) => setNewSale({ ...newSale, observacoes_vendedor: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsNewSaleOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Cadastrar Venda</Button>
                </div>
              </form>
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
