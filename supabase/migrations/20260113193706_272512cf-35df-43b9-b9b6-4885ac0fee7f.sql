-- Drop existing supervisor policies
DROP POLICY IF EXISTS "Supervisor can create seller roles" ON public.user_roles;
DROP POLICY IF EXISTS "Supervisor can delete seller roles" ON public.user_roles;
DROP POLICY IF EXISTS "Supervisor can view seller roles" ON public.user_roles;

-- Create new policies for Supervisor to manage SELLER, BACKOFFICE, and SUPERVISOR roles
CREATE POLICY "Supervisor can create roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'SUPERVISOR'::app_role) 
  AND role IN ('SELLER'::app_role, 'BACKOFFICE'::app_role, 'SUPERVISOR'::app_role)
);

CREATE POLICY "Supervisor can view roles" 
ON public.user_roles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'SUPERVISOR'::app_role) 
  AND role IN ('SELLER'::app_role, 'BACKOFFICE'::app_role, 'SUPERVISOR'::app_role)
);

CREATE POLICY "Supervisor can update roles" 
ON public.user_roles 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'SUPERVISOR'::app_role) 
  AND role IN ('SELLER'::app_role, 'BACKOFFICE'::app_role, 'SUPERVISOR'::app_role)
);

CREATE POLICY "Supervisor can delete roles" 
ON public.user_roles 
FOR DELETE 
USING (
  has_role(auth.uid(), 'SUPERVISOR'::app_role) 
  AND role IN ('SELLER'::app_role, 'BACKOFFICE'::app_role, 'SUPERVISOR'::app_role)
);