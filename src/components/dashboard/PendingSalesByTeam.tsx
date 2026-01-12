import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users2, AlertCircle, Clock, FileSearch } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TeamPendingSales {
  team_id: string;
  team_name: string;
  pre_analise: number;
  aguardando_auditoria: number;
  pendencia: number;
  total: number;
}

export const PendingSalesByTeam = () => {
  const [teamStats, setTeamStats] = useState<TeamPendingSales[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch teams
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name');

      // Fetch all pending sales
      const { data: sales } = await supabase
        .from('sales')
        .select('equipe, status')
        .in('status', ['PRE_ANALISE', 'AGUARDANDO_AUDITORIA', 'PENDENCIA']);

      if (!teams || !sales) {
        setLoading(false);
        return;
      }

      // Group by team
      const statsMap: Record<string, TeamPendingSales> = {};
      
      teams.forEach((team) => {
        statsMap[team.id] = {
          team_id: team.id,
          team_name: team.name,
          pre_analise: 0,
          aguardando_auditoria: 0,
          pendencia: 0,
          total: 0,
        };
      });

      // Add "Sem Equipe" option
      statsMap['none'] = {
        team_id: 'none',
        team_name: 'Sem Equipe',
        pre_analise: 0,
        aguardando_auditoria: 0,
        pendencia: 0,
        total: 0,
      };

      sales.forEach((sale) => {
        const teamId = sale.equipe || 'none';
        if (statsMap[teamId]) {
          if (sale.status === 'PRE_ANALISE') {
            statsMap[teamId].pre_analise++;
          } else if (sale.status === 'AGUARDANDO_AUDITORIA') {
            statsMap[teamId].aguardando_auditoria++;
          } else if (sale.status === 'PENDENCIA') {
            statsMap[teamId].pendencia++;
          }
          statsMap[teamId].total++;
        }
      });

      // Filter out teams with no pending sales and sort by total
      const result = Object.values(statsMap)
        .filter((t) => t.total > 0)
        .sort((a, b) => b.total - a.total);

      setTeamStats(result);
      setLoading(false);
    };

    fetchData();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('pending-sales-by-team')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users2 className="h-5 w-5" />
            Pendências por Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPending = teamStats.reduce((acc, t) => acc + t.total, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users2 className="h-5 w-5" />
            Pendências por Equipe
          </CardTitle>
          <Badge variant="secondary" className="text-lg px-3">
            {totalPending}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {teamStats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Nenhuma venda pendente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {teamStats.map((team, index) => (
              <motion.div
                key={team.team_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  team.total > 10 ? "border-destructive/50 bg-destructive/5" : "border-border bg-muted/30"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    team.team_id === 'none' ? "bg-muted" : "bg-primary/10"
                  )}>
                    <Users2 className={cn(
                      "h-4 w-4",
                      team.team_id === 'none' ? "text-muted-foreground" : "text-primary"
                    )} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{team.team_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {team.total} pendente{team.total !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {team.pre_analise > 0 && (
                    <Badge variant="outline" className="gap-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30">
                      <FileSearch className="h-3 w-3" />
                      {team.pre_analise}
                    </Badge>
                  )}
                  {team.aguardando_auditoria > 0 && (
                    <Badge variant="outline" className="gap-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30">
                      <Clock className="h-3 w-3" />
                      {team.aguardando_auditoria}
                    </Badge>
                  )}
                  {team.pendencia > 0 && (
                    <Badge variant="outline" className="gap-1 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/30">
                      <AlertCircle className="h-3 w-3" />
                      {team.pendencia}
                    </Badge>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Legend */}
            <div className="flex flex-wrap gap-4 pt-3 border-t text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <FileSearch className="h-3 w-3 text-blue-500" />
                Pré-Análise
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-amber-500" />
                Aguard. Auditoria
              </div>
              <div className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-orange-500" />
                Pendência
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
