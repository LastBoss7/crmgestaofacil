
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS seller_email_snapshot text;
