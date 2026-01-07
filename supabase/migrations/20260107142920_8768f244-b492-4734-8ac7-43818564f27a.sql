-- Step 1: Add company_id to profiles FIRST (without FK yet)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company_id UUID;

-- Step 2: Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    cnpj VARCHAR(18) NOT NULL UNIQUE,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    owner_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for CNPJ lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_cnpj ON public.companies(cnpj);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Step 3: Now add foreign key to profiles
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_company_id_fkey
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;

-- Step 4: RLS Policies for companies
CREATE POLICY "Company members can view their company"
ON public.companies
FOR SELECT
USING (
    owner_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.company_id = companies.id
    )
);

CREATE POLICY "Anyone can insert company during signup"
ON public.companies
FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner can update company"
ON public.companies
FOR UPDATE
USING (owner_id = auth.uid());

-- Step 5: Create team invites table
CREATE TABLE public.team_invites (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    invite_code VARCHAR(32) NOT NULL UNIQUE,
    email VARCHAR(255),
    role app_role NOT NULL DEFAULT 'SELLER',
    invited_by UUID NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    used_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for invite code lookup
CREATE INDEX idx_team_invites_code ON public.team_invites(invite_code);
CREATE INDEX idx_team_invites_company ON public.team_invites(company_id);

-- Enable RLS on team_invites
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invites
CREATE POLICY "Company owner can view invites"
ON public.team_invites
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.companies 
        WHERE companies.id = team_invites.company_id 
        AND companies.owner_id = auth.uid()
    )
);

CREATE POLICY "Company owner can create invites"
ON public.team_invites
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.companies 
        WHERE companies.id = team_invites.company_id 
        AND companies.owner_id = auth.uid()
    )
);

CREATE POLICY "Company owner can delete invites"
ON public.team_invites
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.companies 
        WHERE companies.id = team_invites.company_id 
        AND companies.owner_id = auth.uid()
    )
);

CREATE POLICY "Anyone can view valid invite by code for signup"
ON public.team_invites
FOR SELECT
USING (used_at IS NULL AND expires_at > now());

-- Update trigger for companies
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to validate CNPJ doesn't exist
CREATE OR REPLACE FUNCTION public.cnpj_exists(check_cnpj VARCHAR)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.companies WHERE cnpj = check_cnpj
    )
$$;

-- Enable realtime for team invites
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_invites;