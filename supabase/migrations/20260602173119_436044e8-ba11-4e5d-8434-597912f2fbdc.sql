CREATE OR REPLACE FUNCTION public.validate_sale_cancellation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'CANCELADA'::sale_status
     AND (NEW.motivo_cancelamento IS NULL OR length(trim(NEW.motivo_cancelamento)) = 0) THEN
    RAISE EXCEPTION 'Motivo do cancelamento é obrigatório quando o status é CANCELADA'
      USING ERRCODE = '22023';
  END IF;

  IF NEW.status <> 'CANCELADA'::sale_status THEN
    NEW.motivo_cancelamento := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_sale_cancellation ON public.sales;
CREATE TRIGGER trg_validate_sale_cancellation
BEFORE INSERT OR UPDATE OF status, motivo_cancelamento ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.validate_sale_cancellation();