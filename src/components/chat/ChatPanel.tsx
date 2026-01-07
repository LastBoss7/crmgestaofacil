import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeamChat } from './TeamChat';
import { DirectMessages } from './DirectMessages';
import { Users, MessageSquare } from 'lucide-react';

export const ChatPanel = () => {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompany = async () => {
      if (!user) return;

      // Check if user owns a company
      const { data: ownedCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (ownedCompany) {
        setCompanyId(ownedCompany.id);
        return;
      }

      // Check if user is member of a company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profile?.company_id) {
        setCompanyId(profile.company_id);
      }
    };

    fetchCompany();
  }, [user]);

  return (
    <div className="h-full flex flex-col bg-background">
      <Tabs defaultValue="team" className="h-full flex flex-col">
        <div className="px-4 pt-2">
          <TabsList className="w-full h-10 p-1 bg-muted/50 rounded-lg">
            <TabsTrigger 
              value="team" 
              className="flex-1 h-8 gap-2 rounded-md text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              <Users className="h-4 w-4" />
              Equipe
            </TabsTrigger>
            <TabsTrigger 
              value="direct" 
              className="flex-1 h-8 gap-2 rounded-md text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              <MessageSquare className="h-4 w-4" />
              Privado
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="team" className="flex-1 m-0 overflow-hidden">
          <TeamChat companyId={companyId} />
        </TabsContent>

        <TabsContent value="direct" className="flex-1 m-0 overflow-hidden">
          <DirectMessages companyId={companyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
