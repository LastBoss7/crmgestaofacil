
-- Update existing sales that have NULL equipe to use the seller's team_id
UPDATE sales s
SET equipe = p.team_id::text
FROM profiles p
WHERE s.seller_id = p.id
  AND s.equipe IS NULL
  AND p.team_id IS NOT NULL;

-- Also update Supervisor RLS policy to check both team_id and team_name like BACKOFFICE
DROP POLICY IF EXISTS "Supervisor can view team sales" ON sales;
CREATE POLICY "Supervisor can view team sales" ON sales
FOR SELECT USING (
  has_role(auth.uid(), 'SUPERVISOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND (
    equipe = (get_user_team(auth.uid()))::text 
    OR equipe = get_user_team_name(auth.uid())
  )
);

DROP POLICY IF EXISTS "Supervisor can update team sales" ON sales;
CREATE POLICY "Supervisor can update team sales" ON sales
FOR UPDATE USING (
  has_role(auth.uid(), 'SUPERVISOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND (
    equipe = (get_user_team(auth.uid()))::text 
    OR equipe = get_user_team_name(auth.uid())
  )
);
