import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Users } from 'lucide-react';
import { toast } from 'sonner';

interface TeamMessage {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  message: string;
  created_at: string;
}

interface UserAvatar {
  id: string;
  avatar_url: string | null;
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
  const scrollRef = useRef<HTMLDivElement>(null);

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
      const { data, error } = await supabase
        .from('team_messages')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (!error && data) {
        setMessages(data);
      }
      setLoading(false);
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel('team-chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_messages',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as TeamMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !companyId || !user || !profile || !role) return;

    const { error } = await supabase.from('team_messages').insert({
      company_id: companyId,
      user_id: user.id,
      user_name: profile.nome,
      user_role: role,
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

  const getRoleBadge = (userRole: string) => {
    const styles: Record<string, string> = {
      CEO: 'bg-amber-500/10 text-amber-500',
      BACKOFFICE: 'bg-blue-500/10 text-blue-500',
      SELLER: 'bg-emerald-500/10 text-emerald-500',
    };
    return styles[userRole] || 'bg-muted text-muted-foreground';
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
            <p className="text-xs text-muted-foreground/70">Seja o primeiro a enviar!</p>
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
};
