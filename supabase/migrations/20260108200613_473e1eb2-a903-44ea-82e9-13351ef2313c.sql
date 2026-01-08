-- Add policy to allow CEO to insert roles (for manual user creation)
CREATE POLICY "CEO can insert any role"
ON public.user_roles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'CEO'
  )
);

-- Add policy to allow Backoffice to insert SELLER roles only
CREATE POLICY "Backoffice can insert seller roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  role = 'SELLER' AND
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'BACKOFFICE'
  )
);