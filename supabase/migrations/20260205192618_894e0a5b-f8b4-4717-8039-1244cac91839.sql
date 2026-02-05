
-- Recreate sales_secure view WITH security_invoker to apply RLS from base table
DROP VIEW IF EXISTS public.sales_secure;

CREATE VIEW public.sales_secure 
WITH (security_invoker=on) AS
SELECT 
    id,
    seller_id,
    company_id,
    campaign_id,
    data_venda,
    status,
    valor_mensal,
    equipe,
    tipo_negociacao,
    plano_contratado,
    produtos,
    observacoes_vendedor,
    motivo_pendencia,
    razao_social,
    nome_fantasia,
    contato_responsavel,
    created_at,
    updated_at,
    bl_valor,
    vivo_total_valor,
    movel_valor,
    endereco_rua,
    endereco_numero,
    endereco_bairro,
    endereco_cidade,
    endereco_cep,
    documentos,
    CASE
        WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN cnpj_cliente::text
        ELSE mask_cnpj(cnpj_cliente::text)
    END AS cnpj_cliente,
    CASE
        WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN email
        ELSE mask_email(email)
    END AS email,
    CASE
        WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN telefone_responsavel::text
        ELSE mask_phone(telefone_responsavel::text)
    END AS telefone_responsavel,
    CASE
        WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN telefone_1
        ELSE mask_phone(telefone_1)
    END AS telefone_1,
    CASE
        WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN telefone_2
        ELSE mask_phone(telefone_2)
    END AS telefone_2,
    CASE
        WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN telefone_portabilidade
        ELSE mask_phone(telefone_portabilidade)
    END AS telefone_portabilidade,
    proprietario_nome,
    CASE
        WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN proprietario_cpf
        ELSE mask_cpf(proprietario_cpf)
    END AS proprietario_cpf,
    CASE
        WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN proprietario_rg
        ELSE mask_rg(proprietario_rg)
    END AS proprietario_rg,
    CASE
        WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN proprietario_mae
        ELSE '***PROTEGIDO***'::text
    END AS proprietario_mae,
    CASE
        WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN proprietario_nascimento
        ELSE NULL::date
    END AS proprietario_nascimento,
    gestor_nome,
    CASE
        WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN gestor_cpf
        ELSE mask_cpf(gestor_cpf)
    END AS gestor_cpf,
    CASE
        WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN gestor_rg
        ELSE mask_rg(gestor_rg)
    END AS gestor_rg,
    CASE
        WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN gestor_mae
        ELSE '***PROTEGIDO***'::text
    END AS gestor_mae,
    CASE
        WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN gestor_nascimento
        ELSE NULL::date
    END AS gestor_nascimento,
    cedente_nome,
    CASE
        WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN cedente_cpf
        ELSE mask_cpf(cedente_cpf)
    END AS cedente_cpf,
    CASE
        WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN cedente_rg
        ELSE mask_rg(cedente_rg)
    END AS cedente_rg,
    CASE
        WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN cedente_mae
        ELSE '***PROTEGIDO***'::text
    END AS cedente_mae,
    CASE
        WHEN can_view_sensitive_data(auth.uid(), seller_id) THEN cedente_nascimento
        ELSE NULL::date
    END AS cedente_nascimento
FROM public.sales;
