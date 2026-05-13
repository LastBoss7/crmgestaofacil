
-- 1. Add column with default 'PJ'
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS client_type text NOT NULL DEFAULT 'PJ';

-- 2. Backfill based on existing document length
UPDATE public.sales
SET client_type = CASE
  WHEN length(regexp_replace(COALESCE(cnpj_cliente, ''), '[^0-9]', '', 'g')) = 11 THEN 'PF'
  ELSE 'PJ'
END;

-- 3. Replace validation trigger to use client_type
CREATE OR REPLACE FUNCTION public.validate_sale_client_document()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  digits_only text;
  digit_count int;
BEGIN
  IF NEW.client_type NOT IN ('PF', 'PJ') THEN
    RAISE EXCEPTION 'client_type inválido: deve ser PF ou PJ (recebido: %)', NEW.client_type
      USING ERRCODE = '22023';
  END IF;

  IF NEW.cnpj_cliente IS NULL OR length(trim(NEW.cnpj_cliente)) = 0 THEN
    RAISE EXCEPTION 'Documento do cliente (CPF/CNPJ) é obrigatório'
      USING ERRCODE = '22023';
  END IF;

  digits_only := regexp_replace(NEW.cnpj_cliente, '[^0-9]', '', 'g');
  digit_count := length(digits_only);

  IF NEW.client_type = 'PF' AND digit_count <> 11 THEN
    RAISE EXCEPTION 'CPF inválido: deve ter 11 dígitos (recebido: % dígitos)', digit_count
      USING ERRCODE = '22023';
  END IF;

  IF NEW.client_type = 'PJ' AND digit_count <> 14 THEN
    RAISE EXCEPTION 'CNPJ inválido: deve ter 14 dígitos (recebido: % dígitos)', digit_count
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_sale_client_document_trigger ON public.sales;

CREATE TRIGGER validate_sale_client_document_trigger
BEFORE INSERT OR UPDATE OF cnpj_cliente, client_type ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.validate_sale_client_document();
