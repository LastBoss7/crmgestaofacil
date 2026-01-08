-- Allow Backoffice to delete profiles of sellers in their team
CREATE POLICY "Backoffice can delete seller profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role)
  AND team_id IN (SELECT id FROM teams WHERE supervisor_id = auth.uid())
);

-- Allow Backoffice to delete user_roles of sellers in their team
CREATE POLICY "Backoffice can delete seller roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role)
  AND role = 'SELLER'::app_role
  AND user_id IN (
    SELECT p.id FROM profiles p
    JOIN teams t ON p.team_id = t.id
    WHERE t.supervisor_id = auth.uid()
  )
);