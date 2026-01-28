
-- 2. Create table to map coordinators to their assigned teams
CREATE TABLE public.coordinator_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coordinator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(coordinator_id, team_id)
);

-- Enable RLS
ALTER TABLE public.coordinator_teams ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coordinator_teams
CREATE POLICY "CEO can manage coordinator teams" ON public.coordinator_teams
FOR ALL USING (
  has_role(auth.uid(), 'CEO'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Coordinators can view own team assignments" ON public.coordinator_teams
FOR SELECT USING (coordinator_id = auth.uid());

-- 3. Create helper function to check if user is coordinator for a specific team
CREATE OR REPLACE FUNCTION public.is_coordinator_for_team(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM coordinator_teams
    WHERE coordinator_id = _user_id AND team_id = _team_id
  )
$$;

-- 4. Create helper function to get all teams a coordinator has access to
CREATE OR REPLACE FUNCTION public.get_coordinator_team_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM coordinator_teams WHERE coordinator_id = _user_id
$$;
