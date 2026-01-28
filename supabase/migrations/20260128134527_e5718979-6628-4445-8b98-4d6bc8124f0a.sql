
-- Drop and recreate BACKOFFICE policies to match equipe by team name OR team id
DROP POLICY IF EXISTS "BACKOFFICE can view team sales" ON public.sales;
DROP POLICY IF EXISTS "BACKOFFICE can update team sales" ON public.sales;

-- Create helper function to get team name
CREATE OR REPLACE FUNCTION public.get_user_team_name(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT t.name
    FROM public.profiles p
    JOIN public.teams t ON t.id = p.team_id
    WHERE p.id = _user_id
    LIMIT 1
$$;

-- BACKOFFICE can view team sales (match by team_id OR team_name)
CREATE POLICY "BACKOFFICE can view team sales" 
ON public.sales 
FOR SELECT 
USING (
    has_role(auth.uid(), 'BACKOFFICE'::app_role) 
    AND company_id = get_user_company_id(auth.uid())
    AND (
        equipe = (get_user_team(auth.uid()))::text
        OR equipe = get_user_team_name(auth.uid())
    )
);

-- BACKOFFICE can update team sales (match by team_id OR team_name)
CREATE POLICY "BACKOFFICE can update team sales" 
ON public.sales 
FOR UPDATE 
USING (
    has_role(auth.uid(), 'BACKOFFICE'::app_role) 
    AND company_id = get_user_company_id(auth.uid())
    AND (
        equipe = (get_user_team(auth.uid()))::text
        OR equipe = get_user_team_name(auth.uid())
    )
)
WITH CHECK (
    has_role(auth.uid(), 'BACKOFFICE'::app_role) 
    AND company_id = get_user_company_id(auth.uid())
    AND (
        equipe = (get_user_team(auth.uid()))::text
        OR equipe = get_user_team_name(auth.uid())
    )
);
