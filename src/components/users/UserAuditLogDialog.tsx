import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Search, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface AuditEntry {
  id: string;
  action: 'DELETE' | 'DEACTIVATE' | 'REACTIVATE';
  actor_name: string | null;
  actor_role: string | null;
  target_user_name: string | null;
  target_user_email: string | null;
  target_user_role: string | null;
  sales_count: number;
  documents_count: number;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACTION_LABEL: Record<AuditEntry['action'], string> = {
  DELETE: 'Excluído',
  DEACTIVATE: 'Desativado',
  REACTIVATE: 'Reativado',
};

const ACTION_VARIANT: Record<AuditEntry['action'], 'destructive' | 'secondary' | 'default'> = {
  DELETE: 'destructive',
  DEACTIVATE: 'secondary',
  REACTIVATE: 'default',
};

export function UserAuditLogDialog({ open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const fetchEntries = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('user_admin_audit_log')
        .select(
          'id, action, actor_name, actor_role, target_user_name, target_user_email, target_user_role, sales_count, documents_count, created_at'
        )
        .order('created_at', { ascending: false })
        .limit(500);

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }
      if (fromDate) {
        query = query.gte('created_at', `${fromDate}T00:00:00`);
      }
      if (toDate) {
        query = query.lte('created_at', `${toDate}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEntries((data ?? []) as AuditEntry[]);
    } catch (err: any) {
      console.error('Audit log error:', err);
      toast.error('Erro ao carregar log de auditoria');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, actionFilter, fromDate, toDate]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter(
      (e) =>
        e.target_user_name?.toLowerCase().includes(term) ||
        e.target_user_email?.toLowerCase().includes(term) ||
        e.actor_name?.toLowerCase().includes(term)
    );
  }, [entries, search]);

  const resetFilters = () => {
    setSearch('');
    setActionFilter('all');
    setFromDate('');
    setToDate('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Log de Auditoria de Usuários</DialogTitle>
          <DialogDescription>
            Histórico de exclusões, desativações e reativações de usuários.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label htmlFor="audit-search">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="audit-search"
                placeholder="Nome ou e-mail do usuário alvo / autor"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="audit-action">Ação</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger id="audit-action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="DELETE">Excluir</SelectItem>
                <SelectItem value="DEACTIVATE">Desativar</SelectItem>
                <SelectItem value="REACTIVATE">Reativar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="audit-from">De</Label>
              <Input
                id="audit-from"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="audit-to">Até</Label>
              <Input
                id="audit-to"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {loading ? 'Carregando...' : `${filtered.length} registro(s)`}
          </p>
          <Button variant="outline" size="sm" onClick={resetFilters} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Limpar filtros
          </Button>
        </div>

        <div className="flex-1 overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Usuário alvo</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">Documentos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin inline" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(e.created_at).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ACTION_VARIANT[e.action]}>{ACTION_LABEL[e.action]}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{e.target_user_name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">
                        {e.target_user_email ?? ''}
                        {e.target_user_role ? ` · ${e.target_user_role}` : ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{e.actor_name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{e.actor_role ?? ''}</div>
                    </TableCell>
                    <TableCell className="text-right">{e.sales_count}</TableCell>
                    <TableCell className="text-right">{e.documents_count}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
