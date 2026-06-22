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
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create regular client to verify the caller
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the calling user
    const { data: { user: caller }, error: callerError } = await supabase.auth.getUser();
    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller has permission (CEO or SUPERVISOR)
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (!callerRole || (callerRole.role !== "CEO" && callerRole.role !== "COORDENADOR" && callerRole.role !== "SUPERVISOR")) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Only CEO, COORDENADOR or SUPERVISOR can create users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get caller's company_id
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("company_id, team_id")
      .eq("id", caller.id)
      .single();

    if (!callerProfile?.company_id) {
      return new Response(
        JSON.stringify({ error: "Caller has no company" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get request body
    const { email, password, nome, role, teamId } = await req.json();

    if (!email || !password || !nome || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enforce company user limit (max 20 users per company)
    const { count: companyUserCount, error: countError } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("company_id", callerProfile.company_id);

    if (countError) {
      console.error("Count error:", countError);
    } else if ((companyUserCount ?? 0) >= 20) {
      return new Response(
        JSON.stringify({ error: "Limite de 20 usuários por empresa atingido. Remova um usuário antes de criar outro." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role permissions
    // CEO can create any role, COORDENADOR and SUPERVISOR can create SELLER, BACKOFFICE, SUPERVISOR
    const allowedRoles = callerRole.role === "CEO" 
      ? ["CEO", "COORDENADOR", "SUPERVISOR", "BACKOFFICE", "SELLER"]
      : ["SELLER", "BACKOFFICE", "SUPERVISOR"];

    if (!allowedRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: `Cannot create user with role: ${role}` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Roles that require a team_id (COORDENADOR does not require team - CEO assigns teams separately)
    const rolesRequiringTeam = ["SUPERVISOR", "BACKOFFICE", "SELLER"];
    if (rolesRequiringTeam.includes(role) && !teamId) {
      // For SUPERVISOR/COORDENADOR creating SELLER, use their own team if not specified
      if ((callerRole.role === "SUPERVISOR" || callerRole.role === "COORDENADOR") && role === "SELLER" && callerProfile.team_id) {
        // Will use caller's team_id below
      } else {
        return new Response(
          JSON.stringify({ error: `É obrigatório selecionar uma equipe para ${role}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate that the team belongs to the same company
    if (teamId) {
      const { data: teamData, error: teamError } = await supabaseAdmin
        .from("teams")
        .select("id, company_id")
        .eq("id", teamId)
        .single();

      if (teamError || !teamData) {
        return new Response(
          JSON.stringify({ error: "Equipe não encontrada" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (teamData.company_id !== callerProfile.company_id) {
        return new Response(
          JSON.stringify({ error: "Equipe não pertence à sua empresa" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Create user using admin API (doesn't affect current session)
    // IMPORTANT: Using admin.createUser() ensures no session is created for the new user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: { nome },
    });

    if (authError) {
      console.error("Auth error:", authError);
      if (authError.message?.includes("already been registered")) {
        return new Response(
          JSON.stringify({ error: "Este e-mail já está cadastrado" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: "Failed to create user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = authData.user.id;

    // Determine team_id
    let finalTeamId = teamId || null;
    if (!finalTeamId && (callerRole.role === "SUPERVISOR" || callerRole.role === "COORDENADOR") && role === "SELLER") {
      finalTeamId = callerProfile.team_id;
    }

    // Update profile with company_id, nome and team_id
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        company_id: callerProfile.company_id,
        nome: nome,
        team_id: finalTeamId,
      })
      .eq("id", newUserId);

    if (profileError) {
      console.error("Profile error:", profileError);
    }

    // Insert user role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: newUserId,
        role: role,
      });

    if (roleError) {
      console.error("Role error:", roleError);
      return new Response(
        JSON.stringify({ error: "User created but failed to assign role", userId: newUserId }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return success without any auth data (prevents client-side session interference)
    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: newUserId,
        userName: nome,
        message: `Usuário ${nome} criado com sucesso`
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
