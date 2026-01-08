-- Allow supervisors to update profiles for their team members (add/remove from their team)
CREATE POLICY "Supervisor can update team members profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  -- Can update if user is already in supervisor's team OR has no team (available to add)
  EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.supervisor_id = auth.uid()
    AND (profiles.team_id = t.id OR profiles.team_id IS NULL)
  )
)
WITH CHECK (
  -- Can only set team_id to supervisor's own team or null
  EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.supervisor_id = auth.uid()
    AND (profiles.team_id = t.id OR profiles.team_id IS NULL)
  )
);