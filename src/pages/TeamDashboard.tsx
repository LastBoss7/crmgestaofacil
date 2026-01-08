import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Sale, SaleStatus, SALE_STATUS_LABELS, Profile, Team } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  TrendingUp, 
  TrendingDown,
  Trophy,
  Target,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BarChart3,
  Zap,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_COLORS: Record<SaleStatus, string> = {
  PRE_ANALISE: '#3B82F6',
  AGUARDANDO_AUDITORIA: '#F59E0B',
  PENDENCIA: '#F97316',
  VENDA_AUDITADA: '#22C55E',
  INSTALACAO_MARCADA: '#06B6D4',
  INSTALADA: '#8B5CF6',
  CANCELADA: '#EF4444',
};

interface TeamMemberMetrics {
  id: string;
  name: string;
  avatarUrl: string | null;
  totalSales: number;
  auditedSales: number;
  installedSales: number;
  pendingSales: number;
  canceledSales: number;
  totalValue: number;
  conversionRate: number;
  score: number;
}

interface SellerGoal {
  id: string;
  seller_id: string;
  month: number;
  year: number;
  target_sales: number;
  target_value: number;
}

export default function TeamDashboard() {
  const navigate = useNavigate();
  const { user, isBackoffice, isCEO, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [goals, setGoals] = useState<SellerGoal[]>([]);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!isBackoffice && !isCEO) {
      navigate('/dashboard');
      return;
    }
    fetchTeamData();
  }, [user, isBackoffice, isCEO]);

  const fetchTeamData = async () => {
    if (!user) return;

    try {
      // Fetch team where user is supervisor
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('supervisor_id', user.id)
        .maybeSingle();

      if (!teamData) {
        setLoading(false);
        return;
      }

      setTeam(teamData as Team);

      // Fetch team members
      const { data: membersData } = await supabase
        .from('profiles')
        .select('*')
        .eq('team_id', teamData.id);

      setMembers((membersData || []) as Profile[]);

      // Fetch sales for team members
      const memberIds = (membersData || []).map(m => m.id);
      if (memberIds.length > 0) {
        const { data: salesData } = await supabase
          .from('sales')
          .select('*')
          .in('seller_id', memberIds)
          .order('created_at', { ascending: false });

        setSales((salesData || []) as Sale[]);
      }

      // Fetch goals
      const { data: goalsData } = await supabase
        .from('seller_goals')
        .select('*')
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .in('seller_id', memberIds);

      setGoals((goalsData || []) as SellerGoal[]);
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate member metrics
  const memberMetrics = useMemo(() => {
    const metrics: TeamMemberMetrics[] = members.map(member => {
      const memberSales = sales.filter(s => s.seller_id === member.id);
      const currentMonthSales = memberSales.filter(s => {
        const saleDate = new Date(s.created_at);
        return saleDate.getMonth() + 1 === currentMonth && saleDate.getFullYear() === currentYear;
      });

      const totalSales = currentMonthSales.length;
      const auditedSales = currentMonthSales.filter(s => 
        s.status === 'VENDA_AUDITADA' || s.status === 'INSTALACAO_MARCADA' || s.status === 'INSTALADA'
      ).length;
      const installedSales = currentMonthSales.filter(s => s.status === 'INSTALADA').length;
      const pendingSales = currentMonthSales.filter(s => s.status === 'PENDENCIA').length;
      const canceledSales = currentMonthSales.filter(s => s.status === 'CANCELADA').length;
      const totalValue = currentMonthSales.reduce((acc, s) => acc + Number(s.valor_mensal), 0);

      const submitted = totalSales - currentMonthSales.filter(s => s.status === 'PRE_ANALISE').length;
      const conversionRate = submitted > 0 ? (auditedSales / submitted) * 100 : 0;

      // Calculate score
      const conversionScore = conversionRate * 0.3;
      const volumeScore = Math.min(100, (totalSales / 10) * 100) * 0.3;
      const qualityScore = totalSales > 0 ? Math.max(0, 100 - (pendingSales / totalSales) * 100) * 0.2 : 0;
      const installScore = auditedSales > 0 ? (installedSales / auditedSales) * 100 * 0.2 : 0;

      return {
        id: member.id,
        name: member.nome,
        avatarUrl: member.avatar_url,
        totalSales,
        auditedSales,
        installedSales,
        pendingSales,
        canceledSales,
        totalValue,
        conversionRate,
        score: Math.round(conversionScore + volumeScore + qualityScore + installScore),
      };
    });

    return metrics.sort((a, b) => b.score - a.score);
  }, [members, sales, currentMonth, currentYear]);

  // Team totals
  const teamTotals = useMemo(() => {
    const currentMonthSales = sales.filter(s => {
      const saleDate = new Date(s.created_at);
      return saleDate.getMonth() + 1 === currentMonth && saleDate.getFullYear() === currentYear;
    });

    return {
      totalSales: currentMonthSales.length,
      totalValue: currentMonthSales.reduce((acc, s) => acc + Number(s.valor_mensal), 0),
      auditedSales: currentMonthSales.filter(s => 
        s.status === 'VENDA_AUDITADA' || s.status === 'INSTALACAO_MARCADA' || s.status === 'INSTALADA'
      ).length,
      pendingSales: currentMonthSales.filter(s => s.status === 'PENDENCIA').length,
      installedSales: currentMonthSales.filter(s => s.status === 'INSTALADA').length,
      canceledSales: currentMonthSales.filter(s => s.status === 'CANCELADA').length,
    };
  }, [sales, currentMonth, currentYear]);

  // Status distribution
  const statusDistribution = useMemo(() => {
    const currentMonthSales = sales.filter(s => {
      const saleDate = new Date(s.created_at);
      return saleDate.getMonth() + 1 === currentMonth && saleDate.getFullYear() === currentYear;
    });

    const distribution = Object.entries(SALE_STATUS_LABELS).map(([status, label]) => ({
      status: status as SaleStatus,
      label,
      count: currentMonthSales.filter(s => s.status === status).length,
      color: STATUS_COLORS[status as SaleStatus],
    })).filter(d => d.count > 0);

    return distribution;
  }, [sales, currentMonth, currentYear]);

  // Daily trend
  const dailyTrend = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = new Date();
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
      const daySales = sales.filter(s => {
        const saleDate = new Date(s.created_at);
        return isSameDay(saleDate, day);
      });

      return {
        date: format(day, 'dd/MM'),
        vendas: daySales.length,
        valor: daySales.reduce((acc, s) => acc + Number(s.valor_mensal), 0),
      };
    });
  }, [sales]);

  // Team goals progress
  const teamGoalsProgress = useMemo(() => {
    const totalTargetSales = goals.reduce((acc, g) => acc + g.target_sales, 0);
    const totalTargetValue = goals.reduce((acc, g) => acc + g.target_value, 0);

    return {
      salesProgress: totalTargetSales > 0 ? (teamTotals.totalSales / totalTargetSales) * 100 : 0,
      valueProgress: totalTargetValue > 0 ? (teamTotals.totalValue / totalTargetValue) * 100 : 0,
      totalTargetSales,
      totalTargetValue,
    };
  }, [goals, teamTotals]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-orange-500';
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (!team) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <Users className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Nenhuma equipe atribuída</h2>
          <p className="text-muted-foreground mb-4">
            Você ainda não é supervisor de nenhuma equipe.
          </p>
          <Button onClick={() => navigate('/dashboard')}>
            Voltar ao Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6" />
              {team.name}
            </h1>
            <p className="text-muted-foreground">
              Dashboard de desempenho • {monthNames[currentMonth - 1]} {currentYear}
            </p>
          </div>
          <Button onClick={() => navigate('/equipes')} variant="outline">
            Gerenciar Equipe
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Vendas</p>
                    <p className="text-3xl font-bold text-primary">{teamTotals.totalSales}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {members.length} vendedores
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="text-3xl font-bold text-emerald-500">{formatCurrency(teamTotals.totalValue)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      valor mensal
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-emerald-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Instaladas</p>
                    <p className="text-3xl font-bold text-violet-500">{teamTotals.installedSales}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {teamTotals.totalSales > 0 ? ((teamTotals.installedSales / teamTotals.totalSales) * 100).toFixed(0) : 0}% do total
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-violet-500/10 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-violet-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pendências</p>
                    <p className="text-3xl font-bold text-orange-500">{teamTotals.pendingSales}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {teamTotals.totalSales > 0 ? ((teamTotals.pendingSales / teamTotals.totalSales) * 100).toFixed(0) : 0}% do total
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Goals Progress */}
        {goals.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Progresso das Metas da Equipe</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Meta de Vendas</span>
                      <span className="font-medium">{teamTotals.totalSales} / {teamGoalsProgress.totalTargetSales}</span>
                    </div>
                    <Progress value={Math.min(100, teamGoalsProgress.salesProgress)} className="h-3" />
                    <p className="text-xs text-muted-foreground text-right">
                      {teamGoalsProgress.salesProgress.toFixed(0)}% concluído
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Meta de Valor</span>
                      <span className="font-medium">{formatCurrency(teamTotals.totalValue)} / {formatCurrency(teamGoalsProgress.totalTargetValue)}</span>
                    </div>
                    <Progress value={Math.min(100, teamGoalsProgress.valueProgress)} className="h-3" />
                    <p className="text-xs text-muted-foreground text-right">
                      {teamGoalsProgress.valueProgress.toFixed(0)}% concluído
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Trend */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vendas Diárias</CardTitle>
                <CardDescription>Evolução de vendas no mês atual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                      <YAxis className="text-xs fill-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="vendas" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Status Distribution */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribuição por Status</CardTitle>
                <CardDescription>Como as vendas estão distribuídas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number, name: string, props: any) => [value, props.payload.label]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  {statusDistribution.map((item) => (
                    <div key={item.status} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-muted-foreground">{item.label} ({item.count})</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Team Members Ranking */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Ranking da Equipe</CardTitle>
                </div>
              </div>
              <CardDescription>Desempenho dos vendedores no mês atual</CardDescription>
            </CardHeader>
            <CardContent>
              {memberMetrics.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum vendedor na equipe ainda.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {memberMetrics.map((member, index) => {
                    const memberGoal = goals.find(g => g.seller_id === member.id);
                    const goalProgress = memberGoal 
                      ? (member.totalSales / memberGoal.target_sales) * 100 
                      : 0;

                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold text-sm">
                          {index + 1}
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatarUrl || ''} />
                          <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{member.name}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{member.totalSales} vendas</span>
                            <span>{formatCurrency(member.totalValue)}</span>
                          </div>
                        </div>
                        <div className="hidden md:flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Conversão</p>
                            <p className="font-medium">{member.conversionRate.toFixed(0)}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Instaladas</p>
                            <p className="font-medium">{member.installedSales}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Pendências</p>
                            <p className="font-medium text-orange-500">{member.pendingSales}</p>
                          </div>
                          {memberGoal && (
                            <div className="w-24">
                              <p className="text-xs text-muted-foreground mb-1">Meta</p>
                              <Progress value={Math.min(100, goalProgress)} className="h-2" />
                            </div>
                          )}
                        </div>
                        <div className={cn("text-lg font-bold", getScoreColor(member.score))}>
                          {member.score} pts
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => navigate(`/vendedor/${member.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
}
