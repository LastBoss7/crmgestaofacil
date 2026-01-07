-- Create team chat messages table (public chat within company)
CREATE TABLE public.team_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create direct messages table (private chat between users)
CREATE TABLE public.direct_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    sender_name TEXT NOT NULL,
    receiver_id UUID NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_team_messages_company ON public.team_messages(company_id);
CREATE INDEX idx_team_messages_created ON public.team_messages(created_at DESC);
CREATE INDEX idx_direct_messages_sender ON public.direct_messages(sender_id);
CREATE INDEX idx_direct_messages_receiver ON public.direct_messages(receiver_id);
CREATE INDEX idx_direct_messages_created ON public.direct_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_messages
CREATE POLICY "Company members can view team messages"
ON public.team_messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.company_id = team_messages.company_id
    )
    OR
    EXISTS (
        SELECT 1 FROM public.companies 
        WHERE companies.id = team_messages.company_id 
        AND companies.owner_id = auth.uid()
    )
);

CREATE POLICY "Company members can insert team messages"
ON public.team_messages
FOR INSERT
WITH CHECK (
    user_id = auth.uid() AND (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.company_id = team_messages.company_id
        )
        OR
        EXISTS (
            SELECT 1 FROM public.companies 
            WHERE companies.id = team_messages.company_id 
            AND companies.owner_id = auth.uid()
        )
    )
);

-- RLS Policies for direct_messages
CREATE POLICY "Users can view their own direct messages"
ON public.direct_messages
FOR SELECT
USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
);

CREATE POLICY "Users can send direct messages"
ON public.direct_messages
FOR INSERT
WITH CHECK (
    sender_id = auth.uid()
);

CREATE POLICY "Users can update read status of received messages"
ON public.direct_messages
FOR UPDATE
USING (receiver_id = auth.uid());

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;