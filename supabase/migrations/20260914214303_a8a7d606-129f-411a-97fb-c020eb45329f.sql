ALTER TABLE public.sales
ADD COLUMN commission_rate numeric(5,2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.validate_sale_commission_rate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_company_id uuid;
BEGIN
  IF NEW.commission_rate < 0 OR NEW.commission_rate > 100 THEN
    RAISE EXCEPTION 'A taxa de comissão da venda deve estar entre 0 e 100'
      USING ERRCODE = '22023';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.commission_rate IS DISTINCT FROM 0 THEN
      SELECT company_id INTO v_actor_company_id
      FROM public.profiles
      WHERE id = auth.uid();

      IF auth.uid() IS NULL
         OR NOT public.has_role(auth.uid(), 'CEO'::public.app_role)
         OR v_actor_company_id IS DISTINCT FROM NEW.company_id THEN
        RAISE EXCEPTION 'Somente o CEO da empresa pode definir a taxa de comissão da venda'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  ELSIF NEW.commission_rate IS DISTINCT FROM OLD.commission_rate THEN
    SELECT company_id INTO v_actor_company_id
    FROM public.profiles
    WHERE id = auth.uid();

    IF auth.uid() IS NULL
       OR NOT public.has_role(auth.uid(), 'CEO'::public.app_role)
       OR v_actor_company_id IS DISTINCT FROM NEW.company_id
       OR NEW.company_id IS DISTINCT FROM OLD.company_id THEN
      RAISE EXCEPTION 'Somente o CEO da empresa pode alterar a taxa de comissão da venda'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_sale_commission_rate
BEFORE INSERT OR UPDATE OF commission_rate ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.validate_sale_commission_rate();

CREATE OR REPLACE VIEW public.sales_secure WITH (security_invoker=on) AS
SELECT id, seller_id, company_id, campaign_id, data_venda, status, valor_mensal, equipe,
  tipo_negociacao, plano_contratado, produtos, observacoes_vendedor, motivo_pendencia,
  razao_social, nome_fantasia, contato_responsavel, created_at, updated_at,
  bl_valor, vivo_total_valor, movel_valor,
  endereco_rua, endereco_numero, endereco_bairro, endereco_cidade, endereco_cep, documentos,
  CASE WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN cnpj_cliente::text ELSE mask_cnpj(cnpj_cliente::text) END AS cnpj_cliente,
  CASE WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN email ELSE mask_email(email) END AS email,
  CASE WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN telefone_responsavel::text ELSE mask_phone(telefone_responsavel::text) END AS telefone_responsavel,
  CASE WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN telefone_1 ELSE mask_phone(telefone_1) END AS telefone_1,
  CASE WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN telefone_2 ELSE mask_phone(telefone_2) END AS telefone_2,
  CASE WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN telefone_portabilidade ELSE mask_phone(telefone_portabilidade) END AS telefone_portabilidade,
  proprietario_nome,
  CASE WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN proprietario_cpf ELSE mask_cpf(proprietario_cpf) END AS proprietario_cpf,
  CASE WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN proprietario_rg ELSE mask_rg(proprietario_rg) END AS proprietario_rg,
  CASE WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN proprietario_mae ELSE '***PROTEGIDO***'::text END AS proprietario_mae,
  CASE WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN proprietario_nascimento ELSE NULL::date END AS proprietario_nascimento,
  gestor_nome,
  CASE WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN gestor_cpf ELSE mask_cpf(gestor_cpf) END AS gestor_cpf,
  CASE WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN gestor_rg ELSE mask_rg(gestor_rg) END AS gestor_rg,
  CASE WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN gestor_mae ELSE '***PROTEGIDO***'::text END AS gestor_mae,
  CASE WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN gestor_nascimento ELSE NULL::date END AS gestor_nascimento,
  cedente_nome,
  CASE WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN cedente_cpf ELSE mask_cpf(cedente_cpf) END AS cedente_cpf,
  CASE WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN cedente_rg ELSE mask_rg(cedente_rg) END AS cedente_rg,
  CASE WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN cedente_mae ELSE '***PROTEGIDO***'::text END AS cedente_mae,
  CASE WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN cedente_nascimento ELSE NULL::date END AS cedente_nascimento,
  client_type, motivo_cancelamento, commission_rate
FROM public.sales;