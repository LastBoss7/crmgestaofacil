import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Trophy, Medal, TrendingUp, Users, Target, Award, Crown, Flame } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Campaign {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  target_value: number;
  target_sales: number;
  status: string;
}

interface SellerRanking {
  sellerId: string;
  nome: string;
  avatar_url: string | null;
  salesCount: number;
  totalValue: number;
  campaigns: number;
}

export default function CampaignRankings() {
  const { profile } = useAuth();
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns', profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Campaign[];
    },
    enabled: !!profile?.company_id,
  });

  const { data: salesData = [] } = useQuery({
    queryKey: ['all-campaign-sales', profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('id, valor_mensal, campaign_id, status, seller_id, created_at')
        .not('campaign_id', 'is', null)
        .in('status', ['VENDA_AUDITADA', 'INSTALACAO_MARCADA', 'INSTALADA']);

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles', profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, avatar_url');

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  // Calculate global ranking across all campaigns
  const globalRanking = useMemo(() => {
    const sellerStats: Record<string, { salesCount: number; totalValue: number; campaigns: Set<string> }> = {};

    const filteredSales = selectedCampaign === 'all' 
      ? salesData 
      : salesData.filter(sale => sale.campaign_id === selectedCampaign);

    filteredSales.forEach((sale) => {
      if (!sale.seller_id) return;
      if (!sellerStats[sale.seller_id]) {
        sellerStats[sale.seller_id] = { salesCount: 0, totalValue: 0, campaigns: new Set() };
      }
      sellerStats[sale.seller_id].salesCount += 1;
      sellerStats[sale.seller_id].totalValue += sale.valor_mensal || 0;
      if (sale.campaign_id) {
        sellerStats[sale.seller_id].campaigns.add(sale.campaign_id);
      }
    });

    return Object.entries(sellerStats)
      .map(([sellerId, stats]) => {
        const sellerProfile = profiles.find((p) => p.id === sellerId);
        return {
          sellerId,
          nome: sellerProfile?.nome || 'Desconhecido',
          avatar_url: sellerProfile?.avatar_url || null,
          salesCount: stats.salesCount,
          totalValue: stats.totalValue,
          campaigns: stats.campaigns.size,
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [salesData, profiles, selectedCampaign]);

  // Get campaign performance stats
  const campaignStats = useMemo(() => {
    return campaigns.map((campaign) => {
      const campaignSales = salesData.filter(sale => sale.campaign_id === campaign.id);
      const totalValue = campaignSales.reduce((acc, sale) => acc + (sale.valor_mensal || 0), 0);
      const salesCount = campaignSales.length;
      const uniqueSellers = new Set(campaignSales.map(s => s.seller_id)).size;

      return {
        ...campaign,
        totalValue,
        salesCount,
        uniqueSellers,
        valueProgress: campaign.target_value > 0 ? Math.min((totalValue / campaign.target_value) * 100, 100) : 0,
        salesProgress: campaign.target_sales > 0 ? Math.min((salesCount / campaign.target_sales) * 100, 100) : 0,
      };
    });
  }, [campaigns, salesData]);

  // Performance history by month
  const performanceHistory = useMemo(() => {
    const monthlyStats: Record<string, Record<string, { salesCount: number; totalValue: number }>> = {};

    salesData.forEach((sale) => {
      if (!sale.seller_id || !sale.created_at) return;
      const monthKey = format(new Date(sale.created_at), 'yyyy-MM');
      
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {};
      }
      if (!monthlyStats[monthKey][sale.seller_id]) {
        monthlyStats[monthKey][sale.seller_id] = { salesCount: 0, totalValue: 0 };
      }
      
      monthlyStats[monthKey][sale.seller_id].salesCount += 1;
      monthlyStats[monthKey][sale.seller_id].totalValue += sale.valor_mensal || 0;
    });

    return Object.entries(monthlyStats)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 6)
      .map(([month, sellers]) => ({
        month,
        monthLabel: format(new Date(month + '-01'), 'MMM yyyy', { locale: ptBR }),
        sellers: Object.entries(sellers)
          .map(([sellerId, stats]) => {
            const sellerProfile = profiles.find((p) => p.id === sellerId);
            return {
              sellerId,
              nome: sellerProfile?.nome || 'Desconhecido',
              avatar_url: sellerProfile?.avatar_url || null,
              ...stats,
            };
          })
          .sort((a, b) => b.totalValue - a.totalValue),
      }));
  }, [salesData, profiles]);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="h-5 w-5 text-amber-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-slate-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-orange-600" />;
    return <span className="w-5 text-center font-bold text-muted-foreground">{index + 1}</span>;
  };

  const getRankBg = (index: number) => {
    if (index === 0) return 'bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/30';
    if (index === 1) return 'bg-gradient-to-r from-slate-400/10 to-slate-300/10 border-slate-400/30';
    if (index === 2) return 'bg-gradient-to-r from-orange-600/10 to-orange-500/10 border-orange-600/30';
    return 'bg-muted/30 border-border/50';
  };

  const totalSales = salesData.length;
  const totalValue = salesData.reduce((acc, sale) => acc + (sale.valor_mensal || 0), 0);
  const activeSellers = new Set(salesData.map(s => s.seller_id)).size;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            Ranking de Campanhas
          </h1>
          <p className="text-muted-foreground">
            Ranking geral e histórico de performance dos vendedores
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Campanhas</p>
                  <p className="text-2xl font-bold">{campaigns.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Vendas</p>
                  <p className="text-2xl font-bold">{totalSales}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Award className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(totalValue)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendedores Ativos</p>
                  <p className="text-2xl font-bold">{activeSellers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="ranking" className="space-y-4">
          <TabsList>
            <TabsTrigger value="ranking" className="gap-2">
              <Trophy className="h-4 w-4" />
              Ranking Geral
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-2">
              <Target className="h-4 w-4" />
              Por Campanha
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Histórico Mensal
            </TabsTrigger>
          </TabsList>

          {/* Global Ranking Tab */}
          <TabsContent value="ranking" className="space-y-4">
            <div className="flex items-center gap-4">
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Filtrar por campanha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Campanhas</SelectItem>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {globalRanking.length === 0 ? (
              <Card className="py-12">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma venda em campanhas</h3>
                  <p className="text-muted-foreground">
                    Vincule vendas às campanhas para ver o ranking
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {globalRanking.map((seller, index) => (
                  <Card key={seller.sellerId} className={`border ${getRankBg(index)}`}>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8">
                          {getRankIcon(index)}
                        </div>
                        
                        <Avatar className="h-12 w-12 border-2 border-background shadow">
                          <AvatarImage src={seller.avatar_url || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {seller.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <p className="font-semibold">{seller.nome}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {seller.salesCount} vendas
                            </span>
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              {seller.campaigns} campanhas
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xl font-bold text-primary">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(seller.totalValue)}
                          </p>
                          {index === 0 && (
                            <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                              <Flame className="h-3 w-3 mr-1" />
                              Líder
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-4">
            {campaignStats.length === 0 ? (
              <Card className="py-12">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <Target className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma campanha</h3>
                  <p className="text-muted-foreground">
                    Crie campanhas para acompanhar performance
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {campaignStats.map((campaign) => (
                  <Card key={campaign.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{campaign.name}</CardTitle>
                        <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                          {campaign.status === 'active' ? 'Ativa' : campaign.status === 'paused' ? 'Pausada' : 'Concluída'}
                        </Badge>
                      </div>
                      <CardDescription>
                        {format(new Date(campaign.start_date), 'dd/MM/yyyy', { locale: ptBR })} - {format(new Date(campaign.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold">{campaign.salesCount}</p>
                          <p className="text-xs text-muted-foreground">Vendas</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(campaign.totalValue)}
                          </p>
                          <p className="text-xs text-muted-foreground">Faturado</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{campaign.uniqueSellers}</p>
                          <p className="text-xs text-muted-foreground">Vendedores</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Meta de Vendas</span>
                          <span>{campaign.salesCount}/{campaign.target_sales}</span>
                        </div>
                        <Progress value={campaign.salesProgress} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Meta de Valor</span>
                          <span>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(campaign.totalValue)}/
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(campaign.target_value)}
                          </span>
                        </div>
                        <Progress value={campaign.valueProgress} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            {performanceHistory.length === 0 ? (
              <Card className="py-12">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Sem histórico</h3>
                  <p className="text-muted-foreground">
                    Vendas em campanhas aparecerão aqui
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {performanceHistory.map((month) => (
                  <Card key={month.month}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg capitalize">{month.monthLabel}</CardTitle>
                      <CardDescription>
                        {month.sellers.length} vendedores • {month.sellers.reduce((acc, s) => acc + s.salesCount, 0)} vendas
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {month.sellers.slice(0, 5).map((seller, index) => (
                          <div
                            key={seller.sellerId}
                            className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                          >
                            <div className="w-6 text-center">
                              {index < 3 ? (
                                <span>{['🥇', '🥈', '🥉'][index]}</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">{index + 1}</span>
                              )}
                            </div>
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={seller.avatar_url || ''} />
                              <AvatarFallback className="text-xs">
                                {seller.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="flex-1 font-medium text-sm">{seller.nome}</span>
                            <span className="text-sm text-muted-foreground">{seller.salesCount} vendas</span>
                            <span className="font-semibold text-sm">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(seller.totalValue)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
