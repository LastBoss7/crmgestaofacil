-- CEO pode ver todas as mensagens diretas
CREATE POLICY "CEO can view all direct messages" 
ON public.direct_messages 
FOR SELECT 
USING (has_role(auth.uid(), 'CEO'));

-- Supervisor (Backoffice) pode ver mensagens da sua equipe
CREATE POLICY "Supervisor can view team direct messages" 
ON public.direct_messages 
FOR SELECT 
USING (
    has_role(auth.uid(), 'BACKOFFICE') AND
    EXISTS (
        SELECT 1 FROM public.teams t
        WHERE t.supervisor_id = auth.uid()
        AND (
            -- Sender está na equipe do supervisor
            EXISTS (
                SELECT 1 FROM public.profiles p 
                WHERE p.id = direct_messages.sender_id 
                AND p.team_id = t.id
            )
            OR
            -- Receiver está na equipe do supervisor
            EXISTS (
                SELECT 1 FROM public.profiles p 
                WHERE p.id = direct_messages.receiver_id 
                AND p.team_id = t.id
            )
        )
    )
);

-- CEO pode ver todas as mensagens do time
CREATE POLICY "CEO can view all team messages" 
ON public.team_messages 
FOR SELECT 
USING (has_role(auth.uid(), 'CEO'));