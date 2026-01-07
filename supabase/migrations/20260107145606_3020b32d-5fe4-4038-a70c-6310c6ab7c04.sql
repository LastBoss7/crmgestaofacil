-- Add policy to allow users to insert their own CEO role when they are company owners
CREATE POLICY "Company owner can insert own CEO role"
ON public.user_roles
FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  AND role = 'CEO' 
  AND EXISTS (
    SELECT 1 FROM public.companies 
    WHERE owner_id = auth.uid()
  )
);

-- Add policy to allow invited users to insert their own role
CREATE POLICY "Invited user can insert own role"
ON public.user_roles
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.team_invites
    WHERE used_by = auth.uid()
    AND role = user_roles.role
  )
);

-- Allow users to view their own role
CREATE POLICY "Users can view own role"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());