
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS seller_name_snapshot text,
  ADD COLUMN IF NOT EXISTS seller_removed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.sales.seller_name_snapshot IS 'Snapshot do nome do vendedor preservado quando o usuário é excluído';
COMMENT ON COLUMN public.sales.seller_removed IS 'Indica que o vendedor original não faz mais parte da equipe';
