CREATE OR REPLACE FUNCTION public.sync_sales_equipe_on_team_rename()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE public.sales
    SET equipe = NEW.name
    WHERE company_id = NEW.company_id
      AND (equipe = OLD.name OR equipe = NEW.id::text);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_sales_equipe_on_team_rename ON public.teams;
CREATE TRIGGER trg_sync_sales_equipe_on_team_rename
AFTER UPDATE OF name ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.sync_sales_equipe_on_team_rename();