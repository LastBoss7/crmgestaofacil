import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, MessageSquare, ArrowLeft, Check, CheckCheck } from 'lucide-react';
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
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <MessageSquare className="h-8 w-8" />
        </div>
        <p className="text-sm font-medium">Configure sua empresa</p>
        <p className="text-xs text-muted-foreground/70">para usar mensagens privadas</p>
      </div>
    );
  }

  // Conversation view
  if (selectedMember) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setSelectedMember(null)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {getInitials(selectedMember.nome)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{selectedMember.nome}</p>
            <p className="text-xs text-muted-foreground truncate">{selectedMember.email}</p>
          </div>
        </div>

        <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <MessageSquare className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium">Nenhuma mensagem</p>
              <p className="text-xs text-muted-foreground/70">Comece uma conversa!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, index) => {
                const isOwn = msg.sender_id === user?.id;
                const showTime = index === 0 || messages[index - 1].sender_id !== msg.sender_id;
                
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex flex-col max-w-[80%] ${isOwn ? 'items-end' : 'items-start'}`}>
                      {showTime && (
                        <span className="text-[10px] text-muted-foreground mb-1 px-1">
                          {formatTime(msg.created_at)}
                        </span>
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
                      {isOwn && (
                        <div className="flex items-center gap-1 mt-0.5 px-1">
                          {msg.read_at ? (
                            <CheckCheck className="h-3 w-3 text-primary" />
                          ) : (
                            <Check className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t border-border/50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="Escreva uma mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
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
  }

  // Members list view
  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <MessageSquare className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium">Nenhum membro</p>
            <p className="text-xs text-muted-foreground/70">na equipe</p>
          </div>
        ) : (
          <div className="py-2">
            {members.map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedMember(member)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {getInitials(member.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{member.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.email}
                  </p>
                </div>
                {member.unreadCount && member.unreadCount > 0 ? (
                  <Badge className="h-5 min-w-5 px-1.5 bg-primary text-primary-foreground text-xs">
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
