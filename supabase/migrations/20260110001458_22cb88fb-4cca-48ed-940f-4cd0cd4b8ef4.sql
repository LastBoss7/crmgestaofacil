-- Drop existing CEO policy and recreate as PERMISSIVE
DROP POLICY IF EXISTS "CEO can view company direct messages" ON public.direct_messages;

-- Create a PERMISSIVE policy for CEO to view all company messages
CREATE POLICY "CEO can view all company direct messages" 
ON public.direct_messages 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'CEO'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

-- Also add policy for CEO to view team messages in monitor
DROP POLICY IF EXISTS "CEO can view all team messages" ON public.team_messages;

CREATE POLICY "CEO can view all company team messages" 
ON public.team_messages 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'CEO'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);