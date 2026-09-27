import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

async function verifyPortalSession(token: unknown): Promise<string | null> {
  if (typeof token !== "string" || token.length < 40) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const tokenHash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
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
  return data.client_id as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const clientId = await verifyPortalSession(body.session_token || req.headers.get("x-portal-session"));
    if (!clientId) throw new Error("Session portail invalide ou expirée");
    const action = body.action || "list";

    if (action === "list") {
      const { data, error } = await supabase.from("portail_messages").select("id, client_id, plantation_id, auteur_type, sujet, contenu, statut, lu_client_at, lu_staff_at, created_at, updated_at").eq("client_id", clientId).order("created_at", { ascending: true }).limit(100);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, messages: data || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "send") {
      const contenu = String(body.contenu || "").trim();
      if (!contenu || contenu.length > 4000) throw new Error("Message invalide");
      const sujet = String(body.sujet || "").trim().slice(0, 180) || null;
      const plantationId = body.plantation_id || null;
      if (plantationId) {
        const { data: p } = await supabase.from("plantations").select("id").eq("id", plantationId).eq("client_id", clientId).maybeSingle();
        if (!p) throw new Error("Plantation non autorisée");
      }
      const { data, error } = await supabase.from("portail_messages").insert({ client_id: clientId, plantation_id: plantationId, auteur_type: "client", sujet, contenu, statut: "nouveau" }).select("id, client_id, plantation_id, auteur_type, sujet, contenu, statut, lu_client_at, lu_staff_at, created_at, updated_at").single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "read") {
      const messageId = body.message_id;
      if (!messageId) throw new Error("message_id requis");
      const { error } = await supabase.from("portail_messages").update({ lu_client_at: new Date().toISOString() }).eq("id", messageId).eq("client_id", clientId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error("Action inconnue");
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error?.message || "Erreur serveur" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});