import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Sale, SALE_STATUS_LABELS, SaleStatus } from '@/types/database';
import { ArrowLeft, History, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';

interface SaleHistoryEntry {
  id: string;
  sale_id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  changed_by_name: string;
  changed_at: string;
}

const FIELD_LABELS: Record<string, string> = {
  status: 'Status',
  valor_mensal: 'Valor Mensal',
  razao_social: 'Razão Social',
  nome_fantasia: 'Nome Fantasia',
  cnpj_cliente: 'CNPJ',
  contato_responsavel: 'Contato Responsável',
  telefone_responsavel: 'Telefone',
  produtos: 'Produtos',
  observacoes_vendedor: 'Observações do Vendedor',
  motivo_pendencia: 'Motivo da Pendência',
};

const SaleHistory = () => {
  const { saleId } = useParams<{ saleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sale, setSale] = useState<Sale | null>(null);
  const [history, setHistory] = useState<SaleHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !saleId) return;

      // Fetch sale details using secure view
      const { data: saleData, error: saleError } = await supabase
        .from('sales_secure')
        .select('*')
        .eq('id', saleId)
        .single();

      if (saleError) {
        console.error('Error fetching sale:', saleError);
        navigate('/vendas');
        return;
      }

      setSale(saleData as Sale);

      // Fetch history
      const { data: historyData, error: historyError } = await supabase
        .from('sale_history')
        .select('*')
        .eq('sale_id', saleId)
        .order('changed_at', { ascending: false });

      if (historyError) {
        console.error('Error fetching history:', historyError);
      } else {
        setHistory(historyData as SaleHistoryEntry[]);
      }

      setLoading(false);
    };

    fetchData();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('sale-history-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sale_history',
          filter: `sale_id=eq.${saleId}`,
        },
        (payload) => {
          setHistory((prev) => [payload.new as SaleHistoryEntry, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, saleId, navigate]);

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const formatValue = (field: string, value: string | null) => {
    if (!value) return '-';
    
    if (field === 'status') {
      return SALE_STATUS_LABELS[value as SaleStatus] || value;
    }
    
    if (field === 'valor_mensal') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(parseFloat(value));
    }
    
    return value;
  };

  const renderValueChange = (entry: SaleHistoryEntry) => {
    if (entry.field_changed === 'status') {
      return (
        <div className="flex items-center gap-2 flex-wrap">
          {entry.old_value && (
            <>
              <StatusBadge status={entry.old_value as SaleStatus} />
              <span className="text-muted-foreground">→</span>
            </>
          )}
          <StatusBadge status={entry.new_value as SaleStatus} />
        </div>
      );
    }

    return (
      <div className="text-sm">
        {entry.old_value && (
          <p className="text-muted-foreground line-through">
            {formatValue(entry.field_changed, entry.old_value)}
          </p>
        )}
        <p className="font-medium">
          {formatValue(entry.field_changed, entry.new_value)}
        </p>
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate('/vendas')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <History className="h-8 w-8" />
                Histórico de Alterações
              </h1>
              {sale && (
                <p className="text-muted-foreground">
                  {sale.nome_fantasia || sale.razao_social}
                </p>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : history.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Nenhuma alteração registrada</p>
              <p className="text-muted-foreground">
                As alterações futuras nesta venda serão exibidas aqui
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Linha do Tempo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                <div className="space-y-6">
                  {history.map((entry, index) => (
                    <div key={entry.id} className="relative pl-10">
                      {/* Timeline dot */}
                      <div className="absolute left-2.5 top-1.5 h-3 w-3 rounded-full bg-primary border-2 border-background" />

                      <div className="rounded-lg border bg-card p-4 shadow-sm">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {FIELD_LABELS[entry.field_changed] || entry.field_changed}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              por {entry.changed_by_name}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(entry.changed_at)}
                          </span>
                        </div>
                        <div className="mt-3">
                          {renderValueChange(entry)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default SaleHistory;
