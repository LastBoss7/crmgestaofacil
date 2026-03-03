
-- Allow Coordinator to manage (INSERT, UPDATE, DELETE) campaigns
CREATE POLICY "Coordinator can manage company campaigns"
ON public.sales_campaigns
FOR ALL
USING (
  has_role(auth.uid(), 'COORDENADOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'COORDENADOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

-- Drop the old SELECT-only policy for Coordinator
DROP POLICY IF EXISTS "Coordinator can view company campaigns" ON public.sales_campaigns;

-- Allow Coordinator to manage campaign_teams
CREATE POLICY "Coordinator can manage campaign teams"
ON public.campaign_teams
FOR ALL
USING (
  has_role(auth.uid(), 'COORDENADOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'COORDENADOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

-- Drop old SELECT-only policy for Coordinator on campaign_teams
DROP POLICY IF EXISTS "Coordinator can view assigned team campaigns" ON public.campaign_teams;

-- Allow Supervisor to manage campaign_teams (currently only SELECT for own team)
DROP POLICY IF EXISTS "Supervisor can view own team campaigns" ON public.campaign_teams;

CREATE POLICY "Supervisor can manage own team campaigns"
ON public.campaign_teams
FOR ALL
USING (
  has_role(auth.uid(), 'SUPERVISOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND team_id = get_user_team(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'SUPERVISOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND team_id = get_user_team(auth.uid())
);
