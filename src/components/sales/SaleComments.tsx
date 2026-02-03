import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ROLE_LABELS, AppRole } from '@/types/database';

interface SaleComment {
  id: string;
  sale_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  message: string;
  created_at: string;
}

interface SaleCommentsProps {
  saleId: string;
}

export function SaleComments({ saleId }: SaleCommentsProps) {
  const { user, profile, role } = useAuth();
  const [comments, setComments] = useState<SaleComment[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('sale_comments')
      .select('*')
      .eq('sale_id', saleId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
    } else {
      setComments(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`sale-comments-${saleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sale_comments',
          filter: `sale_id=eq.${saleId}`,
        },
        (payload) => {
          setComments((prev) => [...prev, payload.new as SaleComment]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [saleId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !profile || !role) return;

    setSending(true);
    const { error } = await supabase.from('sale_comments').insert({
      sale_id: saleId,
      user_id: user.id,
      user_name: profile.nome,
      user_role: role,
      message: newMessage.trim(),
      company_id: profile.company_id,
    });

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    } else {
      setNewMessage('');
    }
    setSending(false);
  };

  const getRoleBadgeColor = (userRole: string) => {
    switch (userRole) {
      case 'CEO':
        return 'bg-purple-100 text-purple-800';
      case 'BACKOFFICE':
        return 'bg-blue-100 text-blue-800';
      case 'SELLER':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div className="flex flex-col h-[300px] border rounded-lg">
      <div className="flex items-center gap-2 p-3 border-b bg-muted/50">
        <MessageCircle className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm">Comunicação</span>
        <span className="text-xs text-muted-foreground">
          ({comments.length} mensagens)
        </span>
      </div>

      <ScrollArea className="flex-1 p-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma mensagem ainda
            </p>
            <p className="text-xs text-muted-foreground">
              Inicie a conversa sobre esta venda
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => {
              const isOwnMessage = comment.user_id === user?.id;
              return (
                <div
                  key={comment.id}
                  className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">{comment.user_name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${getRoleBadgeColor(comment.user_role)}`}
                    >
                      {ROLE_LABELS[comment.user_role as AppRole] || comment.user_role}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatTime(comment.created_at)}
                    </span>
                  </div>
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      isOwnMessage
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {comment.message}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Textarea
            placeholder="Digite sua mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="min-h-[40px] max-h-[80px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button
            size="icon"
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}