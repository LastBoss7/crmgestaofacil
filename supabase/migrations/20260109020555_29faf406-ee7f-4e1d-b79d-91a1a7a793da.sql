-- Add active column to companies table
ALTER TABLE public.companies ADD COLUMN active boolean NOT NULL DEFAULT true;

-- Update RLS policy for super admin to update companies
CREATE POLICY "Super admin can update company active status" 
ON public.companies 
FOR UPDATE 
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));