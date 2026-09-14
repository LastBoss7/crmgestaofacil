import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'JSON inválido no corpo da requisição' }, 400);
  }

  const { sale_id, updates } = body ?? {};
  const actorId = String(claimsData.claims.sub ?? '');

  if (!sale_id || typeof sale_id !== 'string') {
    return json({ error: 'sale_id é obrigatório e deve ser string (uuid)' }, 400);
  }
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    return json({ error: 'updates é obrigatório e deve ser um objeto' }, 400);
  }

  if ('commission_rate' in updates) {
    const rate = Number(updates.commission_rate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      return json({ error: 'A taxa de comissão deve estar entre 0 e 100', field: 'commission_rate' }, 400);
    }

    const [{ data: actorProfile }, { data: actorRole }, { data: sale }] = await Promise.all([
      supabase.from('profiles').select('company_id').eq('id', actorId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', actorId).maybeSingle(),
      supabase.from('sales').select('company_id').eq('id', sale_id).maybeSingle(),
    ]);
    if (actorRole?.role !== 'CEO' || !actorProfile?.company_id || actorProfile.company_id !== sale?.company_id) {
      return json({ error: 'Somente o CEO da empresa pode alterar a taxa de comissão da venda' }, 403);
    }
    updates.commission_rate = rate;
  }

  // --- Validação client_type ---
  if ('client_type' in updates) {
    const ct = updates.client_type;
    if (ct !== 'PF' && ct !== 'PJ') {
      return json(
        { error: `client_type inválido: deve ser 'PF' ou 'PJ' (recebido: ${JSON.stringify(ct)})`, field: 'client_type' },
        400,
      );
    }
  }

  // --- Validação cruzada com cnpj_cliente quando presente ---
  if ('cnpj_cliente' in updates || 'client_type' in updates) {
    let docDigits: string | null = null;
    if ('cnpj_cliente' in updates) {
      if (typeof updates.cnpj_cliente !== 'string' || updates.cnpj_cliente.trim() === '') {
        return json({ error: 'cnpj_cliente não pode ser vazio', field: 'cnpj_cliente' }, 400);
      }
      docDigits = updates.cnpj_cliente.replace(/\D/g, '');
    }

    let effectiveType: 'PF' | 'PJ' | null = null;
    if ('client_type' in updates) {
      effectiveType = updates.client_type;
    } else {
      const { data: existing } = await supabase
        .from('sales')
        .select('client_type')
        .eq('id', sale_id)
        .maybeSingle();
      if (existing?.client_type === 'PF' || existing?.client_type === 'PJ') {
        effectiveType = existing.client_type;
      }
    }

    if (docDigits !== null && effectiveType) {
      if (effectiveType === 'PF' && docDigits.length !== 11) {
        return json(
          { error: `CPF inválido: deve ter 11 dígitos (recebido: ${docDigits.length})`, field: 'cnpj_cliente' },
          400,
        );
      }
      if (effectiveType === 'PJ' && docDigits.length !== 14) {
        return json(
          { error: `CNPJ inválido: deve ter 14 dígitos (recebido: ${docDigits.length})`, field: 'cnpj_cliente' },
          400,
        );
      }
    }
  }

  // --- Aplicar update (RLS garante autorização) ---
  const { data, error } = await supabase
    .from('sales')
    .update(updates)
    .eq('id', sale_id)
    .select()
    .maybeSingle();

  if (error) {
    // Erros do trigger do banco (errcode 22023) também viram 400
    const status = (error as any).code === '22023' ? 400 : (error as any).code === '42501' ? 403 : 500;
    return json({ error: error.message, code: (error as any).code ?? null }, status);
  }
  if (!data) {
    return json({ error: 'Venda não encontrada ou sem permissão de atualização' }, 404);
  }

  return json({ sale: data }, 200);
});
