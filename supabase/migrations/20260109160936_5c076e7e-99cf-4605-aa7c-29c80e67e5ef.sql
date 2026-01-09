-- Drop existing insert policy for backoffice
DROP POLICY IF EXISTS "Backoffice can create feedbacks" ON public.feedbacks;

-- Create new insert policy that allows both CEO and BACKOFFICE to create feedbacks
CREATE POLICY "CEO and Backoffice can create feedbacks" 
ON public.feedbacks 
FOR INSERT 
WITH CHECK (
  (has_role(auth.uid(), 'CEO'::app_role) OR has_role(auth.uid(), 'BACKOFFICE'::app_role))
  AND created_by = auth.uid()
);