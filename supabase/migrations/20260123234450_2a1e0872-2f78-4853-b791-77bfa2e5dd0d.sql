
-- Drop the existing policy first, then recreate if needed
DROP POLICY IF EXISTS "Company owner can insert own CEO role" ON public.user_roles;

-- Recreate the policy for company owner to insert their own CEO role during signup
CREATE POLICY "Company owner can insert own CEO role" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  (user_id = auth.uid()) 
  AND (role = 'CEO'::app_role) 
  AND EXISTS (
    SELECT 1 FROM companies WHERE companies.owner_id = auth.uid()
  )
);
