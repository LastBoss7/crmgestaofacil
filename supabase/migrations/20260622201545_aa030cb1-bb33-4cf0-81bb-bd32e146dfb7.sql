CREATE TABLE public.user_admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  actor_name text,
  actor_role text,
  action text NOT NULL CHECK (action IN ('DELETE','DEACTIVATE','REACTIVATE')),
  target_user_id uuid NOT NULL,
  target_user_name text,
  target_user_email text,
  target_user_role text,
  sales_count integer NOT NULL DEFAULT 0,
  documents_count integer NOT NULL DEFAULT 0,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.user_admin_audit_log TO authenticated;
GRANT ALL ON public.user_admin_audit_log TO service_role;

ALTER TABLE public.user_admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view audit log of their company"
ON public.user_admin_audit_log
FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'CEO'::app_role)
    OR public.has_role(auth.uid(), 'COORDENADOR'::app_role)
    OR public.has_role(auth.uid(), 'SUPERVISOR'::app_role)
  )
);

CREATE INDEX idx_user_admin_audit_log_company ON public.user_admin_audit_log(company_id, created_at DESC);
CREATE INDEX idx_user_admin_audit_log_target ON public.user_admin_audit_log(target_user_id);