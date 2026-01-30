-- Create backoffice_teams table similar to coordinator_teams
CREATE TABLE public.backoffice_teams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    backoffice_id uuid NOT NULL,
    team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (backoffice_id, team_id)
);

-- Enable RLS
ALTER TABLE public.backoffice_teams ENABLE ROW LEVEL SECURITY;

-- CEO can manage backoffice teams
CREATE POLICY "CEO can select backoffice teams"
ON public.backoffice_teams
FOR SELECT
USING (has_role(auth.uid(), 'CEO'::app_role) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "CEO can insert backoffice teams"
ON public.backoffice_teams
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'CEO'::app_role) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "CEO can update backoffice teams"
ON public.backoffice_teams
FOR UPDATE
USING (has_role(auth.uid(), 'CEO'::app_role) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "CEO can delete backoffice teams"
ON public.backoffice_teams
FOR DELETE
USING (has_role(auth.uid(), 'CEO'::app_role) AND company_id = get_user_company_id(auth.uid()));

-- Backoffice can view own team assignments
CREATE POLICY "Backoffice can view own team assignments"
ON public.backoffice_teams
FOR SELECT
USING (backoffice_id = auth.uid());

-- Create helper function to get backoffice team IDs
CREATE OR REPLACE FUNCTION public.get_backoffice_team_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM backoffice_teams WHERE backoffice_id = _user_id
$$;

-- Update sales RLS policies for BACKOFFICE to check backoffice_teams if assigned
-- First drop existing policies
DROP POLICY IF EXISTS "BACKOFFICE can view team sales" ON public.sales;
DROP POLICY IF EXISTS "BACKOFFICE can update team sales" ON public.sales;

-- Create new policies that check backoffice_teams or fallback to user's own team
CREATE POLICY "BACKOFFICE can view team sales"
ON public.sales
FOR SELECT
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND (
    -- Check if backoffice has specific team assignments
    (EXISTS (SELECT 1 FROM backoffice_teams WHERE backoffice_id = auth.uid()) AND
     (equipe IN (SELECT (get_backoffice_team_ids(auth.uid()))::text) OR
      equipe IN (SELECT t.name FROM teams t WHERE t.id IN (SELECT get_backoffice_team_ids(auth.uid())))))
    OR
    -- Fallback to user's own team if no specific assignments
    (NOT EXISTS (SELECT 1 FROM backoffice_teams WHERE backoffice_id = auth.uid()) AND
     (equipe = (get_user_team(auth.uid()))::text OR equipe = get_user_team_name(auth.uid())))
  )
);

CREATE POLICY "BACKOFFICE can update team sales"
ON public.sales
FOR UPDATE
USING (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND (
    -- Check if backoffice has specific team assignments
    (EXISTS (SELECT 1 FROM backoffice_teams WHERE backoffice_id = auth.uid()) AND
     (equipe IN (SELECT (get_backoffice_team_ids(auth.uid()))::text) OR
      equipe IN (SELECT t.name FROM teams t WHERE t.id IN (SELECT get_backoffice_team_ids(auth.uid())))))
    OR
    -- Fallback to user's own team if no specific assignments
    (NOT EXISTS (SELECT 1 FROM backoffice_teams WHERE backoffice_id = auth.uid()) AND
     (equipe = (get_user_team(auth.uid()))::text OR equipe = get_user_team_name(auth.uid())))
  )
)
WITH CHECK (
  has_role(auth.uid(), 'BACKOFFICE'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND (
    (EXISTS (SELECT 1 FROM backoffice_teams WHERE backoffice_id = auth.uid()) AND
     (equipe IN (SELECT (get_backoffice_team_ids(auth.uid()))::text) OR
      equipe IN (SELECT t.name FROM teams t WHERE t.id IN (SELECT get_backoffice_team_ids(auth.uid())))))
    OR
    (NOT EXISTS (SELECT 1 FROM backoffice_teams WHERE backoffice_id = auth.uid()) AND
     (equipe = (get_user_team(auth.uid()))::text OR equipe = get_user_team_name(auth.uid())))
  )
);