import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Users, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePresence } from '@/hooks/usePresence';
import { motion, AnimatePresence } from 'framer-motion';
import { Team } from '@/types/database';

interface TeamMessage {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  message: string;
  created_at: string;
  team_id: string | null;
}

interface TeamChatProps {
  companyId: string | null;
}

export const TeamChat = ({ companyId }: TeamChatProps) => {
  const { user, profile, role } = useAuth();
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [userAvatars, setUserAvatars] = useState<Record<string, string | null>>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const presenceContext = selectedTeamId === 'all' ? 'team-chat' : `team-chat-${selectedTeamId}`;
  const { setTyping, getTypingUsers } = usePresence(presenceContext);
  const typingUsers = getTypingUsers(presenceContext).filter(u => u.user_id !== user?.id);

  // Fetch teams
  useEffect(() => {
    if (!companyId) return;

    const fetchTeams = async () => {
      const { data } = await supabase
        .from('teams')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      if (data) {
        setTeams(data as Team[]);
        // If user has a team, auto-select it
        if (profile?.team_id) {
          setSelectedTeamId(profile.team_id);
        }
      }
    };

    fetchTeams();
  }, [companyId, profile?.team_id]);

  // Fetch user avatars
  useEffect(() => {
    if (!companyId) return;

    const fetchAvatars = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, avatar_url');

      if (data) {
        const avatarMap: Record<string, string | null> = {};
        data.forEach((p) => {
          avatarMap[p.id] = p.avatar_url;
        });
        setUserAvatars(avatarMap);
      }
    };

    fetchAvatars();
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;

    const fetchMessages = async () => {
      setLoading(true);
      let query = supabase
        .from('team_messages')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true })
        .limit(100);

      // Filter by team if selected
      if (selectedTeamId === 'all') {
        query = query.is('team_id', null);
      } else {
        query = query.eq('team_id', selectedTeamId);
      }

      const { data, error } = await query;

      if (!error && data) {
        setMessages(data);
      }
      setLoading(false);
    };

    fetchMessages();

    // Subscribe to new messages
    const channelName = selectedTeamId === 'all' 
      ? 'team-chat-messages-all'
      : `team-chat-messages-${selectedTeamId}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_messages',
          filter: selectedTeamId === 'all' 
            ? `company_id=eq.${companyId}`
            : `team_id=eq.${selectedTeamId}`,
        },
        (payload) => {
          const newMsg = payload.new as TeamMessage;
          // Only add if matches current filter
          if (selectedTeamId === 'all' && newMsg.team_id === null) {
            setMessages((prev) => [...prev, newMsg]);
          } else if (selectedTeamId !== 'all' && newMsg.team_id === selectedTeamId) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, selectedTeamId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleInputChange = useCallback((value: string) => {
    setNewMessage(value);
    if (value.trim()) {
      setTyping(true, presenceContext);
    } else {
      setTyping(false);
    }
  }, [setTyping, presenceContext]);

  const handleSend = async () => {
    if (!newMessage.trim() || !companyId || !user || !profile || !role) return;

    setTyping(false);

    const messageData: any = {
      company_id: companyId,
      user_id: user.id,
      user_name: profile.nome,
      user_role: role,
      message: newMessage.trim(),
    };

    // Add team_id if sending to specific team
    if (selectedTeamId !== 'all') {
      messageData.team_id = selectedTeamId;
    }

    const { error } = await supabase.from('team_messages').insert(messageData);

    if (error) {
      toast.error('Erro ao enviar mensagem');
    } else {
      setNewMessage('');
    }
  };

  const formatTime = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRoleBadge = (userRole: string) => {
    const styles: Record<string, string> = {
      CEO: 'bg-amber-500/10 text-amber-500',
      BACKOFFICE: 'bg-blue-500/10 text-blue-500',
      SELLER: 'bg-emerald-500/10 text-emerald-500',
    };
    return styles[userRole] || 'bg-muted text-muted-foreground';
  };

  const getSelectedTeamName = () => {
    if (selectedTeamId === 'all') return 'Toda Empresa';
    const team = teams.find(t => t.id === selectedTeamId);
    return team?.name || 'Equipe';
  };

  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Users className="h-8 w-8" />
        </div>
        <p className="text-sm font-medium">Configure sua empresa</p>
        <p className="text-xs text-muted-foreground/70">para usar o chat da equipe</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Team Selector */}
      <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
        <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
          <SelectTrigger className="w-full h-9 bg-background">
            {selectedTeamId === 'all' ? (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span>Toda Empresa</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span>{getSelectedTeamName()}</span>
              </div>
            )}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>Toda Empresa</span>
              </div>
            </SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{team.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <Users className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium">Nenhuma mensagem</p>
            <p className="text-xs text-muted-foreground/70">
              {selectedTeamId === 'all' 
                ? 'Seja o primeiro a enviar para toda empresa!'
                : `Seja o primeiro a enviar para ${getSelectedTeamName()}!`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => {
              const isOwn = msg.user_id === user?.id;
              const showAvatar = index === 0 || messages[index - 1].user_id !== msg.user_id;
              
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''}`}
                >
                  {showAvatar ? (
                    <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                      <AvatarImage src={userAvatars[msg.user_id] || undefined} alt={msg.user_name} />
                      <AvatarFallback className={`text-xs font-medium ${getRoleBadge(msg.user_role)}`}>
                        {getInitials(msg.user_name)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-8 shrink-0" />
                  )}
                  <div className={`flex flex-col max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                    {showAvatar && (
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-xs font-medium text-foreground/80">
                          {isOwn ? 'Você' : msg.user_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-3.5 py-2 ${
                        isOwn
                          ? 'bg-primary text-primary-foreground rounded-tr-md'
                          : 'bg-muted/70 text-foreground rounded-tl-md'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {msg.message}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Typing Indicator */}
      <AnimatePresence>
        {typingUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-4 py-2 border-t border-border/30"
          >
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {typingUsers.slice(0, 3).map((typingUser) => (
                  <Avatar key={typingUser.user_id} className="h-5 w-5 ring-2 ring-card">
                    <AvatarImage src={typingUser.avatar_url || undefined} />
                    <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                      {getInitials(typingUser.nome)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  {typingUsers.length === 1 
                    ? `${typingUsers[0].nome.split(' ')[0]} está digitando`
                    : `${typingUsers.length} pessoas estão digitando`
                  }
                </span>
                <motion.div 
                  className="flex gap-0.5"
                  initial="start"
                  animate="end"
                >
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="w-1 h-1 bg-primary rounded-full"
                      animate={{
                        y: [0, -3, 0],
                      }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.15,
                      }}
                    />
                  ))}
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 border-t border-border/50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            placeholder={`Mensagem para ${selectedTeamId === 'all' ? 'toda empresa' : getSelectedTeamName()}...`}
            value={newMessage}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={() => setTyping(false)}
            className="flex-1 h-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 placeholder:text-muted-foreground/50"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!newMessage.trim()}
            className="h-10 w-10 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};