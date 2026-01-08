-- Criar tabela de equipes/unidades
CREATE TABLE public.teams (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    supervisor_id UUID NOT NULL,
    company_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar coluna de equipe na tabela profiles
ALTER TABLE public.profiles ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Habilitar RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Políticas para CEO - acesso total
CREATE POLICY "CEO can manage all teams" 
ON public.teams 
FOR ALL 
USING (has_role(auth.uid(), 'CEO'))
WITH CHECK (has_role(auth.uid(), 'CEO'));

-- Backoffice pode ver todas as equipes
CREATE POLICY "Backoffice can view all teams" 
ON public.teams 
FOR SELECT 
USING (has_role(auth.uid(), 'BACKOFFICE'));

-- Supervisor pode ver e atualizar sua própria equipe
CREATE POLICY "Supervisor can update own team" 
ON public.teams 
FOR UPDATE 
USING (supervisor_id = auth.uid());

CREATE POLICY "Supervisor can view own team" 
ON public.teams 
FOR SELECT 
USING (supervisor_id = auth.uid());

-- Vendedores podem ver sua própria equipe
CREATE POLICY "Sellers can view their team" 
ON public.teams 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.team_id = teams.id
    )
);

-- Trigger para updated_at
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função helper para verificar se usuário é supervisor de uma equipe
CREATE OR REPLACE FUNCTION public.is_team_supervisor(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.teams
        WHERE id = _team_id
          AND supervisor_id = _user_id
    )
$$;

-- Função para obter o team_id do usuário
CREATE OR REPLACE FUNCTION public.get_user_team(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT team_id
    FROM public.profiles
    WHERE id = _user_id
    LIMIT 1
$$;