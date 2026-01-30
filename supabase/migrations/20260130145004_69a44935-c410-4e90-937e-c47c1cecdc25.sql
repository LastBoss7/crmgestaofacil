-- Create junction table for campaign-team relationship (many-to-many)
CREATE TABLE public.campaign_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.sales_campaigns(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, team_id)
);

-- Enable RLS
ALTER TABLE public.campaign_teams ENABLE ROW LEVEL SECURITY;

-- CEO can manage campaign teams
CREATE POLICY "CEO can manage campaign teams"
ON public.campaign_teams
FOR ALL
USING (has_role(auth.uid(), 'CEO'::app_role) AND company_id = get_user_company_id(auth.uid()));

-- Coordinator can view assigned team campaigns
CREATE POLICY "Coordinator can view assigned team campaigns"
ON public.campaign_teams
FOR SELECT
USING (
  has_role(auth.uid(), 'COORDENADOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND team_id IN (SELECT get_coordinator_team_ids(auth.uid()))
);

-- Supervisor can view own team campaigns
CREATE POLICY "Supervisor can view own team campaigns"
ON public.campaign_teams
FOR SELECT
USING (
  has_role(auth.uid(), 'SUPERVISOR'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND team_id = get_user_team(auth.uid())
);

-- Backoffice can view team campaigns
CREATE POLICY "Backoffice can view team campaigns"
ON public.campaign_teams
FOR SELECT
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND team_id = get_user_team(auth.uid())
);

-- Sellers can view own team campaigns
CREATE POLICY "Sellers can view own team campaigns"
ON public.campaign_teams
FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND team_id = get_user_team(auth.uid())
);