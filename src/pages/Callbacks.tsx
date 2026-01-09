import { useState, useEffect } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Phone, Clock, CheckCircle, XCircle, Bell, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format, isToday, isTomorrow, isPast, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { maskPhone } from '@/lib/masks';

interface Callback {
  id: string;
  sale_id: string | null;
  client_name: string;
  phone: string;
  scheduled_at: string;
  notes: string | null;
  status: string;
  seller_id: string;
  company_id: string;
  created_at: string;
  completed_at: string | null;
}

export default function Callbacks() {
  const { user, profile, isCEO, isBackoffice, isSeller } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [formData, setFormData] = useState({
    client_name: '',
    phone: '',
    scheduled_at: '',
    notes: '',
  });

  const { data: callbacks = [], isLoading } = useQuery({
    queryKey: ['callbacks', profile?.company_id, user?.id, isSeller],
    queryFn: async () => {
      let query = supabase.from('callbacks').select('*').order('scheduled_at', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      return data as Callback[];
    },
    enabled: !!profile?.company_id,
  });

  // Check for upcoming callbacks and show notifications
  useEffect(() => {
    const checkUpcomingCallbacks = () => {
      const pendingCallbacks = callbacks.filter((cb) => cb.status === 'pending');
      pendingCallbacks.forEach((callback) => {
        const minutesUntil = differenceInMinutes(new Date(callback.scheduled_at), new Date());
        if (minutesUntil > 0 && minutesUntil <= 5) {
          toast.info(`⏰ Retorno em ${minutesUntil} min: ${callback.client_name}`, {
            duration: 10000,
          });
        }
      });
    };

    const interval = setInterval(checkUpcomingCallbacks, 60000); // Check every minute
    checkUpcomingCallbacks(); // Check immediately

    return () => clearInterval(interval);
  }, [callbacks]);

  const createCallbackMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('callbacks').insert({
        client_name: data.client_name,
        phone: data.phone,
        scheduled_at: data.scheduled_at,
        notes: data.notes || null,
        seller_id: user?.id,
        company_id: profile?.company_id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callbacks'] });
      toast.success('Retorno agendado com sucesso!');
      setIsDialogOpen(false);
      setFormData({
        client_name: '',
        phone: '',
        scheduled_at: '',
        notes: '',
      });
    },
    onError: () => {
      toast.error('Erro ao agendar retorno');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: Record<string, unknown> = { status };
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase.from('callbacks').update(updateData).eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callbacks'] });
      toast.success('Status atualizado!');
    },
  });

  const getStatusBadge = (callback: Callback) => {
    switch (callback.status) {
      case 'completed':
        return <Badge className="bg-green-500">Concluído</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        const scheduledDate = new Date(callback.scheduled_at);
        if (isPast(scheduledDate)) {
          return <Badge variant="destructive">Atrasado</Badge>;
        }
        if (isToday(scheduledDate)) {
          return <Badge className="bg-amber-500">Hoje</Badge>;
        }
        if (isTomorrow(scheduledDate)) {
          return <Badge className="bg-blue-500">Amanhã</Badge>;
        }
        return <Badge variant="outline">Agendado</Badge>;
    }
  };

  const getTimeIndicator = (scheduledAt: string) => {
    const scheduledDate = new Date(scheduledAt);
    const minutes = differenceInMinutes(scheduledDate, new Date());

    if (minutes < 0) {
      return <span className="text-destructive font-medium">Atrasado</span>;
    }
    if (minutes <= 15) {
      return <span className="text-amber-500 font-medium">Em {minutes} min</span>;
    }
    return format(scheduledDate, "HH:mm", { locale: ptBR });
  };

  const filteredCallbacks = callbacks.filter((cb) => {
    if (activeTab === 'pending') return cb.status === 'pending';
    if (activeTab === 'completed') return cb.status === 'completed';
    if (activeTab === 'cancelled') return cb.status === 'cancelled';
    return true;
  });

  const todayCallbacks = callbacks.filter(
    (cb) => cb.status === 'pending' && isToday(new Date(cb.scheduled_at))
  );

  const overdueCallbacks = callbacks.filter(
    (cb) => cb.status === 'pending' && isPast(new Date(cb.scheduled_at))
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agendamento de Retorno</h1>
            <p className="text-muted-foreground">
              Agende callbacks e receba lembretes automáticos
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Agendar Retorno
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Agendar Novo Retorno</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createCallbackMutation.mutate(formData);
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="client_name">Nome do Cliente</Label>
                  <Input
                    id="client_name"
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    placeholder="Ex: João Silva"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: maskPhone(e.target.value) })
                    }
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduled_at">Data e Hora</Label>
                  <Input
                    id="scheduled_at"
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Anotações sobre o retorno..."
                  />
                </div>

                <Button type="submit" className="w-full" disabled={createCallbackMutation.isPending}>
                  {createCallbackMutation.isPending ? 'Agendando...' : 'Agendar Retorno'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Retornos Hoje</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayCallbacks.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {callbacks.filter((cb) => cb.status === 'pending').length}
              </div>
            </CardContent>
          </Card>

          <Card className={overdueCallbacks.length > 0 ? 'border-destructive' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
              <Bell className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${overdueCallbacks.length > 0 ? 'text-destructive' : ''}`}>
                {overdueCallbacks.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Callbacks Table */}
        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="pending">
                  Pendentes ({callbacks.filter((cb) => cb.status === 'pending').length})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Concluídos ({callbacks.filter((cb) => cb.status === 'completed').length})
                </TabsTrigger>
                <TabsTrigger value="cancelled">
                  Cancelados ({callbacks.filter((cb) => cb.status === 'cancelled').length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : filteredCallbacks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum retorno {activeTab === 'pending' ? 'pendente' : activeTab === 'completed' ? 'concluído' : 'cancelado'}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Agendado para</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Observações</TableHead>
                    {activeTab === 'pending' && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCallbacks.map((callback) => (
                    <TableRow key={callback.id}>
                      <TableCell className="font-medium">{callback.client_name}</TableCell>
                      <TableCell>
                        <a
                          href={`tel:${callback.phone.replace(/\D/g, '')}`}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {callback.phone}
                        </a>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>
                            {format(new Date(callback.scheduled_at), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                          <span className="text-sm">
                            {callback.status === 'pending' 
                              ? getTimeIndicator(callback.scheduled_at)
                              : format(new Date(callback.scheduled_at), "HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(callback)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {callback.notes || '-'}
                      </TableCell>
                      {activeTab === 'pending' && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateStatusMutation.mutate({ id: callback.id, status: 'completed' })
                              }
                            >
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateStatusMutation.mutate({ id: callback.id, status: 'cancelled' })
                              }
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
