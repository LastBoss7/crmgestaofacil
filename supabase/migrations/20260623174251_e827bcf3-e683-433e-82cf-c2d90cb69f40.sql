
UPDATE public.sales s
SET seller_email_snapshot = p.email
FROM public.profiles p
WHERE s.seller_id = p.id
  AND (s.seller_email_snapshot IS NULL OR length(trim(s.seller_email_snapshot)) = 0);

CREATE OR REPLACE FUNCTION public.fill_seller_snapshots()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_nome text;
  v_email text;
BEGIN
  IF NEW.seller_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.seller_id IS DISTINCT FROM OLD.seller_id THEN
    SELECT nome, email INTO v_nome, v_email FROM public.profiles WHERE id = NEW.seller_id;
    NEW.seller_name_snapshot := v_nome;
    NEW.seller_email_snapshot := v_email;
    RETURN NEW;
  END IF;

  IF (NEW.seller_name_snapshot IS NULL OR length(trim(NEW.seller_name_snapshot)) = 0)
     OR (NEW.seller_email_snapshot IS NULL OR length(trim(NEW.seller_email_snapshot)) = 0) THEN
    SELECT nome, email INTO v_nome, v_email FROM public.profiles WHERE id = NEW.seller_id;
    IF NEW.seller_name_snapshot IS NULL OR length(trim(NEW.seller_name_snapshot)) = 0 THEN
      NEW.seller_name_snapshot := v_nome;
    END IF;
    IF NEW.seller_email_snapshot IS NULL OR length(trim(NEW.seller_email_snapshot)) = 0 THEN
      NEW.seller_email_snapshot := v_email;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_seller_snapshots ON public.sales;
CREATE TRIGGER trg_fill_seller_snapshots
BEFORE INSERT OR UPDATE OF seller_id ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.fill_seller_snapshots();

CREATE OR REPLACE FUNCTION public.snapshot_seller_name_on_profile_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.sales
  SET seller_name_snapshot = COALESCE(NULLIF(trim(seller_name_snapshot), ''), OLD.nome),
      seller_email_snapshot = COALESCE(NULLIF(trim(seller_email_snapshot), ''), OLD.email),
      seller_removed = true
  WHERE seller_id = OLD.id;
  RETURN OLD;
END;
$$;
