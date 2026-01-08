import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, MessageSquare, Users, Filter, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Profile, Team } from '@/types/database';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_name: string;
  message: string;
  created_at: string;
  read_at: string | null;
  company_id: string;
}

interface TeamMessage {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  message: string;
  created_at: string;
  company_id: string;
}

interface Conversation {
  oderId: string;
  odérName: string;
  odérAvatar?: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
  odérTeamId?: string;
}

export default function ChatMonitor() {
  const { isCEO } = useAuth();
  const navigate = useNavigate();
  
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [teamMessages, setTeamMessages] = useState<TeamMessage[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [conversations, setConversations] = useState<Map<string, DirectMessage[]>>(new Map());
  
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isCEO) {
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [isCEO, navigate]);

  const fetchData = async () => {
    try {
      const [messagesRes, teamMsgsRes, profilesRes, teamsRes] = await Promise.all([
        supabase.from('direct_messages').select('*').order('created_at', { ascending: false }),
        supabase.from('team_messages').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*'),
        supabase.from('teams').select('*'),
      ]);

      if (messagesRes.data) setDirectMessages(messagesRes.data);
      if (teamMsgsRes.data) setTeamMessages(teamMsgsRes.data);
      if (profilesRes.data) setProfiles(profilesRes.data);
      if (teamsRes.data) setTeams(teamsRes.data as Team[]);

      // Group direct messages by conversation
      if (messagesRes.data) {
        const convMap = new Map<string, DirectMessage[]>();
        messagesRes.data.forEach((msg) => {
          const key = [msg.sender_id, msg.receiver_id].sort().join('-');
          if (!convMap.has(key)) {
            convMap.set(key, []);
          }
          convMap.get(key)!.push(msg);
        });
        setConversations(convMap);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProfile = (userId: string) => profiles.find(p => p.id === userId);
  
  const getTeam = (teamId: string) => teams.find(t => t.id === teamId);

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  // Filter profiles based on selected team
  const filteredProfiles = profiles.filter(p => {
    if (selectedTeam === 'all') return true;
    return p.team_id === selectedTeam;
  });

  // Get conversation list with filters
  const getFilteredConversations = () => {
    const result: { key: string; participants: string[]; messages: DirectMessage[]; lastMessage: DirectMessage }[] = [];
    
    conversations.forEach((msgs, key) => {
      const participants = key.split('-');
      const lastMessage = msgs[0];
      
      // Apply filters
      if (selectedTeam !== 'all') {
        const p1 = getProfile(participants[0]);
        const p2 = getProfile(participants[1]);
        if (p1?.team_id !== selectedTeam && p2?.team_id !== selectedTeam) return;
      }
      
      if (selectedUser !== 'all') {
        if (!participants.includes(selectedUser)) return;
      }
      
      if (searchTerm) {
        const hasMatch = msgs.some(m => 
          m.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.sender_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (!hasMatch) return;
      }
      
      result.push({ key, participants, messages: msgs, lastMessage });
    });
    
    return result.sort((a, b) => 
      new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
    );
  };

  // Filter team messages
  const getFilteredTeamMessages = () => {
    return teamMessages.filter(msg => {
      if (selectedUser !== 'all' && msg.user_id !== selectedUser) return false;
      if (searchTerm && !msg.message.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  };

  const selectedConvMessages = selectedConversation 
    ? conversations.get(selectedConversation) || []
    : [];

  // Export functions
  const exportDirectMessagesToExcel = () => {
    const filteredConvs = getFilteredConversations();
    const allMessages: DirectMessage[] = [];
    
    filteredConvs.forEach(({ messages }) => {
      allMessages.push(...messages);
    });

    if (allMessages.length === 0) {
      toast.error('Nenhuma mensagem para exportar');
      return;
    }

    const data = allMessages.map(msg => {
      const sender = getProfile(msg.sender_id);
      const receiver = getProfile(msg.receiver_id);
      return {
        'Data/Hora': formatDate(msg.created_at),
        'Remetente': msg.sender_name,
        'Equipe Remetente': sender?.team_id ? getTeam(sender.team_id)?.name || '-' : '-',
        'Destinatário': receiver?.nome || '-',
        'Equipe Destinatário': receiver?.team_id ? getTeam(receiver.team_id)?.name || '-' : '-',
        'Mensagem': msg.message,
        'Status': msg.read_at ? 'Lida' : 'Não lida',
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 18 },
      { wch: 25 },
      { wch: 20 },
      { wch: 25 },
      { wch: 20 },
      { wch: 60 },
      { wch: 10 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mensagens Diretas');
    XLSX.writeFile(wb, `chat-direto-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Exportado com sucesso!');
  };

  const exportTeamMessagesToExcel = () => {
    const messages = getFilteredTeamMessages();

    if (messages.length === 0) {
      toast.error('Nenhuma mensagem para exportar');
      return;
    }

    const data = messages.map(msg => {
      const sender = getProfile(msg.user_id);
      return {
        'Data/Hora': formatDate(msg.created_at),
        'Usuário': msg.user_name,
        'Cargo': msg.user_role,
        'Equipe': sender?.team_id ? getTeam(sender.team_id)?.name || '-' : '-',
        'Mensagem': msg.message,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 18 },
      { wch: 25 },
      { wch: 15 },
      { wch: 20 },
      { wch: 60 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Chat de Equipe');
    XLSX.writeFile(wb, `chat-equipe-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Exportado com sucesso!');
  };

  const exportDirectMessagesToPDF = () => {
    const filteredConvs = getFilteredConversations();
    const allMessages: DirectMessage[] = [];
    
    filteredConvs.forEach(({ messages }) => {
      allMessages.push(...messages);
    });

    if (allMessages.length === 0) {
      toast.error('Nenhuma mensagem para exportar');
      return;
    }

    const doc = new jsPDF('landscape');
    
    doc.setFontSize(18);
    doc.text('Relatório de Mensagens Diretas', 14, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 14, 28);
    doc.text(`Total de mensagens: ${allMessages.length}`, 14, 34);
    
    if (selectedTeam !== 'all') {
      const team = getTeam(selectedTeam);
      doc.text(`Filtro: Equipe ${team?.name}`, 14, 40);
    }

    const tableData = allMessages.slice(0, 100).map(msg => {
      const receiver = getProfile(msg.receiver_id);
      return [
        format(new Date(msg.created_at), 'dd/MM HH:mm'),
        msg.sender_name.substring(0, 20),
        receiver?.nome?.substring(0, 20) || '-',
        msg.message.substring(0, 50) + (msg.message.length > 50 ? '...' : ''),
        msg.read_at ? 'Lida' : 'Não lida',
      ];
    });

    autoTable(doc, {
      startY: selectedTeam !== 'all' ? 46 : 40,
      head: [['Data', 'Remetente', 'Destinatário', 'Mensagem', 'Status']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [139, 92, 246] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 40 },
        2: { cellWidth: 40 },
        3: { cellWidth: 120 },
        4: { cellWidth: 25 },
      },
    });

    if (allMessages.length > 100) {
      doc.setFontSize(8);
      doc.text(`* Exibindo apenas as primeiras 100 mensagens de ${allMessages.length} total`, 14, doc.internal.pageSize.height - 10);
    }
    
    doc.save(`chat-direto-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('Exportado com sucesso!');
  };

  const exportTeamMessagesToPDF = () => {
    const messages = getFilteredTeamMessages();

    if (messages.length === 0) {
      toast.error('Nenhuma mensagem para exportar');
      return;
    }

    const doc = new jsPDF('landscape');
    
    doc.setFontSize(18);
    doc.text('Relatório de Chat de Equipe', 14, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 14, 28);
    doc.text(`Total de mensagens: ${messages.length}`, 14, 34);

    const tableData = messages.slice(0, 100).map(msg => [
      format(new Date(msg.created_at), 'dd/MM HH:mm'),
      msg.user_name.substring(0, 20),
      msg.user_role,
      msg.message.substring(0, 60) + (msg.message.length > 60 ? '...' : ''),
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Data', 'Usuário', 'Cargo', 'Mensagem']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [139, 92, 246] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 45 },
        2: { cellWidth: 30 },
        3: { cellWidth: 150 },
      },
    });

    if (messages.length > 100) {
      doc.setFontSize(8);
      doc.text(`* Exibindo apenas as primeiras 100 mensagens de ${messages.length} total`, 14, doc.internal.pageSize.height - 10);
    }
    
    doc.save(`chat-equipe-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('Exportado com sucesso!');
  };

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
            <h1 className="text-2xl font-bold">Monitor de Chats</h1>
            <p className="text-muted-foreground">Visualize todas as conversas da empresa</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar mensagens..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por equipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as equipes</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {filteredProfiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>{profile.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="direct" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="direct" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Mensagens Diretas
              </TabsTrigger>
              <TabsTrigger value="team" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Chat de Equipe
              </TabsTrigger>
            </TabsList>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportDirectMessagesToExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Mensagens Diretas (Excel)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportDirectMessagesToPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Mensagens Diretas (PDF)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportTeamMessagesToExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Chat de Equipe (Excel)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportTeamMessagesToPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Chat de Equipe (PDF)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <TabsContent value="direct" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Conversations List */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    Conversas ({getFilteredConversations().length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    {getFilteredConversations().length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        Nenhuma conversa encontrada
                      </div>
                    ) : (
                      getFilteredConversations().map(({ key, participants, lastMessage }) => {
                        const p1 = getProfile(participants[0]);
                        const p2 = getProfile(participants[1]);
                        const isSelected = selectedConversation === key;
                        
                        return (
                          <div
                            key={key}
                            onClick={() => setSelectedConversation(key)}
                            className={`p-3 border-b cursor-pointer transition-colors hover:bg-muted/50 ${
                              isSelected ? 'bg-muted' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex -space-x-2">
                                <Avatar className="h-8 w-8 border-2 border-background">
                                  <AvatarImage src={p1?.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {getInitials(p1?.nome || '')}
                                  </AvatarFallback>
                                </Avatar>
                                <Avatar className="h-8 w-8 border-2 border-background">
                                  <AvatarImage src={p2?.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {getInitials(p2?.nome || '')}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium truncate">
                                    {p1?.nome?.split(' ')[0]} ↔ {p2?.nome?.split(' ')[0]}
                                  </p>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(lastMessage.created_at), 'HH:mm')}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {lastMessage.message}
                                </p>
                                <div className="flex gap-1 mt-1">
                                  {p1?.team_id && (
                                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                                      {getTeam(p1.team_id)?.name}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Messages View */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    {selectedConversation ? 'Mensagens' : 'Selecione uma conversa'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    {!selectedConversation ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                          <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Selecione uma conversa para ver as mensagens</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {[...selectedConvMessages].reverse().map((msg) => {
                          const sender = getProfile(msg.sender_id);
                          return (
                            <div key={msg.id} className="flex gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={sender?.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(sender?.nome || msg.sender_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{msg.sender_name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(msg.created_at)}
                                  </span>
                                  {!msg.read_at && (
                                    <Badge variant="secondary" className="text-[10px]">
                                      Não lida
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm mt-1 p-2 bg-muted rounded-lg inline-block">
                                  {msg.message}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="team" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Mensagens do Chat de Equipe ({getFilteredTeamMessages().length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {getFilteredTeamMessages().length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      Nenhuma mensagem encontrada
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {getFilteredTeamMessages().map((msg) => {
                        const sender = getProfile(msg.user_id);
                        return (
                          <div key={msg.id} className="flex gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={sender?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {getInitials(sender?.nome || msg.user_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{msg.user_name}</span>
                                <Badge variant="outline" className="text-[10px]">
                                  {msg.user_role}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(msg.created_at)}
                                </span>
                              </div>
                              <p className="text-sm mt-1 p-2 bg-muted rounded-lg inline-block">
                                {msg.message}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
