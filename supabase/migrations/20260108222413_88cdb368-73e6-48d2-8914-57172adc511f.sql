-- Allow Backoffice to insert SELLER roles
CREATE POLICY "Backoffice can insert seller roles for new users"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  (role = 'SELLER'::app_role) 
  AND has_role(auth.uid(), 'BACKOFFICE'::app_role)
);

-- Allow Backoffice to view seller roles (needed to manage their team)
CREATE POLICY "Backoffice can view seller roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role)
  AND role = 'SELLER'::app_role
);