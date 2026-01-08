import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Megaphone, Plus, Trash2, Users, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Team {
  id: string;
  name: string;
}

interface Broadcast {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  team_id: string | null;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baixa', color: 'bg-muted' },
  { value: 'normal', label: 'Normal', color: 'bg-primary' },
  { value: 'high', label: 'Alta', color: 'bg-yellow-500' },
  { value: 'urgent', label: 'Urgente', color: 'bg-destructive' },
];

export function BroadcastManager() {
  const { profile, isCEO, isBackoffice } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'normal',
    team_id: 'all',
  });

  useEffect(() => {
    fetchBroadcasts();
    fetchTeams();
  }, []);

  const fetchBroadcasts = async () => {
    const { data, error } = await supabase
      .from('broadcasts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setBroadcasts(data as Broadcast[]);
    }
  };

  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from('teams')
      .select('id, name');

    if (!error && data) {
      setTeams(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.company_id) {
      toast.error('Empresa não encontrada');
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('broadcasts')
      .insert({
        company_id: profile.company_id,
        team_id: formData.team_id === 'all' ? null : formData.team_id,
        sender_id: profile.id,
        sender_name: profile.nome,
        title: formData.title,
        message: formData.message,
        priority: formData.priority,
      });

    if (error) {
      console.error('Error creating broadcast:', error);
      toast.error('Erro ao enviar aviso');
    } else {
      toast.success('Aviso enviado para a equipe!');
      setFormData({ title: '', message: '', priority: 'normal', team_id: 'all' });
      setOpen(false);
      fetchBroadcasts();
    }

    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('broadcasts')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir aviso');
    } else {
      toast.success('Aviso excluído');
      fetchBroadcasts();
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('broadcasts')
      .update({ is_active: !isActive })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar aviso');
    } else {
      toast.success(isActive ? 'Aviso desativado' : 'Aviso ativado');
      fetchBroadcasts();
    }
  };

  if (!isCEO && !isBackoffice) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Avisos da Equipe
          </CardTitle>
          <CardDescription>Envie comunicados importantes para sua equipe</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Aviso
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Enviar Aviso
              </DialogTitle>
              <DialogDescription>
                Envie um aviso que aparecerá em tempo real para a equipe
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  placeholder="Ex: Reunião às 15h"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mensagem</Label>
                <Textarea
                  id="message"
                  placeholder="Descreva o aviso..."
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${opt.color}`} />
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Destinatários</Label>
                  <Select
                    value={formData.team_id}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, team_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Toda empresa
                        </div>
                      </SelectItem>
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {team.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar Aviso'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {broadcasts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum aviso enviado ainda
          </p>
        ) : (
          <div className="space-y-3">
            {broadcasts.slice(0, 5).map((broadcast) => (
              <div
                key={broadcast.id}
                className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{broadcast.title}</p>
                    <Badge variant={broadcast.is_active ? 'default' : 'secondary'} className="text-xs">
                      {broadcast.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {PRIORITY_OPTIONS.find(p => p.value === broadcast.priority)?.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {broadcast.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(broadcast.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(broadcast.id, broadcast.is_active)}
                  >
                    {broadcast.is_active ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(broadcast.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
