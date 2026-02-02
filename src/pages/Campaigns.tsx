import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Target, Calendar, TrendingUp, Pause, Play, CheckCircle, Trophy, Users, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  target_value: number;
  target_sales: number;
  status: string;
  company_id: string;
  created_by: string;
  created_at: string;
}

export default function Campaigns() {
  const { user, profile, isCEO, isBackoffice } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [editSelectedTeams, setEditSelectedTeams] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    target_value: '',
    target_sales: '',
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    target_value: '',
    target_sales: '',
  });

  const canManage = isCEO || isBackoffice;

  const { data: campaigns = [], isLoading } = useQuery({
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

  // Fetch sales linked to campaigns with seller info
  const { data: salesData } = useQuery({
    queryKey: ['campaign-sales', profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('id, valor_mensal, campaign_id, status, seller_id')
        .not('campaign_id', 'is', null)
        .in('status', ['VENDA_AUDITADA', 'INSTALACAO_MARCADA', 'INSTALADA']);

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  // Fetch profiles for seller names
  const { data: profiles } = useQuery({
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

  // Fetch teams for campaign assignment
  const { data: teams = [] } = useQuery({
    queryKey: ['teams', profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  // Fetch campaign teams
  const { data: campaignTeams = [] } = useQuery({
    queryKey: ['campaign-teams', profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_teams')
        .select('campaign_id, team_id, teams(name)');

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  const [selectedCampaignRanking, setSelectedCampaignRanking] = useState<string | null>(null);

  const createCampaignMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Create campaign
      const { data: newCampaign, error } = await supabase.from('sales_campaigns').insert({
        name: data.name,
        description: data.description || null,
        start_date: data.start_date,
        end_date: data.end_date,
        target_value: parseFloat(data.target_value) || 0,
        target_sales: parseInt(data.target_sales) || 0,
        company_id: profile?.company_id,
        created_by: user?.id,
      }).select('id').single();

      if (error) throw error;

      // Insert team associations if any teams selected
      if (selectedTeams.length > 0 && newCampaign) {
        const teamInserts = selectedTeams.map(teamId => ({
          campaign_id: newCampaign.id,
          team_id: teamId,
          company_id: profile?.company_id!,
        }));

        const { error: teamError } = await supabase
          .from('campaign_teams')
          .insert(teamInserts);

        if (teamError) throw teamError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-teams'] });
      toast.success('Campanha criada com sucesso!');
      setIsDialogOpen(false);
      setSelectedTeams([]);
      setFormData({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        target_value: '',
        target_sales: '',
      });
    },
    onError: () => {
      toast.error('Erro ao criar campanha');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('sales_campaigns')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Status atualizado!');
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: async (data: typeof editFormData & { id: string }) => {
      // Update campaign
      const { error } = await supabase
        .from('sales_campaigns')
        .update({
          name: data.name,
          description: data.description || null,
          start_date: data.start_date,
          end_date: data.end_date,
          target_value: parseFloat(data.target_value) || 0,
          target_sales: parseInt(data.target_sales) || 0,
        })
        .eq('id', data.id);

      if (error) throw error;

      // Delete existing team associations
      await supabase
        .from('campaign_teams')
        .delete()
        .eq('campaign_id', data.id);

      // Insert new team associations if any teams selected
      if (editSelectedTeams.length > 0) {
        const teamInserts = editSelectedTeams.map(teamId => ({
          campaign_id: data.id,
          team_id: teamId,
          company_id: profile?.company_id!,
        }));

        const { error: teamError } = await supabase
          .from('campaign_teams')
          .insert(teamInserts);

        if (teamError) throw teamError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-teams'] });
      toast.success('Campanha atualizada com sucesso!');
      setIsEditDialogOpen(false);
      setEditingCampaign(null);
      setEditSelectedTeams([]);
    },
    onError: () => {
      toast.error('Erro ao atualizar campanha');
    },
  });

  const handleOpenEditDialog = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setEditFormData({
      name: campaign.name,
      description: campaign.description || '',
      start_date: campaign.start_date,
      end_date: campaign.end_date,
      target_value: campaign.target_value.toString(),
      target_sales: campaign.target_sales.toString(),
    });
    // Get current teams for this campaign
    const currentTeams = campaignTeams
      .filter(ct => ct.campaign_id === campaign.id)
      .map(ct => ct.team_id);
    setEditSelectedTeams(currentTeams);
    setIsEditDialogOpen(true);
  };

  const getCampaignProgress = (campaign: Campaign) => {
    if (!salesData) return { salesCount: 0, totalValue: 0 };

    // Filter sales by campaign_id instead of date range
    const campaignSales = salesData.filter((sale) => sale.campaign_id === campaign.id);

    return {
      salesCount: campaignSales.length,
      totalValue: campaignSales.reduce((acc, sale) => acc + (sale.valor_mensal || 0), 0),
    };
  };

  // Get seller ranking for a campaign
  const getCampaignRanking = (campaignId: string) => {
    if (!salesData || !profiles) return [];

    const campaignSales = salesData.filter((sale) => sale.campaign_id === campaignId);
    
    // Group by seller
    const sellerStats: Record<string, { salesCount: number; totalValue: number }> = {};
    
    campaignSales.forEach((sale) => {
      if (!sale.seller_id) return;
      if (!sellerStats[sale.seller_id]) {
        sellerStats[sale.seller_id] = { salesCount: 0, totalValue: 0 };
      }
      sellerStats[sale.seller_id].salesCount += 1;
      sellerStats[sale.seller_id].totalValue += sale.valor_mensal || 0;
    });

    // Convert to array with profile info and sort
    return Object.entries(sellerStats)
      .map(([sellerId, stats]) => {
        const sellerProfile = profiles.find((p) => p.id === sellerId);
        return {
          sellerId,
          nome: sellerProfile?.nome || 'Desconhecido',
          avatar_url: sellerProfile?.avatar_url,
          ...stats,
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue);
  };

  const getStatusBadge = (campaign: Campaign) => {
    const today = new Date();
    const startDate = new Date(campaign.start_date);
    const endDate = new Date(campaign.end_date);

    if (campaign.status === 'paused') {
      return <Badge variant="secondary">Pausada</Badge>;
    }
    if (campaign.status === 'completed') {
      return <Badge className="bg-green-500">Concluída</Badge>;
    }
    if (isBefore(today, startDate)) {
      return <Badge variant="outline">Agendada</Badge>;
    }
    if (isAfter(today, endDate)) {
      return <Badge variant="destructive">Encerrada</Badge>;
    }
    return <Badge className="bg-blue-500">Ativa</Badge>;
  };

  const getDaysRemaining = (endDate: string) => {
    const days = differenceInDays(new Date(endDate), new Date());
    if (days < 0) return 'Encerrada';
    if (days === 0) return 'Último dia';
    return `${days} dias restantes`;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Campanhas de Vendas</h1>
            <p className="text-muted-foreground">
              Crie e acompanhe campanhas específicas com metas e prazos
            </p>
          </div>

          {canManage && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Campanha
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Criar Nova Campanha</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    createCampaignMutation.mutate(formData);
                  }}
                  className="space-y-4 pb-2"
                >
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Campanha</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Black Friday 2024"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descrição da campanha..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Data Início</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_date">Data Fim</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="target_sales">Meta de Vendas</Label>
                      <Input
                        id="target_sales"
                        type="number"
                        value={formData.target_sales}
                        onChange={(e) => setFormData({ ...formData, target_sales: e.target.value })}
                        placeholder="Ex: 50"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="target_value">Meta de Valor (R$)</Label>
                      <Input
                        id="target_value"
                        type="number"
                        step="0.01"
                        value={formData.target_value}
                        onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                        placeholder="Ex: 50000"
                        required
                      />
                    </div>
                  </div>

                  {/* Team Selection */}
                  {teams.length > 0 && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Equipes Participantes
                      </Label>
                      <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                        {teams.map((team) => (
                          <div key={team.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`team-${team.id}`}
                              checked={selectedTeams.includes(team.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedTeams([...selectedTeams, team.id]);
                                } else {
                                  setSelectedTeams(selectedTeams.filter((id) => id !== team.id));
                                }
                              }}
                            />
                            <label
                              htmlFor={`team-${team.id}`}
                              className="text-sm cursor-pointer"
                            >
                              {team.name}
                            </label>
                          </div>
                        ))}
                      </div>
                      {selectedTeams.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Nenhuma equipe selecionada = todas as equipes participam
                        </p>
                      )}
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={createCampaignMutation.isPending}>
                    {createCampaignMutation.isPending ? 'Criando...' : 'Criar Campanha'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {/* Edit Campaign Dialog */}
          {canManage && (
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Editar Campanha</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (editingCampaign) {
                      updateCampaignMutation.mutate({
                        ...editFormData,
                        id: editingCampaign.id,
                      });
                    }
                  }}
                  className="space-y-4 pb-2"
                >
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Nome da Campanha</Label>
                    <Input
                      id="edit-name"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      placeholder="Ex: Black Friday 2024"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Descrição</Label>
                    <Textarea
                      id="edit-description"
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      placeholder="Descrição da campanha..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-start_date">Data Início</Label>
                      <Input
                        id="edit-start_date"
                        type="date"
                        value={editFormData.start_date}
                        onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-end_date">Data Fim</Label>
                      <Input
                        id="edit-end_date"
                        type="date"
                        value={editFormData.end_date}
                        onChange={(e) => setEditFormData({ ...editFormData, end_date: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-target_sales">Meta de Vendas</Label>
                      <Input
                        id="edit-target_sales"
                        type="number"
                        value={editFormData.target_sales}
                        onChange={(e) => setEditFormData({ ...editFormData, target_sales: e.target.value })}
                        placeholder="Ex: 50"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-target_value">Meta de Valor (R$)</Label>
                      <Input
                        id="edit-target_value"
                        type="number"
                        step="0.01"
                        value={editFormData.target_value}
                        onChange={(e) => setEditFormData({ ...editFormData, target_value: e.target.value })}
                        placeholder="Ex: 50000"
                        required
                      />
                    </div>
                  </div>

                  {/* Team Selection */}
                  {teams.length > 0 && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Equipes Participantes
                      </Label>
                      <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                        {teams.map((team) => (
                          <div key={team.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`edit-team-${team.id}`}
                              checked={editSelectedTeams.includes(team.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setEditSelectedTeams([...editSelectedTeams, team.id]);
                                } else {
                                  setEditSelectedTeams(editSelectedTeams.filter((id) => id !== team.id));
                                }
                              }}
                            />
                            <label
                              htmlFor={`edit-team-${team.id}`}
                              className="text-sm cursor-pointer"
                            >
                              {team.name}
                            </label>
                          </div>
                        ))}
                      </div>
                      {editSelectedTeams.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Nenhuma equipe selecionada = todas as equipes participam
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setIsEditDialogOpen(false);
                        setEditingCampaign(null);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1" disabled={updateCampaignMutation.isPending}>
                      {updateCampaignMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-24 bg-muted" />
                <CardContent className="h-32" />
              </Card>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <Card className="py-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma campanha ainda</h3>
              <p className="text-muted-foreground mb-4">
                Crie sua primeira campanha para acompanhar metas específicas
              </p>
              {canManage && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Campanha
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => {
              const progress = getCampaignProgress(campaign);
              const salesProgress = campaign.target_sales > 0
                ? Math.min((progress.salesCount / campaign.target_sales) * 100, 100)
                : 0;
              const valueProgress = campaign.target_value > 0
                ? Math.min((progress.totalValue / campaign.target_value) * 100, 100)
                : 0;

              return (
                <Card key={campaign.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{campaign.name}</CardTitle>
                        {canManage && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => handleOpenEditDialog(campaign)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      {getStatusBadge(campaign)}
                    </div>
                    {campaign.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {campaign.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Teams badges */}
                    {(() => {
                      const campaignTeamsList = campaignTeams
                        .filter((ct) => ct.campaign_id === campaign.id)
                        .map((ct) => (ct as any).teams?.name)
                        .filter(Boolean);
                      
                      if (campaignTeamsList.length > 0) {
                        return (
                          <div className="flex flex-wrap gap-1">
                            <Users className="h-3 w-3 text-muted-foreground mt-0.5" />
                            {campaignTeamsList.map((teamName, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {teamName}
                              </Badge>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(campaign.start_date), 'dd/MM', { locale: ptBR })} -{' '}
                        {format(new Date(campaign.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>

                    <div className="text-xs font-medium text-muted-foreground">
                      {getDaysRemaining(campaign.end_date)}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Vendas</span>
                          <span className="font-medium">
                            {progress.salesCount} / {campaign.target_sales}
                          </span>
                        </div>
                        <Progress value={salesProgress} className="h-2" />
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Valor</span>
                          <span className="font-medium">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(progress.totalValue)}{' '}
                            /{' '}
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(campaign.target_value)}
                          </span>
                        </div>
                        <Progress value={valueProgress} className="h-2" />
                      </div>
                    </div>

                    {/* Ranking Button */}
                    {progress.salesCount > 0 && (
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button size="sm" variant="ghost" className="w-full">
                            <Trophy className="mr-2 h-4 w-4 text-amber-500" />
                            Ver Ranking
                          </Button>
                        </SheetTrigger>
                        <SheetContent>
                          <SheetHeader>
                            <SheetTitle className="flex items-center gap-2">
                              <Trophy className="h-5 w-5 text-amber-500" />
                              Ranking - {campaign.name}
                            </SheetTitle>
                          </SheetHeader>
                          <div className="mt-6 space-y-3">
                            {getCampaignRanking(campaign.id).map((seller, index) => (
                              <div
                                key={seller.sellerId}
                                className={`flex items-center gap-3 p-3 rounded-lg ${
                                  index === 0
                                    ? 'bg-amber-500/10 border border-amber-500/30'
                                    : index === 1
                                    ? 'bg-slate-400/10 border border-slate-400/30'
                                    : index === 2
                                    ? 'bg-orange-600/10 border border-orange-600/30'
                                    : 'bg-muted/50'
                                }`}
                              >
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background font-bold text-sm">
                                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                </div>
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={seller.avatar_url || ''} />
                                  <AvatarFallback>
                                    {seller.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{seller.nome}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {seller.salesCount} vendas
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-primary">
                                    {new Intl.NumberFormat('pt-BR', {
                                      style: 'currency',
                                      currency: 'BRL',
                                    }).format(seller.totalValue)}
                                  </p>
                                </div>
                              </div>
                            ))}
                            {getCampaignRanking(campaign.id).length === 0 && (
                              <div className="text-center py-8 text-muted-foreground">
                                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>Nenhuma venda nesta campanha ainda</p>
                              </div>
                            )}
                          </div>
                        </SheetContent>
                      </Sheet>
                    )}

                    {canManage && campaign.status !== 'completed' && (
                      <div className="flex gap-2 pt-2">
                        {campaign.status === 'paused' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() =>
                              updateStatusMutation.mutate({ id: campaign.id, status: 'active' })
                            }
                          >
                            <Play className="mr-1 h-3 w-3" />
                            Retomar
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() =>
                              updateStatusMutation.mutate({ id: campaign.id, status: 'paused' })
                            }
                          >
                            <Pause className="mr-1 h-3 w-3" />
                            Pausar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() =>
                            updateStatusMutation.mutate({ id: campaign.id, status: 'completed' })
                          }
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Concluir
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
