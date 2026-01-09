import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FeedbackDialog } from '@/components/feedback/FeedbackDialog';
import { FeedbackList } from '@/components/feedback/FeedbackList';
import { MessageSquarePlus, Search, X, FileSpreadsheet, FileText } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportFeedbacksToExcel, exportFeedbacksToPDF, ExportFeedback } from '@/lib/export-utils';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download } from 'lucide-react';

export interface FeedbackFilters {
  search: string;
  sellerId: string;
  readStatus: 'all' | 'read' | 'unread';
  startDate: Date | undefined;
  endDate: Date | undefined;
}

interface Feedback {
  id: string;
  seller_id: string;
  created_by: string;
  created_by_name: string;
  title: string;
  message: string;
  read_at: string | null;
  read_notified_at: string | null;
  created_at: string;
  seller_name?: string;
}

export default function Feedbacks() {
  const navigate = useNavigate();
  const { user, isSeller, isBackoffice, isCEO } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sellers, setSellers] = useState<Profile[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [allFeedbacks, setAllFeedbacks] = useState<Feedback[]>([]);
  const [filters, setFilters] = useState<FeedbackFilters>({
    search: '',
    sellerId: 'all',
    readStatus: 'all',
    startDate: undefined,
    endDate: undefined,
  });

  const hasActiveFilters = 
    filters.search !== '' || 
    filters.sellerId !== 'all' || 
    filters.readStatus !== 'all' || 
    filters.startDate !== undefined || 
    filters.endDate !== undefined;

  // Fetch all feedbacks for export
  const fetchFeedbacksForExport = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('feedbacks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching feedbacks:', error);
      return;
    }

    if ((isBackoffice || isCEO) && data) {
      const sellerIds = [...new Set(data.map(f => f.seller_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nome')
        .in('id', sellerIds);

      const profileMap = profiles?.reduce((acc, p) => ({ ...acc, [p.id]: p.nome }), {}) || {};
      
      setAllFeedbacks(data.map(f => ({
        ...f,
        seller_name: profileMap[f.seller_id] || 'Vendedor',
      })));
    } else {
      setAllFeedbacks(data || []);
    }
  }, [user, isBackoffice, isCEO]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchFeedbacksForExport();

    // Fetch sellers for backoffice/CEO
    if (isBackoffice || isCEO) {
      const fetchSellers = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('active', true);

        // Filter to only show sellers (users with SELLER role)
        if (data) {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'SELLER');

          const sellerIds = roles?.map(r => r.user_id) || [];
          setSellers(data.filter(p => sellerIds.includes(p.id)));
        }
      };
      fetchSellers();
    }
  }, [user, isBackoffice, isCEO, navigate, fetchFeedbacksForExport]);

  // Get filtered feedbacks
  const getFilteredFeedbacks = useCallback((): ExportFeedback[] => {
    return allFeedbacks
      .filter((feedback) => {
        // Search filter
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          const matchesTitle = feedback.title.toLowerCase().includes(searchLower);
          const matchesMessage = feedback.message.toLowerCase().includes(searchLower);
          if (!matchesTitle && !matchesMessage) return false;
        }

        // Seller filter
        if (filters.sellerId && filters.sellerId !== 'all') {
          if (feedback.seller_id !== filters.sellerId) return false;
        }

        // Read status filter
        if (filters.readStatus !== 'all') {
          if (filters.readStatus === 'read' && !feedback.read_at) return false;
          if (filters.readStatus === 'unread' && feedback.read_at) return false;
        }

        // Date filters
        const feedbackDate = new Date(feedback.created_at);
        
        if (filters.startDate) {
          if (isBefore(feedbackDate, startOfDay(filters.startDate))) return false;
        }

        if (filters.endDate) {
          if (isAfter(feedbackDate, endOfDay(filters.endDate))) return false;
        }

        return true;
      })
      .map(f => ({
        id: f.id,
        title: f.title,
        message: f.message,
        created_by_name: f.created_by_name,
        seller_name: f.seller_name,
        created_at: f.created_at,
        read_at: f.read_at,
      }));
  }, [allFeedbacks, filters]);

  const getFilterDescription = (): string => {
    const parts: string[] = [];
    
    if (filters.search) parts.push(`Busca: "${filters.search}"`);
    if (filters.sellerId !== 'all') {
      const seller = sellers.find(s => s.id === filters.sellerId);
      parts.push(`Vendedor: ${seller?.nome || filters.sellerId}`);
    }
    if (filters.readStatus !== 'all') {
      parts.push(`Status: ${filters.readStatus === 'read' ? 'Lidos' : 'Não lidos'}`);
    }
    if (filters.startDate) parts.push(`De: ${format(filters.startDate, 'dd/MM/yyyy')}`);
    if (filters.endDate) parts.push(`Até: ${format(filters.endDate, 'dd/MM/yyyy')}`);
    
    return parts.length > 0 ? parts.join(' | ') : 'Todos os feedbacks';
  };

  const handleExportExcel = () => {
    const feedbacks = getFilteredFeedbacks();
    if (feedbacks.length === 0) {
      toast.error('Nenhum feedback para exportar');
      return;
    }
    exportFeedbacksToExcel(feedbacks, `feedbacks-${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success('Exportado para Excel com sucesso!');
  };

  const handleExportPDF = () => {
    const feedbacks = getFilteredFeedbacks();
    if (feedbacks.length === 0) {
      toast.error('Nenhum feedback para exportar');
      return;
    }
    exportFeedbacksToPDF(feedbacks, getFilterDescription(), `feedbacks-${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success('Exportado para PDF com sucesso!');
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      sellerId: 'all',
      readStatus: 'all',
      startDate: undefined,
      endDate: undefined,
    });
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Feedbacks</h1>
            <p className="text-muted-foreground">
              {isSeller 
                ? 'Visualize os feedbacks recebidos' 
                : 'Envie e acompanhe feedbacks para vendedores'
              }
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4" />
                  Exportar para Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  Exportar para PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {(isBackoffice || isCEO) && (
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <MessageSquarePlus className="h-4 w-4" />
                Novo Feedback
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou mensagem..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-9"
            />
          </div>

          {/* Seller Filter - only for backoffice/CEO */}
          {(isBackoffice || isCEO) && sellers.length > 0 && (
            <Select
              value={filters.sellerId}
              onValueChange={(value) => setFilters(prev => ({ ...prev, sellerId: value }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos vendedores</SelectItem>
                {sellers.map((seller) => (
                  <SelectItem key={seller.id} value={seller.id}>
                    {seller.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Read Status Filter */}
          <Select
            value={filters.readStatus}
            onValueChange={(value: 'all' | 'read' | 'unread') => setFilters(prev => ({ ...prev, readStatus: value }))}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="read">Lidos</SelectItem>
              <SelectItem value="unread">Não lidos</SelectItem>
            </SelectContent>
          </Select>

          {/* Start Date Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal",
                  !filters.startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.startDate ? format(filters.startDate, "dd/MM/yyyy") : "Data início"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.startDate}
                onSelect={(date) => setFilters(prev => ({ ...prev, startDate: date }))}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* End Date Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal",
                  !filters.endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.endDate ? format(filters.endDate, "dd/MM/yyyy") : "Data fim"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.endDate}
                onSelect={(date) => setFilters(prev => ({ ...prev, endDate: date }))}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
              <X className="h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>

        {/* Feedback List */}
        <FeedbackList refreshTrigger={refreshTrigger} filters={filters} />

        {/* Dialog */}
        {(isBackoffice || isCEO) && (
          <FeedbackDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            sellers={sellers}
            onFeedbackSent={() => {
              setRefreshTrigger(prev => prev + 1);
              fetchFeedbacksForExport();
            }}
          />
        )}
      </div>
    </Layout>
  );
}
