import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Profile } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Send } from 'lucide-react';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sellers: Profile[];
  onFeedbackSent: () => void;
}

export function FeedbackDialog({ open, onOpenChange, sellers, onFeedbackSent }: FeedbackDialogProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    seller_id: '',
    title: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    if (!formData.seller_id || !formData.title.trim() || !formData.message.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);

    try {
      // Create feedback
      const { error: feedbackError } = await supabase.from('feedbacks').insert({
        seller_id: formData.seller_id,
        created_by: user.id,
        created_by_name: profile.nome,
        title: formData.title,
        message: formData.message,
        company_id: profile.company_id,
      });

      if (feedbackError) throw feedbackError;

      // Create notification for the seller
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: formData.seller_id,
        title: 'Novo Feedback',
        message: `${profile.nome} enviou um feedback: ${formData.title}`,
        type: 'feedback',
        company_id: profile.company_id,
      });

      if (notifError) console.error('Error creating notification:', notifError);

      toast.success('Feedback enviado com sucesso!');
      setFormData({ seller_id: '', title: '', message: '' });
      onFeedbackSent();
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending feedback:', error);
      toast.error('Erro ao enviar feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Feedback</DialogTitle>
          <DialogDescription>
            Envie um feedback para um vendedor. Ele receberá uma notificação.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Vendedor *</Label>
            <Select
              value={formData.seller_id}
              onValueChange={(v) => setFormData({ ...formData, seller_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o vendedor" />
              </SelectTrigger>
              <SelectContent>
                {sellers.map((seller) => (
                  <SelectItem key={seller.id} value={seller.id}>
                    {seller.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              placeholder="Ex: Melhoria no atendimento"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Mensagem *</Label>
            <Textarea
              placeholder="Descreva o feedback detalhadamente..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              <Send className="h-4 w-4" />
              Enviar Feedback
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
