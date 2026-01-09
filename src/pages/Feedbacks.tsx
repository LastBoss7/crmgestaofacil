import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';
import { Button } from '@/components/ui/button';
import { FeedbackDialog } from '@/components/feedback/FeedbackDialog';
import { FeedbackList } from '@/components/feedback/FeedbackList';
import { MessageSquarePlus } from 'lucide-react';

export default function Feedbacks() {
  const navigate = useNavigate();
  const { user, isSeller, isBackoffice, isCEO } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sellers, setSellers] = useState<Profile[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Fetch sellers for backoffice/CEO
    if (isBackoffice || isCEO) {
      const fetchSellers = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('active', true);

        // Filter to only show sellers (users with SELLER role)
        if (data) {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'SELLER');

          const sellerIds = roles?.map(r => r.user_id) || [];
          setSellers(data.filter(p => sellerIds.includes(p.id)));
        }
      };
      fetchSellers();
    }
  }, [user, isBackoffice, isCEO, navigate]);

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Feedbacks</h1>
            <p className="text-muted-foreground">
              {isSeller 
                ? 'Visualize os feedbacks recebidos' 
                : 'Envie e acompanhe feedbacks para vendedores'
              }
            </p>
          </div>
          
          {(isBackoffice || isCEO) && (
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <MessageSquarePlus className="h-4 w-4" />
              Novo Feedback
            </Button>
          )}
        </div>

        {/* Feedback List */}
        <FeedbackList refreshTrigger={refreshTrigger} />

        {/* Dialog */}
        {(isBackoffice || isCEO) && (
          <FeedbackDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            sellers={sellers}
            onFeedbackSent={() => setRefreshTrigger(prev => prev + 1)}
          />
        )}
      </div>
    </Layout>
  );
}
