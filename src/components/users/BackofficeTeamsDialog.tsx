import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Users, ClipboardCheck } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Team {
  id: string;
  name: string;
}

interface BackofficeTeamsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backofficeId: string;
  backofficeName: string;
  onTeamsUpdated: () => void;
}

export const BackofficeTeamsDialog = ({
  open,
  onOpenChange,
  backofficeId,
  backofficeName,
  onTeamsUpdated,
}: BackofficeTeamsDialogProps) => {
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  useEffect(() => {
    if (open && backofficeId) {
      fetchData();
    }
  }, [open, backofficeId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch all teams in the company
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);

      // Fetch current backoffice team assignments
      const { data: assignedTeams, error: assignedError } = await supabase
        .from('backoffice_teams')
        .select('team_id')
        .eq('backoffice_id', backofficeId);

      if (assignedError) throw assignedError;
      setSelectedTeamIds(assignedTeams?.map(t => t.team_id) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTeam = (teamId: string) => {
    setSelectedTeamIds(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleSave = async () => {
    if (!profile?.company_id) {
      toast.error('Empresa não encontrada');
      return;
    }

    setIsSaving(true);
    try {
      // Delete all existing assignments for this backoffice
      const { error: deleteError } = await supabase
        .from('backoffice_teams')
        .delete()
        .eq('backoffice_id', backofficeId);

      if (deleteError) throw deleteError;

      // Insert new assignments
      if (selectedTeamIds.length > 0) {
        const insertData = selectedTeamIds.map(teamId => ({
          backoffice_id: backofficeId,
          team_id: teamId,
          company_id: profile.company_id,
        }));

        const { error: insertError } = await supabase
          .from('backoffice_teams')
          .insert(insertData);

        if (insertError) throw insertError;
      }

      toast.success(`Equipes de ${backofficeName} atualizadas!`);
      onOpenChange(false);
      onTeamsUpdated();
    } catch (error) {
      console.error('Error saving backoffice teams:', error);
      toast.error('Erro ao salvar equipes do qualidade');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Gerenciar Equipes do Qualidade
          </DialogTitle>
          <DialogDescription>
            Selecione quais equipes <strong>{backofficeName}</strong> terá acesso
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Nenhuma equipe encontrada</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[300px] pr-4">
            <div className="space-y-3">
              {teams.map(team => (
                <div
                  key={team.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={`team-${team.id}`}
                    checked={selectedTeamIds.includes(team.id)}
                    onCheckedChange={() => handleToggleTeam(team.id)}
                  />
                  <Label
                    htmlFor={`team-${team.id}`}
                    className="flex-1 cursor-pointer font-medium"
                  >
                    {team.name}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
