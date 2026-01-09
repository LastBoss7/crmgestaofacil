import { useState, useEffect } from 'react';
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
import { MessageSquarePlus, Search, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FeedbackFilters {
  search: string;
  sellerId: string;
  readStatus: 'all' | 'read' | 'unread';
  startDate: Date | undefined;
  endDate: Date | undefined;
}

export default function Feedbacks() {
  const navigate = useNavigate();
  const { user, isSeller, isBackoffice, isCEO } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sellers, setSellers] = useState<Profile[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
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

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

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
  }, [user, isBackoffice, isCEO, navigate]);

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
          
          {(isBackoffice || isCEO) && (
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <MessageSquarePlus className="h-4 w-4" />
              Novo Feedback
            </Button>
          )}
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
            onFeedbackSent={() => setRefreshTrigger(prev => prev + 1)}
          />
        )}
      </div>
    </Layout>
  );
}
