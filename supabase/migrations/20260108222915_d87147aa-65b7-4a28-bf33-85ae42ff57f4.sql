-- Allow Backoffice to insert profiles (for new users in their team)
CREATE POLICY "Backoffice can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'BACKOFFICE'::app_role));

-- Allow Backoffice to update profiles of sellers in their team
CREATE POLICY "Backoffice can update seller profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role)
  AND (
    team_id IN (SELECT id FROM teams WHERE supervisor_id = auth.uid())
    OR team_id IS NULL
  )
)
WITH CHECK (
  has_role(auth.uid(), 'BACKOFFICE'::app_role)
  AND (
    team_id IN (SELECT id FROM teams WHERE supervisor_id = auth.uid())
    OR team_id IS NULL
  )
);