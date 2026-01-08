-- Allow CEO to update any profile (for team management)
CREATE POLICY "CEO can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'CEO'::app_role))
WITH CHECK (has_role(auth.uid(), 'CEO'::app_role));