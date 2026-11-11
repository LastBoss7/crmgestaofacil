CREATE TABLE public.commission_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL UNIQUE REFERENCES public.sales(id) ON DELETE RESTRICT,
  seller_id uuid,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  amount numeric(12,2) NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  paid_by uuid NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.commission_payments TO authenticated;
GRANT ALL ON public.commission_payments TO service_role;

ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers view company commission payments" ON public.commission_payments
FOR SELECT TO authenticated
USING (
  public.user_belongs_to_company(auth.uid(), company_id)
  AND (public.has_role(auth.uid(),'CEO') OR public.has_role(auth.uid(),'COORDENADOR') OR public.has_role(auth.uid(),'SUPERVISOR'))
);

CREATE POLICY "CEO registers commission payments" ON public.commission_payments
FOR INSERT TO authenticated
WITH CHECK (
  paid_by = auth.uid()
  AND public.has_role(auth.uid(),'CEO')
  AND public.user_belongs_to_company(auth.uid(), company_id)
);

CREATE POLICY "CEO undoes commission payments" ON public.commission_payments
FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(),'CEO')
  AND public.user_belongs_to_company(auth.uid(), company_id)
);

CREATE INDEX idx_commission_payments_company_paid ON public.commission_payments (company_id, paid_at DESC);
CREATE INDEX idx_commission_payments_seller ON public.commission_payments (seller_id);

CREATE OR REPLACE FUNCTION public.validate_commission_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; expected numeric(12,2);
BEGIN
  SELECT id, company_id, seller_id, status, valor_mensal, commission_rate INTO s FROM public.sales WHERE id = NEW.sale_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venda não encontrada' USING ERRCODE='22023'; END IF;
  IF s.company_id IS DISTINCT FROM NEW.company_id THEN RAISE EXCEPTION 'Venda não pertence à empresa' USING ERRCODE='42501'; END IF;
  IF s.status = 'CANCELADA' THEN RAISE EXCEPTION 'Venda cancelada não gera comissão' USING ERRCODE='22023'; END IF;
  IF auth.uid() IS NOT NULL AND NOT (public.has_role(auth.uid(),'CEO') AND public.user_belongs_to_company(auth.uid(), NEW.company_id)) THEN
    RAISE EXCEPTION 'Somente o CEO da empresa pode registrar pagamentos' USING ERRCODE='42501';
  END IF;
  expected := round(coalesce(s.valor_mensal,0) * coalesce(s.commission_rate,0) / 100, 2);
  IF expected <= 0 THEN RAISE EXCEPTION 'Esta venda não tem comissão a pagar' USING ERRCODE='22023'; END IF;
  IF round(NEW.amount,2) <> expected THEN RAISE EXCEPTION 'Valor pago difere da comissão calculada (%)', expected USING ERRCODE='22023'; END IF;
  NEW.seller_id := s.seller_id;
  NEW.paid_at := now();
  IF NEW.note IS NOT NULL THEN NEW.note := left(btrim(NEW.note), 500); END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.validate_commission_payment() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_commission_payment() TO service_role;

CREATE TRIGGER trg_validate_commission_payment
BEFORE INSERT ON public.commission_payments
FOR EACH ROW EXECUTE FUNCTION public.validate_commission_payment();