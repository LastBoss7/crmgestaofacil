import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: callerError } = await supabase.auth.getUser();
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const userId = (body?.userId ?? "").toString().trim();
    const newEmail = (body?.newEmail ?? "").toString().trim().toLowerCase();

    if (!userId || !newEmail) {
      return new Response(
        JSON.stringify({ error: "userId e newEmail são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!EMAIL_REGEX.test(newEmail) || newEmail.length > 255) {
      return new Response(
        JSON.stringify({ error: "E-mail inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Caller permissions + same company
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", caller.id).maybeSingle();
    if (!callerRole || !["CEO", "COORDENADOR", "SUPERVISOR"].includes(callerRole.role)) {
      return new Response(
        JSON.stringify({ error: "Sem permissão para alterar e-mail" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles").select("company_id").eq("id", caller.id).maybeSingle();
    if (!callerProfile?.company_id) {
      return new Response(JSON.stringify({ error: "Empresa do solicitante não encontrada" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: targetProfile } = await supabaseAdmin
      .from("profiles").select("company_id, nome, email").eq("id", userId).maybeSingle();
    if (!targetProfile || targetProfile.company_id !== callerProfile.company_id) {
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado na sua empresa" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Only CEO can change e-mail of CEO/COORDENADOR
    const { data: targetRole } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", userId).maybeSingle();
    if (
      targetRole && ["CEO", "COORDENADOR"].includes(targetRole.role) &&
      callerRole.role !== "CEO"
    ) {
      return new Response(
        JSON.stringify({ error: "Apenas o CEO pode alterar o e-mail desse usuário" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (targetProfile.email?.toLowerCase() === newEmail) {
      return new Response(
        JSON.stringify({ success: true, message: "Nenhuma alteração necessária" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Extra server-side check: e-mail must be unique within the same company.
    // Case-insensitive match on profiles.email, excluding the target user.
    const { data: conflict, error: conflictErr } = await supabaseAdmin
      .from("profiles")
      .select("id, nome")
      .eq("company_id", callerProfile.company_id)
      .neq("id", userId)
      .ilike("email", newEmail)
      .maybeSingle();

    if (conflictErr) {
      console.error("Conflict check error:", conflictErr);
      return new Response(
        JSON.stringify({ error: "Não foi possível validar o e-mail. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (conflict) {
      return new Response(
        JSON.stringify({
          error: `Este e-mail já está em uso por outro usuário da empresa${conflict.nome ? ` (${conflict.nome})` : ""}. Escolha um e-mail diferente.`,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }


    // Update auth user (auto-confirm so the new e-mail is immediately usable)
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: newEmail,
      email_confirm: true,
    });
    if (authErr) {
      const msg = authErr.message?.toLowerCase().includes("already")
        ? "Este e-mail já está em uso por outro usuário"
        : authErr.message || "Erro ao atualizar e-mail";
      return new Response(JSON.stringify({ error: msg }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mirror change on profiles
    await supabaseAdmin.from("profiles").update({ email: newEmail }).eq("id", userId);

    // Audit log
    const { data: callerProfileFull } = await supabaseAdmin
      .from("profiles").select("nome").eq("id", caller.id).maybeSingle();

    await supabaseAdmin.from("user_admin_audit_log").insert({
      company_id: callerProfile.company_id,
      actor_id: caller.id,
      actor_name: callerProfileFull?.nome ?? null,
      actor_role: callerRole.role,
      action: "UPDATE_EMAIL",
      target_user_id: userId,
      target_user_name: targetProfile.nome,
      target_user_email: newEmail,
      target_user_role: targetRole?.role ?? null,
    });

    return new Response(
      JSON.stringify({ success: true, message: "E-mail atualizado" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("update-user-email error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
