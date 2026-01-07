import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, MessageSquare, ArrowLeft, Circle } from 'lucide-react';
import { toast } from 'sonner';

interface DirectMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  receiver_id: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

interface TeamMember {
  id: string;
  nome: string;
  email: string;
  unreadCount?: number;
}

interface DirectMessagesProps {
  companyId: string | null;
}

export const DirectMessages = ({ companyId }: DirectMessagesProps) => {
  const { user, profile } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch team members
  useEffect(() => {
    if (!companyId || !user) return;

    const fetchMembers = async () => {
      // Get company owner
      const { data: companyData } = await supabase
        .from('companies')
        .select('owner_id')
        .eq('id', companyId)
        .single();

      // Get all profiles from company
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, nome, email')
        .eq('company_id', companyId);

      // Include owner if not in profiles
      let allMembers = (profilesData || []) as TeamMember[];
      
      if (companyData?.owner_id) {
        const ownerExists = allMembers.some((m) => m.id === companyData.owner_id);
        if (!ownerExists) {
          const { data: ownerData } = await supabase
            .from('profiles')
            .select('id, nome, email')
            .eq('id', companyData.owner_id)
            .single();
          if (ownerData) {
            allMembers = [ownerData, ...allMembers];
          }
        }
      }

      // Filter out current user
      allMembers = allMembers.filter((m) => m.id !== user.id);

      // Get unread counts
      const { data: unreadData } = await supabase
        .from('direct_messages')
        .select('sender_id')
        .eq('receiver_id', user.id)
        .is('read_at', null);

      const unreadCounts: Record<string, number> = {};
      (unreadData || []).forEach((msg) => {
        unreadCounts[msg.sender_id] = (unreadCounts[msg.sender_id] || 0) + 1;
      });

      allMembers = allMembers.map((m) => ({
        ...m,
        unreadCount: unreadCounts[m.id] || 0,
      }));

      setMembers(allMembers);
      setLoading(false);
    };

    fetchMembers();
  }, [companyId, user]);

  // Fetch messages when member selected
  useEffect(() => {
    if (!selectedMember || !user) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${selectedMember.id}),and(sender_id.eq.${selectedMember.id},receiver_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data);

        // Mark as read
        await supabase
          .from('direct_messages')
          .update({ read_at: new Date().toISOString() })
          .eq('sender_id', selectedMember.id)
          .eq('receiver_id', user.id)
          .is('read_at', null);

        // Update unread count
        setMembers((prev) =>
          prev.map((m) =>
            m.id === selectedMember.id ? { ...m, unreadCount: 0 } : m
          )
        );
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel('direct-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        (payload) => {
          const msg = payload.new as DirectMessage;
          if (
            (msg.sender_id === user.id && msg.receiver_id === selectedMember.id) ||
            (msg.sender_id === selectedMember.id && msg.receiver_id === user.id)
          ) {
            setMessages((prev) => [...prev, msg]);
            
            // Mark as read if received
            if (msg.receiver_id === user.id) {
              supabase
                .from('direct_messages')
                .update({ read_at: new Date().toISOString() })
                .eq('id', msg.id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedMember, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedMember || !user || !profile || !companyId) return;

    const { error } = await supabase.from('direct_messages').insert({
      company_id: companyId,
      sender_id: user.id,
      sender_name: profile.nome,
      receiver_id: selectedMember.id,
      message: newMessage.trim(),
    });

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

  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <MessageSquare className="h-12 w-12 mb-2" />
        <p>Configure sua empresa para usar mensagens</p>
      </div>
    );
  }

  // Conversation view
  if (selectedMember) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 p-3 border-b bg-card/50">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedMember(null)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(selectedMember.nome)}
            </AvatarFallback>
          </Avatar>
          <span className="font-semibold">{selectedMember.nome}</span>
        </div>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <p className="text-sm">Nenhuma mensagem ainda</p>
              <p className="text-xs">Comece uma conversa!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isOwn = msg.sender_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`flex flex-col max-w-[75%] ${
                        isOwn ? 'items-end' : 'items-start'
                      }`}
                    >
                      <span className="text-xs text-muted-foreground mb-1">
                        {formatTime(msg.created_at)}
                      </span>
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          isOwn
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
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

        <div className="p-3 border-t bg-card/50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="Digite sua mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Members list view
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b bg-card/50">
        <MessageSquare className="h-5 w-5 text-primary" />
        <span className="font-semibold">Mensagens Privadas</span>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm">Nenhum membro na equipe</p>
          </div>
        ) : (
          <div className="divide-y">
            {members.map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedMember(member)}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(member.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <Circle className="absolute bottom-0 right-0 h-3 w-3 fill-green-500 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{member.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.email}
                  </p>
                </div>
                {member.unreadCount && member.unreadCount > 0 ? (
                  <Badge variant="default" className="h-5 min-w-5 px-1.5">
                    {member.unreadCount}
                  </Badge>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
