import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, DollarSign, ReceiptText, Search, UserRound, XCircle } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, Profile, Sale, Team } from '@/types/database';
import { toast } from 'sonner';

type SellerRow = Profile & { role?: AppRole; team?: Team };

const money = (value: number) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL',
}).format(value);

export default function Sellers() {
  const { isCEO, isCoordinator, isSupervisor, profile } = useAuth();
  const navigate = useNavigate();
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const canAccess = isCEO || isCoordinator || isSupervisor;

  useEffect(() => {
    if (!canAccess) {
      navigate('/dashboard');
      return;
    }
    if (!profile?.company_id) return;

    const load = async () => {
      const now = new Date();
      const from = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
      const to = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');
      const [profilesResult, rolesResult, teamsResult, salesResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('company_id', profile.company_id).order('nome'),
        supabase.from('user_roles').select('user_id, role').eq('role', 'SELLER'),
        supabase.from('teams').select('*').eq('company_id', profile.company_id),
        supabase.from('sales_secure').select('*').or(
          `and(data_venda.gte.${from},data_venda.lte.${to}),and(data_venda.is.null,created_at.gte.${from}T00:00:00,created_at.lte.${to}T23:59:59)`,
        ),
      ]);
      const error = profilesResult.error || rolesResult.error || teamsResult.error || salesResult.error;
      if (error) {
        toast.error('Erro ao carregar os vendedores');
        setLoading(false);
        return;
      }
      const sellerIds = new Set((rolesResult.data || []).map(item => item.user_id));
      const teams = (teamsResult.data || []) as Team[];
      setSellers(((profilesResult.data || []) as Profile[])
        .filter(item => sellerIds.has(item.id))
        .map(item => ({ ...item, role: 'SELLER', team: teams.find(team => team.id === item.team_id) })));
      setSales((salesResult.data || []) as Sale[]);
      setLoading(false);
    };
    load();
  }, [canAccess, isCEO, isCoordinator, isSupervisor, navigate, profile?.company_id]);

  const visibleSellers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return sellers.filter(seller => !term
      || seller.nome.toLocaleLowerCase('pt-BR').includes(term)
      || seller.email.toLocaleLowerCase('pt-BR').includes(term)
      || seller.team?.name.toLocaleLowerCase('pt-BR').includes(term));
  }, [search, sellers]);

  const metrics = (sellerId: string) => {
    const sellerSales = sales.filter(sale => sale.seller_id === sellerId);
    const valid = sellerSales.filter(sale => sale.status !== 'CANCELADA');
    return {
      count: valid.length,
      value: valid.reduce((sum, sale) => sum + Number(sale.valor_mensal || 0), 0),
      commission: valid.reduce((sum, sale) => sum + Number(sale.valor_mensal || 0) * Number(sale.commission_rate || 0) / 100, 0),
      cancelled: sellerSales.length - valid.length,
    };
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Vendedores</h1>
            <p className="text-muted-foreground">Resultados individuais do mês atual</p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar vendedor ou equipe" className="pl-9" />
          </div>
        </div>

        {loading ? (
          <div className="flex h-56 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>
        ) : visibleSellers.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">Nenhum vendedor encontrado.</div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {visibleSellers.map(seller => {
              const result = metrics(seller.id);
              const initials = seller.nome.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
              return (
                <Card key={seller.id}>
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar><AvatarImage src={seller.avatar_url || undefined} /><AvatarFallback>{initials}</AvatarFallback></Avatar>
                        <div className="min-w-0">
                          <CardTitle className="truncate text-base">{seller.nome}</CardTitle>
                          <p className="truncate text-sm text-muted-foreground">{seller.team?.name || 'Sem equipe'}</p>
                        </div>
                      </div>
                      <Badge variant={seller.active ? 'default' : 'secondary'}>{seller.active ? 'Ativo' : 'Inativo'}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Metric icon={ReceiptText} label="Vendas" value={String(result.count)} />
                      <Metric icon={DollarSign} label="Valor mensal" value={money(result.value)} />
                      <Metric icon={UserRound} label="Comissão estimada" value={money(result.commission)} />
                      <Metric icon={XCircle} label="Canceladas" value={String(result.cancelled)} />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button variant="outline" onClick={() => navigate(`/vendedor/${seller.id}`)}>Ver detalhes</Button>
                      <Button onClick={() => navigate(`/relatorios?seller=${seller.id}&period=month`)}>
                        Ver relatório <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof ReceiptText; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</div>
      <p className="truncate text-sm font-semibold" title={value}>{value}</p>
    </div>
  );
}