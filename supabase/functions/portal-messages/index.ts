import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-portal-session",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPortalSession(token: unknown): Promise<{ clientId: string; sessionId: string } | null> {
  if (typeof token !== "string" || token.length < 40) return null;
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const tokenHash = await sha256(token);
  const { data, error } = await supabase.from("client_portal_sessions")
    .select("id, client_id, expires_at")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error || !data) return null;
  await supabase.from("client_portal_sessions").update({
    last_seen_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
  }).eq("id", data.id);
  return { clientId: data.client_id, sessionId: data.id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const session = await verifyPortalSession(body.access_token || body.session_token || req.headers.get("x-portal-session"));
    if (!session) throw new Error("Session portail invalide ou expirée.");

    const action = body.action || "list";

    if (action === "list") {
      const { data, error } = await supabase.from("portail_messages")
        .select("id, client_id, plantation_id, auteur_user_id, auteur_type, auteur_nom, message, lu, created_at")
        .eq("client_id", session.clientId)
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, messages: data || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "send") {
      const message = String(body.message || body.contenu || "").trim();
      if (!message || message.length > 4000) throw new Error("Message invalide.");
      const plantationId = body.plantation_id || null;
      if (plantationId) {
        const { data: plantation } = await supabase.from("plantations").select("id")
          .eq("id", plantationId).eq("client_id", session.clientId).maybeSingle();
        if (!plantation) throw new Error("Plantation non autorisée.");
      }
      const { data: client } = await supabase.from("clients").select("nom_complet").eq("id", session.clientId).maybeSingle();
      const { data, error } = await supabase.from("portail_messages").insert({
        client_id: session.clientId,
        plantation_id: plantationId,
        auteur_type: "client",
        auteur_nom: client?.nom_complet || "Client",
        message,
        lu: false,
      }).select("id, client_id, plantation_id, auteur_user_id, auteur_type, auteur_nom, message, lu, created_at").single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "mark_read" || action === "read") {
      let query = supabase.from("portail_messages").update({ lu: true })
        .eq("client_id", session.clientId).eq("auteur_type", "staff").eq("lu", false);
      if (body.message_id) query = query.eq("id", body.message_id);
      const { error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error("Action inconnue.");
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error?.message || "Erreur serveur." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
