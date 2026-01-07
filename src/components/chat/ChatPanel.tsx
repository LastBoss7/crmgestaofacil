import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
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
    <Card className="h-[500px] overflow-hidden border-sidebar-border bg-sidebar/50 backdrop-blur">
      <Tabs defaultValue="team" className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2 rounded-none border-b bg-transparent">
          <TabsTrigger value="team" className="gap-2 data-[state=active]:bg-primary/10">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Equipe</span>
          </TabsTrigger>
          <TabsTrigger value="direct" className="gap-2 data-[state=active]:bg-primary/10">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Privado</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="flex-1 m-0 overflow-hidden">
          <TeamChat companyId={companyId} />
        </TabsContent>

        <TabsContent value="direct" className="flex-1 m-0 overflow-hidden">
          <DirectMessages companyId={companyId} />
        </TabsContent>
      </Tabs>
    </Card>
  );
};
