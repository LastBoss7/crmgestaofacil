
CREATE OR REPLACE FUNCTION public.enforce_company_user_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.company_id IS NOT DISTINCT FROM NEW.company_id THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.profiles
  WHERE company_id = NEW.company_id
    AND id <> NEW.id;

  IF v_count >= 20 THEN
    RAISE EXCEPTION 'Limite de 20 usuários por empresa atingido'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_company_user_limit_trg ON public.profiles;
CREATE TRIGGER enforce_company_user_limit_trg
BEFORE INSERT OR UPDATE OF company_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_company_user_limit();
