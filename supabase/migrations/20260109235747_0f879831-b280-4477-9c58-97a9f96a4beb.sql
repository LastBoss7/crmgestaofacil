-- Add team_id column to team_messages for team-specific chats
ALTER TABLE public.team_messages 
ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX idx_team_messages_team_id ON public.team_messages(team_id);

-- Update RLS policy to allow team members to see their team's messages
DROP POLICY IF EXISTS "Users can read team messages from their company" ON public.team_messages;
DROP POLICY IF EXISTS "Users can insert team messages" ON public.team_messages;

CREATE POLICY "Users can read team messages from their company or team" 
ON public.team_messages 
FOR SELECT 
USING (
  (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);

CREATE POLICY "Users can insert team messages in company or team" 
ON public.team_messages 
FOR INSERT 
WITH CHECK (
  (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  AND user_id = auth.uid()
);