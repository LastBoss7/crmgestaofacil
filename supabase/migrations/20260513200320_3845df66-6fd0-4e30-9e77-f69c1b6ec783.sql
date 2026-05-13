
CREATE OR REPLACE FUNCTION public.validate_sale_client_document()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  digits_only text;
  digit_count int;
BEGIN
  IF NEW.cnpj_cliente IS NULL OR length(trim(NEW.cnpj_cliente)) = 0 THEN
    RAISE EXCEPTION 'Documento do cliente (CPF/CNPJ) é obrigatório'
      USING ERRCODE = '22023';
  END IF;

  digits_only := regexp_replace(NEW.cnpj_cliente, '[^0-9]', '', 'g');
  digit_count := length(digits_only);

  IF digit_count <> 11 AND digit_count <> 14 THEN
    RAISE EXCEPTION 'Documento inválido: CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos (recebido: % dígitos)', digit_count
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_sale_client_document_trigger ON public.sales;

CREATE TRIGGER validate_sale_client_document_trigger
BEFORE INSERT OR UPDATE OF cnpj_cliente ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.validate_sale_client_document();
