-- Create super_admins table for platform administrators
CREATE TABLE public.super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Super admins can view the table
CREATE POLICY "Super admins can view super_admins"
ON public.super_admins
FOR SELECT
USING (user_id = auth.uid());

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE user_id = _user_id
  )
$$;

-- Add policy for super admins to view ALL companies
CREATE POLICY "Super admin can view all companies"
ON public.companies
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Add policy for super admins to update ALL companies
CREATE POLICY "Super admin can update all companies"
ON public.companies
FOR UPDATE
USING (is_super_admin(auth.uid()));

-- Add policy for super admins to delete companies
CREATE POLICY "Super admin can delete companies"
ON public.companies
FOR DELETE
USING (is_super_admin(auth.uid()));

-- Add policy for super admins to view ALL profiles
CREATE POLICY "Super admin can view all profiles"
ON public.profiles
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Add policy for super admins to view ALL sales
CREATE POLICY "Super admin can view all sales"
ON public.sales
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Add policy for super admins to view ALL user roles
CREATE POLICY "Super admin can view all user roles"
ON public.user_roles
FOR SELECT
USING (is_super_admin(auth.uid()));