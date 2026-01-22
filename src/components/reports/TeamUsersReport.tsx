import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserCheck, Shield, Briefcase, AlertCircle } from 'lucide-react';
import { AppRole, ROLE_LABELS } from '@/types/database';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  nome: string;
  email: string;
  avatar_url: string | null;
  role: AppRole | null;
  active: boolean;
}

interface TeamData {
  id: string;
  name: string;
  description: string | null;
  supervisor_name: string | null;
  members: TeamMember[];
}

interface UnassignedUser {
  id: string;
  nome: string;
  email: string;
  avatar_url: string | null;
  role: AppRole | null;
  active: boolean;
}

const ROLE_COLORS: Record<AppRole, string> = {
  CEO: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  SUPERVISOR: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  BACKOFFICE: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  SELLER: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
};

const ROLE_ICONS: Record<AppRole, React.ReactNode> = {
  CEO: <Shield className="h-3 w-3" />,
  SUPERVISOR: <Briefcase className="h-3 w-3" />,
  BACKOFFICE: <UserCheck className="h-3 w-3" />,
  SELLER: <Users className="h-3 w-3" />,
};

export function TeamUsersReport() {
  const { isCEO, isSupervisor, profile } = useAuth();
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [unassignedUsers, setUnassignedUsers] = useState<UnassignedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTeams: 0,
    usersWithoutTeam: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, description, supervisor_id')
        .order('name');

      if (teamsError) throw teamsError;

      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nome, email, avatar_url, team_id, active')
        .order('nome');

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Create roles map
      const rolesMap: Record<string, AppRole> = {};
      rolesData?.forEach((r) => {
        rolesMap[r.user_id] = r.role as AppRole;
      });

      // Process teams with members
      const processedTeams: TeamData[] = (teamsData || []).map((team) => {
        const teamMembers = (profilesData || [])
          .filter((p) => p.team_id === team.id)
          .map((p) => ({
            id: p.id,
            nome: p.nome,
            email: p.email,
            avatar_url: p.avatar_url,
            role: rolesMap[p.id] || null,
            active: p.active ?? true,
          }));

        const supervisor = profilesData?.find((p) => p.id === team.supervisor_id);

        return {
          id: team.id,
          name: team.name,
          description: team.description,
          supervisor_name: supervisor?.nome || null,
          members: teamMembers,
        };
      });

      // Find users without team
      const usersWithoutTeam = (profilesData || [])
        .filter((p) => !p.team_id)
        .map((p) => ({
          id: p.id,
          nome: p.nome,
          email: p.email,
          avatar_url: p.avatar_url,
          role: rolesMap[p.id] || null,
          active: p.active ?? true,
        }));

      setTeams(processedTeams);
      setUnassignedUsers(usersWithoutTeam);
      setStats({
        totalUsers: profilesData?.length || 0,
        totalTeams: teamsData?.length || 0,
        usersWithoutTeam: usersWithoutTeam.length,
      });
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role: AppRole | null) => {
    if (!role) {
      return (
        <Badge variant="outline" className="text-muted-foreground gap-1 text-xs">
          <AlertCircle className="h-3 w-3" />
          Sem função
        </Badge>
      );
    }

    return (
      <Badge 
        variant="outline" 
        className={cn('gap-1 text-xs border', ROLE_COLORS[role])}
      >
        {ROLE_ICONS[role]}
        {ROLE_LABELS[role]}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Usuários</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-500/10 p-3">
                <Briefcase className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Equipes</p>
                <p className="text-2xl font-bold">{stats.totalTeams}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={cn(
                "rounded-full p-3",
                stats.usersWithoutTeam > 0 ? "bg-amber-500/10" : "bg-emerald-500/10"
              )}>
                <AlertCircle className={cn(
                  "h-6 w-6",
                  stats.usersWithoutTeam > 0 ? "text-amber-600" : "text-emerald-600"
                )} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sem Equipe</p>
                <p className="text-2xl font-bold">{stats.usersWithoutTeam}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teams Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <Card key={team.id} className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{team.name}</CardTitle>
                <Badge variant="secondary">{team.members.length} membros</Badge>
              </div>
              {team.supervisor_name && (
                <p className="text-sm text-muted-foreground">
                  Supervisor: <span className="font-medium">{team.supervisor_name}</span>
                </p>
              )}
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                {team.members.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum membro na equipe
                  </p>
                ) : (
                  <div className="space-y-3">
                    {team.members.map((member) => (
                      <div
                        key={member.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg transition-colors",
                          member.active ? "hover:bg-muted/50" : "opacity-50"
                        )}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(member.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {member.nome}
                            {!member.active && (
                              <span className="text-muted-foreground ml-1">(inativo)</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.email}
                          </p>
                        </div>
                        {getRoleBadge(member.role)}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        ))}

        {/* Unassigned Users Card */}
        {unassignedUsers.length > 0 && (
          <Card className="shadow-card border-amber-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  Sem Equipe
                </CardTitle>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                  {unassignedUsers.length} usuários
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Usuários que ainda não foram atribuídos a uma equipe
              </p>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-3">
                  {unassignedUsers.map((user) => (
                    <div
                      key={user.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg transition-colors",
                        user.active ? "hover:bg-muted/50" : "opacity-50"
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(user.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.nome}
                          {!user.active && (
                            <span className="text-muted-foreground ml-1">(inativo)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                      {getRoleBadge(user.role)}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {teams.length === 0 && unassignedUsers.length === 0 && (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Nenhuma equipe encontrada
            </p>
            <p className="text-sm text-muted-foreground">
              Crie equipes para organizar seus usuários
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
