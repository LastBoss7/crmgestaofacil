REVOKE ALL ON FUNCTION public.validate_sale_commission_rate() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_sale_commission_rate() FROM anon;
REVOKE ALL ON FUNCTION public.validate_sale_commission_rate() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.validate_sale_commission_rate() TO service_role;