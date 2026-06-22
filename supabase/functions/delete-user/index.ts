import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (userId === caller.id) {
      return new Response(
        JSON.stringify({ error: "Você não pode excluir sua própria conta" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Caller role + company
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (!callerRole || !["CEO", "COORDENADOR", "SUPERVISOR"].includes(callerRole.role)) {
      return new Response(
        JSON.stringify({ error: "Sem permissão para excluir usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("company_id")
      .eq("id", caller.id)
      .maybeSingle();

    if (!callerProfile?.company_id) {
      return new Response(JSON.stringify({ error: "Empresa do solicitante não encontrada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Target user must belong to same company
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("company_id, nome, email")
      .eq("id", userId)
      .maybeSingle();

    if (!targetProfile || targetProfile.company_id !== callerProfile.company_id) {
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado na sua empresa" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: targetRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (
      targetRole &&
      ["CEO", "COORDENADOR"].includes(targetRole.role) &&
      callerRole.role !== "CEO"
    ) {
      return new Response(
        JSON.stringify({ error: "Apenas o CEO pode excluir usuários com essa função" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Compute impact (sales + documents) before deletion
    const { data: impactSales } = await supabaseAdmin
      .from("sales")
      .select("documentos")
      .eq("seller_id", userId);
    const salesCount = impactSales?.length ?? 0;
    const documentsCount = (impactSales ?? []).reduce(
      (sum: number, s: any) => sum + (Array.isArray(s.documentos) ? s.documentos.length : 0),
      0
    );

    const { data: callerProfileFull } = await supabaseAdmin
      .from("profiles")
      .select("nome")
      .eq("id", caller.id)
      .maybeSingle();

    await supabaseAdmin
      .from("sales")
      .update({
        seller_name_snapshot: targetProfile.nome,
        seller_removed: true,
      })
      .eq("seller_id", userId);

    await supabaseAdmin.from("coordinator_teams").delete().eq("coordinator_id", userId);
    await supabaseAdmin.from("backoffice_teams").delete().eq("backoffice_id", userId);

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Delete error:", deleteError);
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabaseAdmin.from("user_admin_audit_log").insert({
      company_id: callerProfile.company_id,
      actor_id: caller.id,
      actor_name: callerProfileFull?.nome ?? null,
      actor_role: callerRole.role,
      action: "DELETE",
      target_user_id: userId,
      target_user_name: targetProfile.nome,
      target_user_email: targetProfile.email,
      target_user_role: targetRole?.role ?? null,
      sales_count: salesCount,
      documents_count: documentsCount,
    });

    return new Response(
      JSON.stringify({ success: true, message: `Usuário ${targetProfile.nome} excluído`, salesCount, documentsCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
