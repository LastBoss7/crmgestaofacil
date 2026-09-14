ALTER TABLE public.companies
ADD COLUMN commission_rate numeric(5,2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.validate_company_commission_rate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.commission_rate < 0 OR NEW.commission_rate > 100 THEN
    RAISE EXCEPTION 'A taxa de comissão deve estar entre 0 e 100' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_company_commission_rate
BEFORE INSERT OR UPDATE OF commission_rate ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.validate_company_commission_rate();