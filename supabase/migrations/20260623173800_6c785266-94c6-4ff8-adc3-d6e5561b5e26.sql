
-- Backfill seller_name_snapshot for existing sales whose seller still exists,
-- so we keep a historical name even if the user is deleted later.
UPDATE public.sales s
SET seller_name_snapshot = p.nome
FROM public.profiles p
WHERE s.seller_id = p.id
  AND (s.seller_name_snapshot IS NULL OR length(trim(s.seller_name_snapshot)) = 0);

-- Safety net trigger: if a profile is deleted directly, snapshot the name into sales.
CREATE OR REPLACE FUNCTION public.snapshot_seller_name_on_profile_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.sales
  SET seller_name_snapshot = COALESCE(NULLIF(trim(seller_name_snapshot), ''), OLD.nome),
      seller_removed = true
  WHERE seller_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_seller_name_on_profile_delete ON public.profiles;
CREATE TRIGGER trg_snapshot_seller_name_on_profile_delete
BEFORE DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.snapshot_seller_name_on_profile_delete();
