import { useMemo } from 'react';
import { Sale, SaleStatus, Profile } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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

interface SellerRankingProps {
  sales: Sale[];
  sellers: Profile[];
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
}

export function SellerRanking({ sales, sellers }: SellerRankingProps) {
  const sellerMetrics = useMemo(() => {
    const metricsMap: Record<string, SellerMetrics> = {};

    // Initialize metrics for all sellers
    sellers.forEach(seller => {
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
      };
    });

    // Calculate metrics from sales
    const auditTimes: Record<string, number[]> = {};

    sales.forEach(sale => {
      if (!sale.seller_id || !metricsMap[sale.seller_id]) return;

      const metrics = metricsMap[sale.seller_id];
      metrics.totalSales++;
      metrics.totalValue += Number(sale.valor_mensal);

      // Count by status
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

      // Calculate time to audit (from created to updated for audited sales)
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

    // Calculate rates and scores
    Object.values(metricsMap).forEach(metrics => {
      if (metrics.totalSales > 0) {
        // Conversion rate: audited / (total - pre_analise)
        const submitted = metrics.totalSales - sales.filter(
          s => s.seller_id === metrics.id && s.status === 'PRE_ANALISE'
        ).length;
        metrics.conversionRate = submitted > 0 ? (metrics.auditedSales / submitted) * 100 : 0;
        
        // Install rate: installed / audited
        metrics.installRate = metrics.auditedSales > 0 
          ? (metrics.installedSales / metrics.auditedSales) * 100 
          : 0;
        
        // Pending rate
        metrics.pendingRate = (metrics.pendingSales / metrics.totalSales) * 100;
      }

      // Average audit time
      if (auditTimes[metrics.id] && auditTimes[metrics.id].length > 0) {
        metrics.avgAuditTimeHours = Math.round(
          auditTimes[metrics.id].reduce((a, b) => a + b, 0) / auditTimes[metrics.id].length
        );
      }

      // Calculate score (weighted formula)
      // Higher is better: conversion rate, install rate, total value
      // Lower is better: avg audit time, pending rate
      const conversionScore = metrics.conversionRate * 0.3;
      const installScore = metrics.installRate * 0.25;
      const volumeScore = Math.min(100, (metrics.totalSales / 10) * 100) * 0.2;
      const speedScore = Math.max(0, 100 - (metrics.avgAuditTimeHours / 2)) * 0.15;
      const qualityScore = Math.max(0, 100 - metrics.pendingRate) * 0.1;
      
      metrics.score = Math.round(conversionScore + installScore + volumeScore + speedScore + qualityScore);
    });

    // Sort by score descending
    return Object.values(metricsMap)
      .filter(m => m.totalSales > 0)
      .sort((a, b) => b.score - a.score);
  }, [sales, sellers]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
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

  if (sellerMetrics.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Trophy className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Nenhum vendedor com vendas</p>
          <p className="text-sm mt-1">O ranking será exibido quando houver vendas registradas.</p>
        </CardContent>
      </Card>
    );
  }

  // Top 3 podium
  const top3 = sellerMetrics.slice(0, 3);
  const others = sellerMetrics.slice(3);

  return (
    <div className="space-y-6">
      {/* Podium - Top 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 2nd Place */}
        {top3[1] && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="md:order-1"
          >
            <Card className="border-gray-400/30 bg-gradient-to-br from-gray-400/5 to-transparent h-full">
              <CardContent className="pt-6 flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <Avatar className="h-16 w-16 ring-4 ring-gray-400/30">
                    <AvatarImage src={top3[1].avatarUrl || ''} />
                    <AvatarFallback className="bg-gray-400/10 text-gray-600 dark:text-gray-300 text-lg font-bold">
                      {getInitials(top3[1].name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground truncate max-w-full">{top3[1].name}</h3>
                <p className={cn("text-2xl font-bold mt-2", getScoreColor(top3[1].score))}>
                  {top3[1].score} pts
                </p>
                <div className="grid grid-cols-2 gap-4 mt-4 w-full text-sm">
                  <div>
                    <p className="text-muted-foreground">Conversão</p>
                    <p className="font-semibold text-emerald-500">{top3[1].conversionRate.toFixed(0)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Vendas</p>
                    <p className="font-semibold">{top3[1].totalSales}</p>
                  </div>
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
            <Card className="border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-amber-500/5 h-full relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 to-amber-500" />
              <CardContent className="pt-6 flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <Avatar className="h-20 w-20 ring-4 ring-yellow-500/50">
                    <AvatarImage src={top3[0].avatarUrl || ''} />
                    <AvatarFallback className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xl font-bold">
                      {getInitials(top3[0].name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-3 -right-1">
                    <Crown className="h-8 w-8 text-yellow-500 drop-shadow-lg" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">TOP PERFORMER</span>
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                </div>
                <h3 className="font-bold text-lg text-foreground truncate max-w-full">{top3[0].name}</h3>
                <p className={cn("text-3xl font-bold mt-2", getScoreColor(top3[0].score))}>
                  {top3[0].score} pts
                </p>
                <div className="grid grid-cols-3 gap-3 mt-4 w-full text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Conversão</p>
                    <p className="font-semibold text-emerald-500">{top3[0].conversionRate.toFixed(0)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Vendas</p>
                    <p className="font-semibold">{top3[0].totalSales}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Valor</p>
                    <p className="font-semibold text-primary">{formatCurrency(top3[0].totalValue)}</p>
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
            <Card className="border-amber-600/30 bg-gradient-to-br from-amber-600/5 to-transparent h-full">
              <CardContent className="pt-6 flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <Avatar className="h-16 w-16 ring-4 ring-amber-600/30">
                    <AvatarImage src={top3[2].avatarUrl || ''} />
                    <AvatarFallback className="bg-amber-600/10 text-amber-700 dark:text-amber-400 text-lg font-bold">
                      {getInitials(top3[2].name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-amber-600 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-sm">3</span>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground truncate max-w-full">{top3[2].name}</h3>
                <p className={cn("text-2xl font-bold mt-2", getScoreColor(top3[2].score))}>
                  {top3[2].score} pts
                </p>
                <div className="grid grid-cols-2 gap-4 mt-4 w-full text-sm">
                  <div>
                    <p className="text-muted-foreground">Conversão</p>
                    <p className="font-semibold text-emerald-500">{top3[2].conversionRate.toFixed(0)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Vendas</p>
                    <p className="font-semibold">{top3[2].totalSales}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

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
              Performance detalhada de todos os vendedores
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
                    <TableHead className="text-center">Auditadas</TableHead>
                    <TableHead className="text-center">Instaladas</TableHead>
                    <TableHead className="text-center">Taxa Conv.</TableHead>
                    <TableHead className="text-center">Tempo Médio</TableHead>
                    <TableHead className="text-center">Valor Total</TableHead>
                    <TableHead className="text-center">Score</TableHead>
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
                      <TableCell className="text-center">
                        <span className="text-emerald-500 font-medium">{seller.auditedSales}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-violet-500 font-medium">{seller.installedSales}</span>
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
                      <TableCell className="text-center font-medium text-primary">
                        {formatCurrency(seller.totalValue)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("font-bold", getRankBadgeColor(index + 1))}>
                          {seller.score} pts
                        </Badge>
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
              <span><strong>Taxa de Conversão:</strong> % de vendas auditadas</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span><strong>Tempo Médio:</strong> Tempo até auditoria</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-violet-500" />
              <span><strong>Score:</strong> Pontuação geral ponderada</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}