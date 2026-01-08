-- Create broadcasts table
CREATE TABLE public.broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

-- CEO can manage all broadcasts
CREATE POLICY "CEO can manage broadcasts"
ON public.broadcasts
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'CEO'::app_role))
WITH CHECK (has_role(auth.uid(), 'CEO'::app_role));

-- Backoffice/Supervisor can create broadcasts for their team
CREATE POLICY "Backoffice can create team broadcasts"
ON public.broadcasts
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'BACKOFFICE'::app_role)
  AND sender_id = auth.uid()
  AND (
    team_id IN (SELECT id FROM teams WHERE supervisor_id = auth.uid())
    OR team_id IS NULL
  )
);

-- Backoffice can view their broadcasts
CREATE POLICY "Backoffice can view own broadcasts"
ON public.broadcasts
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role)
  AND sender_id = auth.uid()
);

-- Backoffice can update/delete their broadcasts
CREATE POLICY "Backoffice can manage own broadcasts"
ON public.broadcasts
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role)
  AND sender_id = auth.uid()
);

CREATE POLICY "Backoffice can delete own broadcasts"
ON public.broadcasts
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role)
  AND sender_id = auth.uid()
);

-- Team members can view broadcasts for their team or company-wide
CREATE POLICY "Team members can view broadcasts"
ON public.broadcasts
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (expires_at IS NULL OR expires_at > now())
  AND (
    team_id IS NULL -- company-wide broadcast
    OR team_id IN (SELECT team_id FROM profiles WHERE id = auth.uid())
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcasts;