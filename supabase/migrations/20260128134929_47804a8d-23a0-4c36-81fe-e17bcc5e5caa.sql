
-- Fix user_roles policies to ensure CEO can view all roles from company users
-- and the policies properly work with company isolation

-- First, drop existing problematic policies
DROP POLICY IF EXISTS "CEO can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Backoffice can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Supervisor can view roles" ON public.user_roles;

-- Create helper function to check if users are in the same company
CREATE OR REPLACE FUNCTION public.users_in_same_company(_user_id_1 uuid, _user_id_2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT p1.company_id = p2.company_id 
         FROM profiles p1, profiles p2 
         WHERE p1.id = _user_id_1 AND p2.id = _user_id_2),
        false
    )
$$;

-- CEO can view all roles from users in the same company
CREATE POLICY "CEO can view company roles" 
ON public.user_roles 
FOR SELECT 
USING (
    has_role(auth.uid(), 'CEO'::app_role) 
    AND users_in_same_company(auth.uid(), user_id)
);

-- Supervisor can view roles from users in their team (within same company)
CREATE POLICY "Supervisor can view team roles" 
ON public.user_roles 
FOR SELECT 
USING (
    has_role(auth.uid(), 'SUPERVISOR'::app_role) 
    AND users_in_same_company(auth.uid(), user_id)
    AND (
        user_id IN (
            SELECT p.id FROM profiles p 
            WHERE p.team_id = get_user_team(auth.uid())
        )
        OR user_id = auth.uid()
    )
);

-- Backoffice can view roles from users in their team
CREATE POLICY "Backoffice can view team roles" 
ON public.user_roles 
FOR SELECT 
USING (
    has_role(auth.uid(), 'BACKOFFICE'::app_role) 
    AND users_in_same_company(auth.uid(), user_id)
    AND (
        user_id IN (
            SELECT p.id FROM profiles p 
            WHERE p.team_id = get_user_team(auth.uid())
        )
        OR user_id = auth.uid()
    )
);
