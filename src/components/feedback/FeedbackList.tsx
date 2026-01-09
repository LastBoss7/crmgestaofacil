import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, Check, CheckCheck, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Feedback {
  id: string;
  seller_id: string;
  created_by: string;
  created_by_name: string;
  title: string;
  message: string;
  read_at: string | null;
  read_notified_at: string | null;
  created_at: string;
  seller_name?: string;
}

interface FeedbackListProps {
  refreshTrigger?: number;
}

export function FeedbackList({ refreshTrigger }: FeedbackListProps) {
  const { user, profile, isSeller, isBackoffice, isCEO } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeedbacks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch seller names for backoffice/CEO view
      if ((isBackoffice || isCEO) && data) {
        const sellerIds = [...new Set(data.map(f => f.seller_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', sellerIds);

        const profileMap = profiles?.reduce((acc, p) => ({ ...acc, [p.id]: p.nome }), {}) || {};
        
        setFeedbacks(data.map(f => ({
          ...f,
          seller_name: profileMap[f.seller_id] || 'Vendedor',
        })));
      } else {
        setFeedbacks(data || []);
      }
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('feedbacks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feedbacks' },
        () => fetchFeedbacks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshTrigger]);

  const markAsRead = async (feedback: Feedback) => {
    if (!user || !profile) return;

    try {
      // Mark as read
      const { error: updateError } = await supabase
        .from('feedbacks')
        .update({ read_at: new Date().toISOString() })
        .eq('id', feedback.id);

      if (updateError) throw updateError;

      // Send notification to the creator
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: feedback.created_by,
        title: 'Feedback Lido',
        message: `${profile.nome} leu o feedback: ${feedback.title}`,
        type: 'feedback_read',
        company_id: profile.company_id,
      });

      if (notifError) console.error('Error creating read notification:', notifError);

      toast.success('Feedback marcado como lido');
      fetchFeedbacks();
    } catch (error) {
      console.error('Error marking feedback as read:', error);
      toast.error('Erro ao marcar como lido');
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (feedbacks.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum feedback</p>
            <p className="text-sm">
              {isSeller ? 'Você ainda não recebeu feedbacks.' : 'Nenhum feedback enviado ainda.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {isSeller ? 'Meus Feedbacks' : 'Feedbacks Enviados'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <AnimatePresence>
            {feedbacks.map((feedback, index) => (
              <motion.div
                key={feedback.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "p-4 rounded-lg border mb-3 transition-colors",
                  !feedback.read_at && isSeller && "bg-primary/5 border-primary/30",
                  feedback.read_at && "bg-muted/30"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(feedback.created_by_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{feedback.title}</p>
                        {feedback.read_at ? (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <CheckCheck className="h-3 w-3" />
                            Lido
                          </Badge>
                        ) : (
                          <Badge variant="default" className="gap-1 text-xs">
                            <Eye className="h-3 w-3" />
                            Novo
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isSeller ? `De: ${feedback.created_by_name}` : `Para: ${feedback.seller_name}`}
                        {' • '}
                        {format(new Date(feedback.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      <p className="text-sm mt-2 text-foreground/80 whitespace-pre-wrap">
                        {feedback.message}
                      </p>
                      {feedback.read_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Lido em: {format(new Date(feedback.read_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {isSeller && !feedback.read_at && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 shrink-0"
                      onClick={() => markAsRead(feedback)}
                    >
                      <Check className="h-4 w-4" />
                      Marcar como lido
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
