import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

async function verifyPortalSession(token: unknown): Promise<string | null> {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const raw = Deno.env.get("PORTAL_SESSION_SECRET") || Deno.env.get("SUPABASE_SECRET_KEYS") || "";
  let secret = raw;
  try { if (raw.trim().startsWith("{")) secret = JSON.parse(raw).default || ""; } catch { return null; }
  if (!payload || !sig || !secret) return null;
  try {
    const pad = payload.length % 4 ? "=".repeat(4 - payload.length % 4) : "";
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/") + pad);
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const sigPad = sig.length % 4 ? "=".repeat(4 - sig.length % 4) : "";
    const signature = Uint8Array.from(atob(sig.replace(/-/g, "+").replace(/_/g, "/") + sigPad), c => c.charCodeAt(0));
    if (!(await crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(payload)))) return null;
    const data = JSON.parse(decoded);
    return data?.p && typeof data.exp === "number" && data.exp * 1000 > Date.now() ? String(data.p) : null;
  } catch { return null; }
}
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const sessionPhone = await verifyPortalSession(body.portal_token || req.headers.get("x-portal-session"));\n    if (!sessionPhone) throw new Error("Session portail invalide ou expirée");\n    const { data: clients } = await supabase.from("clients").select("id,telephone").ilike("telephone", "%" + sessionPhone.slice(-8) + "%").limit(50);\n    const clientId = (clients || []).find((x: any) => String(x.telephone || "").replace(/\\D/g, "").replace(/^225/, "").replace(/^0+/, "") === sessionPhone)?.id;\n    if (!clientId) throw new Error("Compte client introuvable");
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