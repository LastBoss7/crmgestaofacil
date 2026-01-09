-- Criar tabela de códigos de convite para empresas
CREATE TABLE public.company_invite_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by_company_id UUID REFERENCES public.companies(id),
  created_by UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Habilitar RLS
ALTER TABLE public.company_invite_codes ENABLE ROW LEVEL SECURITY;

-- Super admin pode gerenciar todos os códigos
CREATE POLICY "Super admin can manage all invite codes"
ON public.company_invite_codes
FOR ALL
USING (is_super_admin(auth.uid()));

-- Qualquer um pode verificar se um código é válido (para signup)
CREATE POLICY "Anyone can check valid codes for signup"
ON public.company_invite_codes
FOR SELECT
USING (
  is_active = true 
  AND used_at IS NULL 
  AND (expires_at IS NULL OR expires_at > now())
);

-- Criar função para validar código de convite
CREATE OR REPLACE FUNCTION public.validate_company_invite_code(invite_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM company_invite_codes
    WHERE code = invite_code
    AND is_active = true
    AND used_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$;

-- Criar função para marcar código como usado
CREATE OR REPLACE FUNCTION public.use_company_invite_code(invite_code TEXT, company_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE company_invite_codes
  SET used_at = now(), used_by_company_id = company_id
  WHERE code = invite_code
  AND is_active = true
  AND used_at IS NULL
  AND (expires_at IS NULL OR expires_at > now());
  
  RETURN FOUND;
END;
$$;