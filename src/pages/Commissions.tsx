import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Banknote, CalendarDays, CheckCircle2, CircleDollarSign, Search, Undo2, WalletCards } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, Profile, Sale, Team } from '@/types/database';
import { toast } from 'sonner';

interface CommissionPayment {
  id: string;
  sale_id: string;
  seller_id: string;
  company_id: string;
  amount: number;
  paid_at: string;
  paid_by: string;
  note: string | null;
  created_at: string;
}

type SellerRow = Profile & { team?: Team };

interface SellerSummary {
  seller: SellerRow;
  sales: Sale[];
  generated: number;
  paid: number;
  pending: number;
}

const money = (value: number) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL',
}).format(value);

const saleCommission = (sale: Sale) => sale.status === 'CANCELADA'
  ? 0
  : Number(sale.valor_mensal || 0) * Number(sale.commission_rate || 0) / 100;

const saleDate = (sale: Sale) => sale.data_venda || sale.created_at.slice(0, 10);

const currentMonth = () => format(new Date(), 'yyyy-MM');

export default function Commissions() {
  const { user, profile, role, loading: authLoading, isCEO, isCoordinator, isSupervisor } = useAuth();
  const navigate = useNavigate();
  const [month, setMonth] = useState(currentMonth);
  const [search, setSearch] = useState('');
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<CommissionPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [paymentSale, setPaymentSale] = useState<Sale | null>(null);
  const [paymentNote, setPaymentNote] = useState('');
  const [saving, setSaving] = useState(false);
  const canAccess = isCEO || isCoordinator || isSupervisor;

  const load = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const [year, monthNumber] = month.split('-').map(Number);
    const from = `${month}-01`;
    const to = format(new Date(year, monthNumber, 0), 'yyyy-MM-dd');

    const [profilesResult, rolesResult, teamsResult, salesResult, paymentsResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('company_id', profile.company_id).order('nome'),
      supabase.from('user_roles').select('user_id, role').eq('role', 'SELLER'),
      supabase.from('teams').select('*').eq('company_id', profile.company_id),
      supabase.from('sales_secure').select('*').or(
        `and(data_venda.gte.${from},data_venda.lte.${to}),and(data_venda.is.null,created_at.gte.${from}T00:00:00,created_at.lte.${to}T23:59:59)`,
      ),
      (supabase as any).from('commission_payments').select('*').eq('company_id', profile.company_id),
    ]);

    const error = profilesResult.error || rolesResult.error || teamsResult.error || salesResult.error || paymentsResult.error;
    if (error) {
      console.error('Error loading commissions:', error);
      toast.error('Não foi possível carregar as comissões');
      setLoading(false);
      return;
    }

    const sellerIds = new Set((rolesResult.data || []).map(item => item.user_id));
    const teams = (teamsResult.data || []) as Team[];
    setSellers(((profilesResult.data || []) as Profile[])
      .filter(item => sellerIds.has(item.id))
      .map(item => ({ ...item, team: teams.find(team => team.id === item.team_id) })));
    setSales((salesResult.data || []) as Sale[]);
    setPayments((paymentsResult.data || []) as CommissionPayment[]);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading || role === null) return;
    if (!canAccess) {
      navigate('/dashboard');
      return;
    }
    load();
  }, [authLoading, canAccess, month, navigate, profile?.company_id, role]);

  const paymentBySale = useMemo(() => new Map(payments.map(payment => [payment.sale_id, payment])), [payments]);

  const summaries = useMemo<SellerSummary[]>(() => sellers.map(seller => {
    const sellerSales = sales.filter(sale => sale.seller_id === seller.id);
    const validSales = sellerSales.filter(sale => sale.status !== 'CANCELADA');
    const generated = validSales.reduce((total, sale) => total + saleCommission(sale), 0);
    const paid = validSales.reduce((total, sale) => total + Number(paymentBySale.get(sale.id)?.amount || 0), 0);
    return { seller, sales: sellerSales, generated, paid, pending: Math.max(0, generated - paid) };
  }), [paymentBySale, sales, sellers]);

  const visibleSummaries = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return summaries.filter(({ seller }) => !term
      || seller.nome.toLocaleLowerCase('pt-BR').includes(term)
      || seller.email.toLocaleLowerCase('pt-BR').includes(term)
      || seller.team?.name.toLocaleLowerCase('pt-BR').includes(term));
  }, [search, summaries]);

  const totals = useMemo(() => summaries.reduce((result, summary) => ({
    generated: result.generated + summary.generated,
    paid: result.paid + summary.paid,
    pending: result.pending + summary.pending,
  }), { generated: 0, paid: 0, pending: 0 }), [summaries]);

  const selectedSummary = summaries.find(summary => summary.seller.id === selectedSellerId) || null;

  const registerPayment = async () => {
    if (!isCEO || !user?.id || !profile?.company_id || !paymentSale) return;
    setSaving(true);
    const amount = Number(saleCommission(paymentSale).toFixed(2));
    const { error } = await (supabase as any).from('commission_payments').insert({
      sale_id: paymentSale.id,
      seller_id: paymentSale.seller_id,
      company_id: profile.company_id,
      amount,
      paid_by: user.id,
      note: paymentNote.trim() || null,
    });
    setSaving(false);

    if (error) {
      console.error('Error registering commission payment:', error);
      toast.error(error.message || 'Não foi possível registrar o pagamento');
      return;
    }

    toast.success('Comissão marcada como paga');
    setPaymentSale(null);
    setPaymentNote('');
    await load();
  };

  const undoPayment = async (payment: CommissionPayment) => {
    if (!isCEO) return;
    setSaving(true);
    const { error } = await (supabase as any).from('commission_payments').delete().eq('id', payment.id);
    setSaving(false);
    if (error) {
      console.error('Error undoing commission payment:', error);
      toast.error('Não foi possível desfazer o pagamento');
      return;
    }
    toast.success('Pagamento desfeito');
    await load();
  };

  if (authLoading || role === null || !canAccess) return null;

  return (
    <Layout>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Comissões</h1>
            <p className="text-muted-foreground">Acompanhe valores gerados, pagos e pendentes por vendedor.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="month" value={month} onChange={event => setMonth(event.target.value)} className="pl-9 sm:w-44" aria-label="Mês das comissões" />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar vendedor ou equipe" className="pl-9 sm:w-72" />
            </div>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard icon={CircleDollarSign} label="Comissão gerada" value={money(totals.generated)} />
          <SummaryCard icon={BadgeCheck} label="Já pago" value={money(totals.paid)} tone="success" />
          <SummaryCard icon={WalletCards} label="Pendente" value={money(totals.pending)} tone="warning" />
        </div>

        {loading ? (
          <div className="flex h-56 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>
        ) : visibleSummaries.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">Nenhum vendedor encontrado neste período.</div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {visibleSummaries.map(summary => {
              const initials = summary.seller.nome.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
              return (
                <Card key={summary.seller.id}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <Avatar><AvatarImage src={summary.seller.avatar_url || undefined} /><AvatarFallback>{initials}</AvatarFallback></Avatar>
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">{summary.seller.nome}</CardTitle>
                        <p className="truncate text-sm text-muted-foreground">{summary.seller.team?.name || 'Sem equipe'}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      <Metric label="Gerada" value={money(summary.generated)} />
                      <Metric label="Pago" value={money(summary.paid)} />
                      <Metric label="Pendente" value={money(summary.pending)} />
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => setSelectedSellerId(summary.seller.id)}>
                      Ver {summary.sales.length} {summary.sales.length === 1 ? 'venda' : 'vendas'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={Boolean(selectedSummary)} onOpenChange={open => !open && setSelectedSellerId(null)}>
        <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSummary?.seller.nome}</DialogTitle>
            <DialogDescription>Comissões das vendas de {format(new Date(`${month}-02T12:00:00`), 'MM/yyyy')}.</DialogDescription>
          </DialogHeader>
          {selectedSummary && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <Metric label="Gerada" value={money(selectedSummary.generated)} />
                <Metric label="Pago" value={money(selectedSummary.paid)} />
                <Metric label="Pendente" value={money(selectedSummary.pending)} />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Venda</TableHead><TableHead>Data</TableHead><TableHead>Taxa</TableHead><TableHead>Comissão</TableHead><TableHead>Situação</TableHead><TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedSummary.sales.map(sale => {
                    const payment = paymentBySale.get(sale.id);
                    const cancelled = sale.status === 'CANCELADA';
                    const commission = saleCommission(sale);
                    return (
                      <TableRow key={sale.id}>
                        <TableCell><p className="max-w-52 truncate font-medium">{sale.razao_social}</p><p className="text-xs text-muted-foreground">{money(Number(sale.valor_mensal || 0))}</p></TableCell>
                        <TableCell>{format(new Date(`${saleDate(sale)}T12:00:00`), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{Number(sale.commission_rate || 0).toLocaleString('pt-BR')}%</TableCell>
                        <TableCell className="font-semibold">{money(commission)}</TableCell>
                        <TableCell>{cancelled ? <Badge variant="destructive">Cancelada</Badge> : payment ? <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Paga</Badge> : <Badge variant="secondary">Pendente</Badge>}</TableCell>
                        <TableCell className="text-right">
                          {isCEO && !cancelled && commission > 0 && (payment ? (
                            <Button size="sm" variant="ghost" disabled={saving} onClick={() => undoPayment(payment)}><Undo2 className="mr-2 h-4 w-4" />Desfazer</Button>
                          ) : (
                            <Button size="sm" disabled={saving} onClick={() => setPaymentSale(sale)}><Banknote className="mr-2 h-4 w-4" />Marcar paga</Button>
                          ))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(paymentSale)} onOpenChange={open => { if (!open) { setPaymentSale(null); setPaymentNote(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar pagamento</DialogTitle>
            <DialogDescription>Esta venda será registrada como paga no valor de {money(paymentSale ? saleCommission(paymentSale) : 0)}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="payment-note">Observação (opcional)</Label>
            <Textarea id="payment-note" value={paymentNote} onChange={event => setPaymentNote(event.target.value)} placeholder="Ex.: pagamento realizado via folha" maxLength={500} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentSale(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={registerPayment} disabled={saving}>{saving ? 'Registrando...' : 'Confirmar pagamento'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: typeof CircleDollarSign; label: string; value: string; tone?: 'success' | 'warning' }) {
  return <Card><CardContent className="flex items-center gap-4 p-5"><div className={`flex h-10 w-10 items-center justify-center rounded-md ${tone === 'success' ? 'bg-status-instalada/10 text-status-instalada' : tone === 'warning' ? 'bg-status-analise/10 text-status-analise' : 'bg-primary/10 text-primary'}`}><Icon className="h-5 w-5" /></div><div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className="truncate text-xl font-bold" title={value}>{value}</p></div></CardContent></Card>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-md border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="truncate text-sm font-semibold" title={value}>{value}</p></div>;
}