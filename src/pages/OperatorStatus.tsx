import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOperatorStatus } from '@/hooks/useOperatorStatus';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  OperatorStatus as OpStatus, 
  OPERATOR_STATUS_LABELS, 
  OPERATOR_STATUS_COLORS,
  OperatorStatusLog,
  Profile 
} from '@/types/database';
import { 
  Phone, Coffee, UtensilsCrossed, Circle, PhoneOff, 
  Users, Clock, BarChart3, TrendingUp, Calendar,
  Activity
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, differenceInSeconds, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_ICONS: Record<OpStatus, React.ReactNode> = {
  DISPONIVEL: <Circle className="h-4 w-4 fill-current" />,
  EM_LIGACAO: <Phone className="h-4 w-4" />,
  PAUSA: <Coffee className="h-4 w-4" />,
  ALMOCO: <UtensilsCrossed className="h-4 w-4" />,
  OFFLINE: <PhoneOff className="h-4 w-4" />,
};

const CHART_COLORS = {
  DISPONIVEL: '#22c55e',
  EM_LIGACAO: '#3b82f6',
  PAUSA: '#eab308',
  ALMOCO: '#f97316',
  OFFLINE: '#6b7280',
};

export default function OperatorStatusPage() {
  const { isCEO, isBackoffice, canManageUsers, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { allStatuses, fetchAllStatuses } = useOperatorStatus();
  
  const [logs, setLogs] = useState<(OperatorStatusLog & { profile?: Profile })[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('today');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for role to be loaded before checking permissions
    if (!authLoading && role !== null && !canManageUsers) {
      navigate('/dashboard');
      toast.error('Acesso não autorizado');
      return;
    }
    
    // Only fetch data when user has permission
    if (authLoading || role === null || !canManageUsers) {
      return;
    }
    
    fetchData();
    fetchAllStatuses();

    // Set up realtime subscription
    const channel = supabase
      .channel('operator-status-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'operator_current_status' },
        () => fetchAllStatuses()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canManageUsers, navigate, authLoading, role]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch profiles
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .eq('active', true);
    
    if (profilesData) setProfiles(profilesData);

    // Fetch logs based on date range
    let startDate: Date;
    const endDate = endOfDay(new Date());

    switch (dateRange) {
      case 'today':
        startDate = startOfDay(new Date());
        break;
      case '7days':
        startDate = startOfDay(subDays(new Date(), 7));
        break;
      case '30days':
        startDate = startOfDay(subDays(new Date(), 30));
        break;
      default:
        startDate = startOfDay(new Date());
    }

    let query = supabase
      .from('operator_status_logs')
      .select('*')
      .gte('started_at', startDate.toISOString())
      .lte('started_at', endDate.toISOString())
      .order('started_at', { ascending: false });

    if (selectedUser !== 'all') {
      query = query.eq('user_id', selectedUser);
    }

    const { data: logsData, error } = await query;

    if (error) {
      console.error('Error fetching logs:', error);
    } else if (logsData) {
      setLogs(logsData as OperatorStatusLog[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (canManageUsers) {
      fetchData();
    }
  }, [dateRange, selectedUser]);

  const getProfile = (userId: string) => profiles.find(p => p.id === userId);

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '00:00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const statusTotals: Record<OpStatus, number> = {
      DISPONIVEL: 0,
      EM_LIGACAO: 0,
      PAUSA: 0,
      ALMOCO: 0,
      OFFLINE: 0,
    };

    const userTotals: Record<string, Record<OpStatus, number>> = {};

    logs.forEach(log => {
      const duration = log.duration_seconds || 0;
      statusTotals[log.status as OpStatus] += duration;

      if (!userTotals[log.user_id]) {
        userTotals[log.user_id] = { DISPONIVEL: 0, EM_LIGACAO: 0, PAUSA: 0, ALMOCO: 0, OFFLINE: 0 };
      }
      userTotals[log.user_id][log.status as OpStatus] += duration;
    });

    const totalTime = Object.values(statusTotals).reduce((a, b) => a + b, 0);
    const productiveTime = statusTotals.DISPONIVEL + statusTotals.EM_LIGACAO;
    const productivityRate = totalTime > 0 ? Math.round((productiveTime / totalTime) * 100) : 0;

    // Pie chart data
    const pieData = Object.entries(statusTotals)
      .filter(([_, value]) => value > 0)
      .map(([status, value]) => ({
        name: OPERATOR_STATUS_LABELS[status as OpStatus],
        value: Math.round(value / 60), // Convert to minutes
        color: CHART_COLORS[status as OpStatus],
      }));

    // Bar chart data per user
    const barData = Object.entries(userTotals).map(([userId, totals]) => {
      const profile = getProfile(userId);
      return {
        name: profile?.nome?.split(' ')[0] || 'Usuário',
        disponivel: Math.round(totals.DISPONIVEL / 60),
        emLigacao: Math.round(totals.EM_LIGACAO / 60),
        pausa: Math.round(totals.PAUSA / 60),
        almoco: Math.round(totals.ALMOCO / 60),
      };
    });

    return {
      statusTotals,
      totalTime,
      productiveTime,
      productivityRate,
      pieData,
      barData,
      onlineCount: allStatuses.filter(s => s.status !== 'OFFLINE').length,
      availableCount: allStatuses.filter(s => s.status === 'DISPONIVEL').length,
      onCallCount: allStatuses.filter(s => s.status === 'EM_LIGACAO').length,
    };
  }, [logs, allStatuses, profiles]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Controle de Pausas</h1>
            <p className="text-muted-foreground">Monitore o status e produtividade dos operadores</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.onlineCount}</p>
                  <p className="text-xs text-muted-foreground">Online Agora</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Circle className="h-5 w-5 text-green-500 fill-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.availableCount}</p>
                  <p className="text-xs text-muted-foreground">Disponíveis</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Phone className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.onCallCount}</p>
                  <p className="text-xs text-muted-foreground">Em Ligação</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.productivityRate}%</p>
                  <p className="text-xs text-muted-foreground">Produtividade</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="realtime" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="realtime" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Tempo Real
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Relatórios
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* Realtime Tab */}
          <TabsContent value="realtime" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status dos Operadores</CardTitle>
                <CardDescription>Visualização em tempo real</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allStatuses.map((status) => {
                    const profile = getProfile(status.user_id) || status.profile;
                    const startTime = new Date(status.status_started_at);
                    const elapsedSeconds = differenceInSeconds(new Date(), startTime);
                    
                    return (
                      <div
                        key={status.user_id}
                        className={cn(
                          "p-4 rounded-lg border-2 transition-all",
                          status.status === 'DISPONIVEL' && "border-green-500/50 bg-green-500/5",
                          status.status === 'EM_LIGACAO' && "border-blue-500/50 bg-blue-500/5",
                          status.status === 'PAUSA' && "border-yellow-500/50 bg-yellow-500/5",
                          status.status === 'ALMOCO' && "border-orange-500/50 bg-orange-500/5",
                          status.status === 'OFFLINE' && "border-gray-500/50 bg-gray-500/5"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={profile?.avatar_url || undefined} />
                              <AvatarFallback>
                                {getInitials(profile?.nome || '')}
                              </AvatarFallback>
                            </Avatar>
                            <span className={cn(
                              "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center",
                              OPERATOR_STATUS_COLORS[status.status as OpStatus]
                            )}>
                              {STATUS_ICONS[status.status as OpStatus]}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{profile?.nome || 'Usuário'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge 
                                variant="secondary" 
                                className={cn(
                                  "text-xs",
                                  status.status === 'DISPONIVEL' && "bg-green-500/20 text-green-700",
                                  status.status === 'EM_LIGACAO' && "bg-blue-500/20 text-blue-700",
                                  status.status === 'PAUSA' && "bg-yellow-500/20 text-yellow-700",
                                  status.status === 'ALMOCO' && "bg-orange-500/20 text-orange-700",
                                  status.status === 'OFFLINE' && "bg-gray-500/20 text-gray-700"
                                )}
                              >
                                {OPERATOR_STATUS_LABELS[status.status as OpStatus]}
                              </Badge>
                              <span className="text-xs text-muted-foreground font-mono">
                                {formatDuration(elapsedSeconds)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {allStatuses.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      Nenhum operador online
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="mt-4 space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-4">
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-[180px]">
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Hoje</SelectItem>
                      <SelectItem value="7days">Últimos 7 dias</SelectItem>
                      <SelectItem value="30days">Últimos 30 dias</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger className="w-[200px]">
                      <Users className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os usuários</SelectItem>
                      {profiles.map(profile => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Pie Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Distribuição de Tempo</CardTitle>
                  <CardDescription>Tempo total em cada status (minutos)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {stats.pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats.pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name}: ${value}min`}
                            outerRadius={100}
                            dataKey="value"
                          >
                            {stats.pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Sem dados para o período
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Bar Chart per User */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Tempo por Operador</CardTitle>
                  <CardDescription>Minutos em cada status por operador</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {stats.barData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.barData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }} 
                          />
                          <Legend />
                          <Bar dataKey="disponivel" name="Disponível" fill={CHART_COLORS.DISPONIVEL} stackId="a" />
                          <Bar dataKey="emLigacao" name="Em Ligação" fill={CHART_COLORS.EM_LIGACAO} stackId="a" />
                          <Bar dataKey="pausa" name="Pausa" fill={CHART_COLORS.PAUSA} stackId="a" />
                          <Bar dataKey="almoco" name="Almoço" fill={CHART_COLORS.ALMOCO} stackId="a" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Sem dados para o período
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Time Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {(Object.keys(OPERATOR_STATUS_LABELS) as OpStatus[]).filter(s => s !== 'OFFLINE').map((status) => (
                <Card key={status}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn(
                        "flex items-center justify-center w-6 h-6 rounded-full text-white",
                        OPERATOR_STATUS_COLORS[status]
                      )}>
                        {STATUS_ICONS[status]}
                      </span>
                      <span className="text-sm font-medium">{OPERATOR_STATUS_LABELS[status]}</span>
                    </div>
                    <p className="text-2xl font-bold font-mono">
                      {formatDuration(stats.statusTotals[status])}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Histórico de Status</CardTitle>
                    <CardDescription>Registro detalhado de mudanças de status</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={dateRange} onValueChange={setDateRange}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Período" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Hoje</SelectItem>
                        <SelectItem value="7days">7 dias</SelectItem>
                        <SelectItem value="30days">30 dias</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Usuário" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {profiles.map(profile => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {logs.map((log) => {
                      const profile = getProfile(log.user_id);
                      return (
                        <div
                          key={log.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={profile?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(profile?.nome || '')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{profile?.nome || 'Usuário'}</span>
                              <Badge 
                                variant="secondary" 
                                className={cn(
                                  "text-xs",
                                  log.status === 'DISPONIVEL' && "bg-green-500/20 text-green-700",
                                  log.status === 'EM_LIGACAO' && "bg-blue-500/20 text-blue-700",
                                  log.status === 'PAUSA' && "bg-yellow-500/20 text-yellow-700",
                                  log.status === 'ALMOCO' && "bg-orange-500/20 text-orange-700",
                                  log.status === 'OFFLINE' && "bg-gray-500/20 text-gray-700"
                                )}
                              >
                                {OPERATOR_STATUS_LABELS[log.status as OpStatus]}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(log.started_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                              {log.ended_at && (
                                <> → {format(new Date(log.ended_at), "HH:mm:ss", { locale: ptBR })}</>
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-sm">
                              {formatDuration(log.duration_seconds)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {logs.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhum registro encontrado
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
