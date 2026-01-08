import { useMemo } from 'react';
import { Sale, SaleStatus, SALE_STATUS_LABELS } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle,
  Timer,
  BarChart3,
  ArrowRight,
  Zap
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
  Cell,
} from 'recharts';

interface CallCenterMetricsProps {
  sales: Sale[];
}

const STATUS_COLORS: Record<SaleStatus, string> = {
  PRE_ANALISE: '#3B82F6',
  AGUARDANDO_AUDITORIA: '#F59E0B',
  PENDENCIA: '#F97316',
  VENDA_AUDITADA: '#22C55E',
  INSTALACAO_MARCADA: '#06B6D4',
  INSTALADA: '#8B5CF6',
  CANCELADA: '#EF4444',
};

const STATUS_ORDER: SaleStatus[] = [
  'PRE_ANALISE',
  'AGUARDANDO_AUDITORIA',
  'VENDA_AUDITADA',
  'INSTALACAO_MARCADA',
  'INSTALADA',
];

export function CallCenterMetrics({ sales }: CallCenterMetricsProps) {
  // Calculate audit rate (% that pass from AGUARDANDO_AUDITORIA to VENDA_AUDITADA or beyond)
  const auditMetrics = useMemo(() => {
    const totalSubmitted = sales.filter(s => 
      s.status !== 'PRE_ANALISE'
    ).length;
    
    const audited = sales.filter(s => 
      s.status === 'VENDA_AUDITADA' || 
      s.status === 'INSTALACAO_MARCADA' || 
      s.status === 'INSTALADA'
    ).length;

    const pending = sales.filter(s => s.status === 'PENDENCIA').length;
    const canceled = sales.filter(s => s.status === 'CANCELADA').length;
    const awaitingAudit = sales.filter(s => s.status === 'AGUARDANDO_AUDITORIA').length;
    const installed = sales.filter(s => s.status === 'INSTALADA').length;

    const auditRate = totalSubmitted > 0 ? (audited / totalSubmitted) * 100 : 0;
    const pendingRate = totalSubmitted > 0 ? (pending / totalSubmitted) * 100 : 0;
    const cancelRate = totalSubmitted > 0 ? (canceled / totalSubmitted) * 100 : 0;
    const installRate = audited > 0 ? (installed / audited) * 100 : 0;

    return {
      totalSubmitted,
      audited,
      pending,
      canceled,
      awaitingAudit,
      installed,
      auditRate,
      pendingRate,
      cancelRate,
      installRate,
    };
  }, [sales]);

  // Calculate average time per stage (simulated based on created_at and updated_at)
  const stageMetrics = useMemo(() => {
    const stageData: Record<SaleStatus, { count: number; totalHours: number }> = {
      PRE_ANALISE: { count: 0, totalHours: 0 },
      AGUARDANDO_AUDITORIA: { count: 0, totalHours: 0 },
      PENDENCIA: { count: 0, totalHours: 0 },
      VENDA_AUDITADA: { count: 0, totalHours: 0 },
      INSTALACAO_MARCADA: { count: 0, totalHours: 0 },
      INSTALADA: { count: 0, totalHours: 0 },
      CANCELADA: { count: 0, totalHours: 0 },
    };

    sales.forEach(sale => {
      const created = new Date(sale.created_at);
      const updated = new Date(sale.updated_at);
      const hoursInStage = Math.max(1, (updated.getTime() - created.getTime()) / (1000 * 60 * 60));
      
      stageData[sale.status].count++;
      stageData[sale.status].totalHours += hoursInStage;
    });

    return Object.entries(stageData)
      .filter(([status]) => status !== 'CANCELADA')
      .map(([status, data]) => ({
        status: status as SaleStatus,
        label: SALE_STATUS_LABELS[status as SaleStatus],
        shortLabel: SALE_STATUS_LABELS[status as SaleStatus].split(' ')[0],
        count: data.count,
        avgHours: data.count > 0 ? Math.round(data.totalHours / data.count) : 0,
        color: STATUS_COLORS[status as SaleStatus],
      }));
  }, [sales]);

  // Funnel data
  const funnelData = useMemo(() => {
    const stages = [
      { status: 'PRE_ANALISE', label: 'Pré-Análise' },
      { status: 'AGUARDANDO_AUDITORIA', label: 'Aguard. Auditoria' },
      { status: 'VENDA_AUDITADA', label: 'Auditada' },
      { status: 'INSTALACAO_MARCADA', label: 'Inst. Marcada' },
      { status: 'INSTALADA', label: 'Instalada' },
    ];

    // Count sales that reached each stage or beyond
    return stages.map((stage, index) => {
      const statusesAtOrBeyond = STATUS_ORDER.slice(index);
      const count = sales.filter(s => statusesAtOrBeyond.includes(s.status)).length;
      const prevCount = index === 0 ? sales.length : 
        sales.filter(s => STATUS_ORDER.slice(index - 1).includes(s.status)).length;
      const conversionRate = prevCount > 0 ? (count / prevCount) * 100 : 0;

      return {
        ...stage,
        count,
        conversionRate,
        color: STATUS_COLORS[stage.status as SaleStatus],
      };
    });
  }, [sales]);

  const formatHours = (hours: number) => {
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Auditoria</p>
                  <p className="text-3xl font-bold text-emerald-500">
                    {auditMetrics.auditRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {auditMetrics.audited} de {auditMetrics.totalSubmitted} vendas
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Instalação</p>
                  <p className="text-3xl font-bold text-violet-500">
                    {auditMetrics.installRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {auditMetrics.installed} instaladas
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-violet-500/10 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-violet-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Pendência</p>
                  <p className="text-3xl font-bold text-orange-500">
                    {auditMetrics.pendingRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {auditMetrics.pending} pendentes
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Aguardando Auditoria</p>
                  <p className="text-3xl font-bold text-amber-500">
                    {auditMetrics.awaitingAudit}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    vendas na fila
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Average Time per Stage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Tempo Médio por Etapa</CardTitle>
              </div>
              <CardDescription>
                Quanto tempo as vendas permanecem em cada status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageMetrics} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      type="number" 
                      className="text-xs fill-muted-foreground"
                      tickFormatter={(value) => formatHours(value)}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="shortLabel" 
                      className="text-xs fill-muted-foreground"
                      width={80}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [formatHours(value), 'Tempo Médio']}
                      labelFormatter={(label) => `Status: ${label}`}
                    />
                    <Bar dataKey="avgHours" radius={[0, 4, 4, 0]}>
                      {stageMetrics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Conversion Funnel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Funil de Conversão</CardTitle>
              </div>
              <CardDescription>
                Progressão das vendas pelo pipeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {funnelData.map((stage, index) => {
                  const maxCount = funnelData[0].count || 1;
                  const widthPercent = (stage.count / maxCount) * 100;
                  
                  return (
                    <div key={stage.status} className="relative">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{stage.label}</span>
                          {index > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ({stage.conversionRate.toFixed(0)}% conv.)
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-bold">{stage.count}</span>
                      </div>
                      <div className="h-8 bg-muted/30 rounded-lg overflow-hidden relative">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${widthPercent}%` }}
                          transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                          className="h-full rounded-lg flex items-center justify-end px-2"
                          style={{ backgroundColor: stage.color }}
                        >
                          {widthPercent > 20 && (
                            <span className="text-xs font-medium text-white">
                              {widthPercent.toFixed(0)}%
                            </span>
                          )}
                        </motion.div>
                      </div>
                      {index < funnelData.length - 1 && (
                        <div className="flex justify-center my-1">
                          <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Stage Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Distribuição por Etapa</CardTitle>
            </div>
            <CardDescription>
              Quantidade e tempo médio de vendas em cada etapa do funil
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {stageMetrics.map((stage) => (
                <div
                  key={stage.status}
                  className="p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div 
                    className="w-3 h-3 rounded-full mb-3"
                    style={{ backgroundColor: stage.color }}
                  />
                  <p className="text-xs text-muted-foreground mb-1 truncate" title={stage.label}>
                    {stage.label}
                  </p>
                  <p className="text-2xl font-bold">{stage.count}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Média: {formatHours(stage.avgHours)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}