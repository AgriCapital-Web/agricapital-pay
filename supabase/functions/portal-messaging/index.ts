import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, "0")).join("");
}

async function getSession(supabase: any, token: string) {
  if (!token) throw new Error("Session portail manquante.");
  const tokenHash = await sha256(token);
  const { data: session, error } = await supabase
    .from("client_portal_sessions")
    .select("client_id, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error) throw error;
  if (!session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) {
    throw new Error("Session portail expirée. Veuillez vous reconnecter.");
  }
  await supabase.from("client_portal_sessions").update({ last_seen_at: new Date().toISOString() }).eq("token_hash", tokenHash);
  return session;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "POST requis." }, 405);

  try {
    const body = await req.json();
    const token = String(body?.access_token || "");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
    const session = await getSession(supabase, token);
    const clientId = session.client_id;
    const action = String(body?.action || "list");

    if (action === "list") {
      const plantationId = body?.plantation_id ? String(body.plantation_id) : null;
      let query = supabase
        .from("portail_messages")
        .select("id, client_id, plantation_id, auteur_user_id, auteur_type, auteur_nom, message, lu, created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: true })
        .limit(500);
      if (plantationId) query = query.eq("plantation_id", plantationId);
      const { data: messages, error } = await query;
      if (error) throw error;
      return json({ success: true, messages: messages || [] });
    }

    if (action === "send") {
      const message = String(body?.message || "").trim();
      if (!message || message.length > 4000) return json({ success: false, error: "Le message doit contenir entre 1 et 4 000 caractères." }, 400);
      const plantationId = body?.plantation_id ? String(body.plantation_id) : null;

      if (plantationId) {
        const { data: plantation } = await supabase
          .from("plantations")
          .select("id")
          .eq("id", plantationId)
          .eq("client_id", clientId)
          .maybeSingle();
        if (!plantation) return json({ success: false, error: "Plantation non autorisée." }, 403);
      }

      const { data: client } = await supabase.from("clients").select("nom_complet").eq("id", clientId).maybeSingle();
      const { data: row, error } = await supabase
        .from("portail_messages")
        .insert({
          client_id: clientId,
          plantation_id: plantationId,
          auteur_type: "client",
          auteur_nom: client?.nom_complet || "Client",
          message,
          lu: false,
        })
        .select("id, client_id, plantation_id, auteur_user_id, auteur_type, auteur_nom, message, lu, created_at")
        .single();
      if (error) throw error;

      return json({ success: true, message: row });
    }

    if (action === "mark_read") {
      const plantationId = body?.plantation_id ? String(body.plantation_id) : null;
      let query = supabase
        .from("portail_messages")
        .update({ lu: true })
        .eq("client_id", clientId)
        .eq("auteur_type", "staff")
        .eq("lu", false);
      if (plantationId) query = query.eq("plantation_id", plantationId);
      const { error } = await query;
      if (error) throw error;
      return json({ success: true });
    }

    return json({ success: false, error: "Action de messagerie inconnue." }, 400);
  } catch (error: any) {
    console.error("portal-messaging:", error);
    return json({ success: false, error: error?.message || "Erreur serveur." }, 500);
  }
});
