// Integration test: snapshot do vendedor persiste após exclusão do usuário.
//
// Pré-requisitos (no arquivo .env da raiz):
//   VITE_SUPABASE_URL=...
//   VITE_SUPABASE_PUBLISHABLE_KEY=...
//   SUPABASE_SERVICE_ROLE_KEY=...
//   TEST_CEO_EMAIL=...           (CEO existente com vínculo a uma empresa)
//   TEST_CEO_PASSWORD=...
//
// Rodar: deno test --allow-env --allow-net --allow-read supabase/functions/delete-user/index.test.ts

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CEO_EMAIL = Deno.env.get("TEST_CEO_EMAIL")!;
const CEO_PASSWORD = Deno.env.get("TEST_CEO_PASSWORD")!;

assertExists(SUPABASE_URL, "VITE_SUPABASE_URL ausente");
assertExists(SUPABASE_ANON_KEY, "VITE_SUPABASE_PUBLISHABLE_KEY ausente");
assertExists(SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY ausente");
assertExists(CEO_EMAIL, "TEST_CEO_EMAIL ausente");
assertExists(CEO_PASSWORD, "TEST_CEO_PASSWORD ausente");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

Deno.test("vendedor excluído: nome/email continuam persistidos na venda", async () => {
  // ---- 1) Autentica como CEO para descobrir company_id / team_id ----
  const ceoClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: signIn, error: signErr } = await ceoClient.auth
    .signInWithPassword({ email: CEO_EMAIL, password: CEO_PASSWORD });
  assertEquals(signErr, null, `CEO sign-in falhou: ${signErr?.message}`);
  const ceoUserId = signIn.user!.id;
  const ceoAccessToken = signIn.session!.access_token;

  const { data: ceoProfile } = await admin
    .from("profiles")
    .select("company_id, team_id")
    .eq("id", ceoUserId)
    .single();
  assertExists(ceoProfile?.company_id, "CEO sem company_id");

  // Garante uma team válida da empresa
  let teamId = ceoProfile.team_id as string | null;
  let teamName = "Equipe Teste";
  if (!teamId) {
    const { data: team } = await admin
      .from("teams")
      .select("id, name")
      .eq("company_id", ceoProfile.company_id)
      .limit(1)
      .maybeSingle();
    if (team) {
      teamId = team.id;
      teamName = team.name;
    }
  } else {
    const { data: team } = await admin
      .from("teams")
      .select("name")
      .eq("id", teamId)
      .single();
    teamName = team?.name ?? teamName;
  }
  assertExists(teamId, "Empresa sem nenhuma equipe para o teste");

  // ---- 2) Cria vendedor de teste via Admin API ----
  const sellerEmail = `seller.test+${crypto.randomUUID().slice(0, 8)}@example.com`;
  const sellerName = `Vendedor Teste ${Date.now()}`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: sellerEmail,
    password: crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { nome: sellerName },
  });
  assertEquals(createErr, null, `Erro ao criar vendedor: ${createErr?.message}`);
  const sellerId = created.user!.id;

  try {
    // Vincula perfil à empresa/equipe do CEO (handle_new_user cria o profile básico)
    const { error: upErr } = await admin
      .from("profiles")
      .update({
        company_id: ceoProfile.company_id,
        team_id: teamId,
        nome: sellerName,
        email: sellerEmail,
      })
      .eq("id", sellerId);
    assertEquals(upErr, null, `Erro ao vincular perfil: ${upErr?.message}`);

    await admin.from("user_roles").upsert(
      { user_id: sellerId, role: "VENDEDOR" },
      { onConflict: "user_id,role" },
    );

    // ---- 3) Insere venda em nome do vendedor ----
    const cnpj = "12345678000199";
    const { data: sale, error: insErr } = await admin
      .from("sales")
      .insert({
        seller_id: sellerId,
        company_id: ceoProfile.company_id,
        equipe: teamName,
        cnpj_cliente: cnpj,
        client_type: "PJ",
        razao_social: "Cliente Teste LTDA",
        valor_mensal: 100,
        status: "EM_AUDITORIA",
      })
      .select("id, seller_name_snapshot, seller_email_snapshot, seller_removed")
      .single();
    assertEquals(insErr, null, `Erro ao inserir venda: ${insErr?.message}`);
    const saleId = sale!.id as string;

    // Trigger BEFORE INSERT deve preencher os snapshots na hora do cadastro
    assertEquals(sale!.seller_name_snapshot, sellerName, "snapshot de nome ausente no insert");
    assertEquals(sale!.seller_email_snapshot, sellerEmail, "snapshot de e-mail ausente no insert");
    assertEquals(sale!.seller_removed, false);

    try {
      // ---- 4) Chama a edge function delete-user como CEO ----
      const delResp = await fetch(`${SUPABASE_URL}/functions/v1/delete-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ceoAccessToken}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ userId: sellerId }),
      });
      const delBody = await delResp.json();
      assertEquals(delResp.status, 200, `delete-user falhou: ${JSON.stringify(delBody)}`);
      assertEquals(delBody.success, true);

      // ---- 5) Verifica que o usuário sumiu ----
      const { data: gone } = await admin.auth.admin.getUserById(sellerId);
      assert(!gone?.user, "auth.users ainda contém o vendedor");

      const { data: profileGone } = await admin
        .from("profiles")
        .select("id")
        .eq("id", sellerId)
        .maybeSingle();
      assertEquals(profileGone, null, "profile não foi removido");

      // ---- 6) A venda persiste e os snapshots continuam intactos via API ----
      const { data: persisted, error: readErr } = await admin
        .from("sales")
        .select(
          "id, seller_id, seller_name_snapshot, seller_email_snapshot, seller_removed",
        )
        .eq("id", saleId)
        .single();
      assertEquals(readErr, null, `Erro ao reler venda: ${readErr?.message}`);
      assertExists(persisted, "venda sumiu após exclusão do usuário");
      assertEquals(persisted!.seller_name_snapshot, sellerName);
      assertEquals(persisted!.seller_email_snapshot, sellerEmail);
      assertEquals(persisted!.seller_removed, true);
    } finally {
      await admin.from("sales").delete().eq("id", saleId);
    }
  } finally {
    // Cleanup: se o teste falhar antes do delete-user, remove o vendedor manualmente
    const { data: stillThere } = await admin.auth.admin.getUserById(sellerId);
    if (stillThere?.user) {
      await admin.auth.admin.deleteUser(sellerId);
    }
    await ceoClient.auth.signOut();
  }
});
