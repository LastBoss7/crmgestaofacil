import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sale, SaleStatus, Profile } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Trophy, 
  Medal,
  Clock, 
  TrendingUp, 
  CheckCircle2,
  Target,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Crown,
  Star,
  Settings,
  Save,
  Eye,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

interface SellerRankingProps {
  sales: Sale[];
  sellers: Profile[];
}

interface SellerGoal {
  id: string;
  seller_id: string;
  month: number;
  year: number;
  target_sales: number;
  target_value: number;
}

interface SellerMetrics {
  id: string;
  name: string;
  avatarUrl: string | null;
  totalSales: number;
  auditedSales: number;
  installedSales: number;
  pendingSales: number;
  canceledSales: number;
  totalValue: number;
  avgAuditTimeHours: number;
  conversionRate: number;
  installRate: number;
  pendingRate: number;
  score: number;
  // Goals
  goalSales: number;
  goalValue: number;
  goalSalesProgress: number;
  goalValueProgress: number;
}

export function SellerRanking({ sales, sellers }: SellerRankingProps) {
  const navigate = useNavigate();
  const { isCEO } = useAuth();
  const [goals, setGoals] = useState<SellerGoal[]>([]);
  const [isGoalsDialogOpen, setIsGoalsDialogOpen] = useState(false);
  const [editingGoals, setEditingGoals] = useState<Record<string, { sales: number; value: number }>>({});
  const [savingGoals, setSavingGoals] = useState(false);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Fetch goals
  useEffect(() => {
    const fetchGoals = async () => {
      const { data } = await supabase
        .from('seller_goals')
        .select('*')
        .eq('month', currentMonth)
        .eq('year', currentYear);
      
      if (data) {
        setGoals(data as SellerGoal[]);
      }
    };
    fetchGoals();
  }, [currentMonth, currentYear]);

  const sellerMetrics = useMemo(() => {
    const metricsMap: Record<string, SellerMetrics> = {};

    // Initialize metrics for all sellers
    sellers.forEach(seller => {
      const sellerGoal = goals.find(g => g.seller_id === seller.id);
      
      metricsMap[seller.id] = {
        id: seller.id,
        name: seller.nome,
        avatarUrl: seller.avatar_url || null,
        totalSales: 0,
        auditedSales: 0,
        installedSales: 0,
        pendingSales: 0,
        canceledSales: 0,
        totalValue: 0,
        avgAuditTimeHours: 0,
        conversionRate: 0,
        installRate: 0,
        pendingRate: 0,
        score: 0,
        goalSales: sellerGoal?.target_sales || 10,
        goalValue: sellerGoal?.target_value || 0,
        goalSalesProgress: 0,
        goalValueProgress: 0,
      };
    });

    // Filter sales for current month
    const currentMonthSales = sales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate.getMonth() + 1 === currentMonth && saleDate.getFullYear() === currentYear;
    });

    // Calculate metrics from sales
    const auditTimes: Record<string, number[]> = {};

    currentMonthSales.forEach(sale => {
      if (!sale.seller_id || !metricsMap[sale.seller_id]) return;

      const metrics = metricsMap[sale.seller_id];
      metrics.totalSales++;
      metrics.totalValue += Number(sale.valor_mensal);

      if (sale.status === 'VENDA_AUDITADA' || sale.status === 'INSTALACAO_MARCADA' || sale.status === 'INSTALADA') {
        metrics.auditedSales++;
      }
      if (sale.status === 'INSTALADA') {
        metrics.installedSales++;
      }
      if (sale.status === 'PENDENCIA') {
        metrics.pendingSales++;
      }
      if (sale.status === 'CANCELADA') {
        metrics.canceledSales++;
      }

      if (sale.status === 'VENDA_AUDITADA' || sale.status === 'INSTALACAO_MARCADA' || sale.status === 'INSTALADA') {
        const created = new Date(sale.created_at);
        const updated = new Date(sale.updated_at);
        const hoursToAudit = Math.max(1, (updated.getTime() - created.getTime()) / (1000 * 60 * 60));
        
        if (!auditTimes[sale.seller_id]) {
          auditTimes[sale.seller_id] = [];
        }
        auditTimes[sale.seller_id].push(hoursToAudit);
      }
    });

    // Calculate rates, goals progress and scores
    Object.values(metricsMap).forEach(metrics => {
      if (metrics.totalSales > 0) {
        const submitted = metrics.totalSales - currentMonthSales.filter(
          s => s.seller_id === metrics.id && s.status === 'PRE_ANALISE'
        ).length;
        metrics.conversionRate = submitted > 0 ? (metrics.auditedSales / submitted) * 100 : 0;
        metrics.installRate = metrics.auditedSales > 0 
          ? (metrics.installedSales / metrics.auditedSales) * 100 
          : 0;
        metrics.pendingRate = (metrics.pendingSales / metrics.totalSales) * 100;
      }

      if (auditTimes[metrics.id] && auditTimes[metrics.id].length > 0) {
        metrics.avgAuditTimeHours = Math.round(
          auditTimes[metrics.id].reduce((a, b) => a + b, 0) / auditTimes[metrics.id].length
        );
      }

      // Goal progress
      metrics.goalSalesProgress = metrics.goalSales > 0 
        ? Math.min(100, (metrics.totalSales / metrics.goalSales) * 100) 
        : 0;
      metrics.goalValueProgress = metrics.goalValue > 0 
        ? Math.min(100, (metrics.totalValue / metrics.goalValue) * 100) 
        : 0;

      // Score with goal bonus
      const conversionScore = metrics.conversionRate * 0.25;
      const installScore = metrics.installRate * 0.2;
      const volumeScore = Math.min(100, (metrics.totalSales / 10) * 100) * 0.15;
      const speedScore = Math.max(0, 100 - (metrics.avgAuditTimeHours / 2)) * 0.1;
      const qualityScore = Math.max(0, 100 - metrics.pendingRate) * 0.1;
      const goalBonus = ((metrics.goalSalesProgress + metrics.goalValueProgress) / 2) * 0.2;
      
      metrics.score = Math.round(conversionScore + installScore + volumeScore + speedScore + qualityScore + goalBonus);
    });

    return Object.values(metricsMap)
      .filter(m => m.totalSales > 0 || goals.some(g => g.seller_id === m.id))
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [sales, sellers, goals, currentMonth, currentYear]);

  const handleOpenGoalsDialog = () => {
    const initial: Record<string, { sales: number; value: number }> = {};
    sellers.forEach(seller => {
      const existingGoal = goals.find(g => g.seller_id === seller.id);
      initial[seller.id] = {
        sales: existingGoal?.target_sales || 10,
        value: existingGoal?.target_value || 0,
      };
    });
    setEditingGoals(initial);
    setIsGoalsDialogOpen(true);
  };

  const handleSaveGoals = async () => {
    setSavingGoals(true);
    try {
      for (const [sellerId, goalData] of Object.entries(editingGoals)) {
        const existingGoal = goals.find(g => g.seller_id === sellerId);
        
        if (existingGoal) {
          await supabase
            .from('seller_goals')
            .update({
              target_sales: goalData.sales,
              target_value: goalData.value,
            })
            .eq('id', existingGoal.id);
        } else {
          await supabase
            .from('seller_goals')
            .insert({
              seller_id: sellerId,
              month: currentMonth,
              year: currentYear,
              target_sales: goalData.sales,
              target_value: goalData.value,
            });
        }
      }

      // Refetch goals
      const { data } = await supabase
        .from('seller_goals')
        .select('*')
        .eq('month', currentMonth)
        .eq('year', currentYear);
      
      if (data) {
        setGoals(data as SellerGoal[]);
      }

      toast.success('Metas atualizadas com sucesso!');
      setIsGoalsDialogOpen(false);
    } catch (error) {
      console.error('Error saving goals:', error);
      toast.error('Erro ao salvar metas');
    } finally {
      setSavingGoals(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
    }).format(value);
  };

  const formatCurrencyFull = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatHours = (hours: number) => {
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-medium text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30 text-yellow-600 dark:text-yellow-400';
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30 text-gray-600 dark:text-gray-300';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-amber-600/30 text-amber-700 dark:text-amber-400';
      default:
        return 'bg-muted/50 border-border text-muted-foreground';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-orange-500';
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-emerald-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-amber-500';
    return 'bg-orange-500';
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  if (sellerMetrics.length === 0 && sellers.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Trophy className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Nenhum vendedor encontrado</p>
          <p className="text-sm mt-1">Adicione vendedores à equipe para ver o ranking.</p>
        </CardContent>
      </Card>
    );
  }

  const top3 = sellerMetrics.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header with Goals Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Ranking {monthNames[currentMonth - 1]} {currentYear}</h2>
          <p className="text-sm text-muted-foreground">Performance do mês atual</p>
        </div>
        {isCEO && (
          <Dialog open={isGoalsDialogOpen} onOpenChange={setIsGoalsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" onClick={handleOpenGoalsDialog}>
                <Target className="h-4 w-4" />
                Definir Metas
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Metas de {monthNames[currentMonth - 1]} {currentYear}</DialogTitle>
                <DialogDescription>
                  Defina as metas mensais de vendas e valor para cada vendedor
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {sellers.map(seller => (
                  <div key={seller.id} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={seller.avatar_url || ''} />
                      <AvatarFallback>{getInitials(seller.nome)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{seller.nome}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Meta Vendas</Label>
                        <Input
                          type="number"
                          min={0}
                          className="w-24"
                          value={editingGoals[seller.id]?.sales || 0}
                          onChange={(e) => setEditingGoals(prev => ({
                            ...prev,
                            [seller.id]: {
                              ...prev[seller.id],
                              sales: parseInt(e.target.value) || 0,
                            }
                          }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Meta Valor (R$)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={100}
                          className="w-32"
                          value={editingGoals[seller.id]?.value || 0}
                          onChange={(e) => setEditingGoals(prev => ({
                            ...prev,
                            [seller.id]: {
                              ...prev[seller.id],
                              value: parseFloat(e.target.value) || 0,
                            }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsGoalsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveGoals} disabled={savingGoals} className="gap-2">
                  <Save className="h-4 w-4" />
                  {savingGoals ? 'Salvando...' : 'Salvar Metas'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Podium - Top 3 */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 2nd Place */}
          {top3[1] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="md:order-1"
            >
              <Card className="border-gray-400/30 h-full">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="relative mb-3">
                    <Avatar className="h-12 w-12 ring-2 ring-gray-400/30">
                      <AvatarImage src={top3[1].avatarUrl || ''} />
                      <AvatarFallback className="bg-gray-400/10 text-gray-600 dark:text-gray-300 text-sm font-bold">
                        {getInitials(top3[1].name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gray-400 flex items-center justify-center text-[10px] text-white font-bold">2</div>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground truncate max-w-full">{top3[1].name}</h3>
                  <p className="text-lg font-bold text-emerald-500">{formatCurrency(top3[1].totalValue)}</p>
                  <div className="w-full mt-2">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-muted-foreground">Meta</span>
                      <span>{top3[1].totalSales}/{top3[1].goalSales}</span>
                    </div>
                    <Progress value={top3[1].goalSalesProgress} className="h-1.5" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 1st Place */}
          {top3[0] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:order-2"
            >
              <Card className="border-yellow-500/30 h-full relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-500 to-amber-500" />
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="relative mb-3">
                    <Avatar className="h-14 w-14 ring-2 ring-yellow-500/50">
                      <AvatarImage src={top3[0].avatarUrl || ''} />
                      <AvatarFallback className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-bold">
                        {getInitials(top3[0].name)}
                      </AvatarFallback>
                    </Avatar>
                    <Crown className="absolute -top-2 -right-1 h-5 w-5 text-yellow-500" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground truncate max-w-full">{top3[0].name}</h3>
                  <p className="text-xl font-bold text-emerald-500">{formatCurrency(top3[0].totalValue)}</p>
                  <div className="w-full mt-2 space-y-1.5">
                    <div>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-muted-foreground">Vendas</span>
                        <span>{top3[0].totalSales}/{top3[0].goalSales}</span>
                      </div>
                      <Progress value={top3[0].goalSalesProgress} className="h-1.5" />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-muted-foreground">Valor</span>
                        <span>{formatCurrency(top3[0].totalValue)}</span>
                      </div>
                      <Progress value={top3[0].goalValueProgress} className="h-1.5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 3rd Place */}
          {top3[2] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="md:order-3"
            >
              <Card className="border-amber-600/30 h-full">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="relative mb-3">
                    <Avatar className="h-12 w-12 ring-2 ring-amber-600/30">
                      <AvatarImage src={top3[2].avatarUrl || ''} />
                      <AvatarFallback className="bg-amber-600/10 text-amber-700 dark:text-amber-400 text-sm font-bold">
                        {getInitials(top3[2].name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-600 flex items-center justify-center text-[10px] text-white font-bold">3</div>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground truncate max-w-full">{top3[2].name}</h3>
                  <p className="text-lg font-bold text-emerald-500">{formatCurrency(top3[2].totalValue)}</p>
                  <div className="w-full mt-2">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-muted-foreground">Meta</span>
                      <span>{top3[2].totalSales}/{top3[2].goalSales}</span>
                    </div>
                    <Progress value={top3[2].goalSalesProgress} className="h-1.5" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      )}

      {/* Full Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Ranking Completo</CardTitle>
            </div>
            <CardDescription>
              Performance detalhada com progresso de metas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-center">Vendas</TableHead>
                    <TableHead className="text-center">Meta Vendas</TableHead>
                    <TableHead className="text-center">Valor</TableHead>
                    <TableHead className="text-center">Meta Valor</TableHead>
                    <TableHead className="text-center">Taxa Conv.</TableHead>
                    <TableHead className="text-center">Tempo Médio</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellerMetrics.map((seller, index) => (
                    <TableRow key={seller.id} className={index < 3 ? 'bg-muted/30' : ''}>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          {getRankIcon(index + 1)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={seller.avatarUrl || ''} />
                            <AvatarFallback className="text-xs">
                              {getInitials(seller.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{seller.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {seller.totalSales}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            {seller.totalSales}/{seller.goalSales}
                          </span>
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full rounded-full transition-all", getProgressColor(seller.goalSalesProgress))}
                              style={{ width: `${Math.min(100, seller.goalSalesProgress)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium text-primary">
                        {formatCurrency(seller.totalValue)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            {seller.goalValue > 0 ? `${seller.goalValueProgress.toFixed(0)}%` : '-'}
                          </span>
                          {seller.goalValue > 0 && (
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={cn("h-full rounded-full transition-all", getProgressColor(seller.goalValueProgress))}
                                style={{ width: `${Math.min(100, seller.goalValueProgress)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className={cn(
                            "font-medium",
                            seller.conversionRate >= 70 ? "text-emerald-500" :
                            seller.conversionRate >= 50 ? "text-amber-500" : "text-orange-500"
                          )}>
                            {seller.conversionRate.toFixed(0)}%
                          </span>
                          {seller.conversionRate >= 70 ? (
                            <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                          ) : seller.conversionRate >= 50 ? (
                            <Minus className="h-3 w-3 text-amber-500" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3 text-orange-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatHours(seller.avgAuditTimeHours)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("font-bold", getRankBadgeColor(index + 1))}>
                          {seller.score} pts
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/vendedor/${seller.id}`)}
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Metrics Legend */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-500" />
              <span><strong>Metas:</strong> Objetivos mensais definidos pelo CEO</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span><strong>Tempo Médio:</strong> Tempo até auditoria</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-violet-500" />
              <span><strong>Score:</strong> Inclui bônus por metas atingidas</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}