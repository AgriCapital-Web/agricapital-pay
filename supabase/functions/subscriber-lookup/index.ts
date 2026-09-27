import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-portal-session" };
const normalizePhone = (v: unknown) => String(v ?? "").replace(/\D/g, "").replace(/^00/, "").replace(/^225(?=\d{8,})/, "").replace(/^0+/, "");
const samePhone = (a: unknown, b: unknown) => { const x = normalizePhone(a), y = normalizePhone(b); return !!x && x === y; };

async function verifyPortalSession(token: unknown): Promise<string | null> {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const payload = parts[0], sig = parts[1];
  const raw = Deno.env.get("PORTAL_SESSION_SECRET") || Deno.env.get("SUPABASE_SECRET_KEYS") || "";
  let secret = raw;
  try { if (raw.trim().startsWith("{")) secret = JSON.parse(raw).default || ""; } catch { return null; }
  if (!secret) return null;
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
    const token = req.headers.get("x-portal-session") || body.portal_token;
    const sessionPhone = await verifyPortalSession(token);
    if (!sessionPhone) throw new Error("Session portail invalide ou expirée");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: candidates, error: clientError } = await supabase.from("clients").select("id,telephone").ilike("telephone", "%" + sessionPhone.slice(-8) + "%").limit(50);
    if (clientError) throw clientError;
    const clientMatch = (candidates || []).find((x: any) => x.telephone ? samePhone(x.telephone, sessionPhone) : true);
    let clientId = clientMatch?.id;
    if (!clientId) {
      const { data: clients } = await supabase.from("clients").select("id,telephone").ilike("telephone", "%" + sessionPhone.slice(-8) + "%").limit(50);
      clientId = (clients || []).find((x: any) => samePhone(x.telephone, sessionPhone))?.id;
    }
    if (!clientId) throw new Error("Compte client introuvable");

    const { data: client, error } = await supabase.from("clients").select("*, offres(*), regions(id,nom), departements(id,nom), districts(id,nom), sous_prefectures(id,nom)").eq("id", clientId).eq("compte_actif", true).eq("statut_global", "actif").maybeSingle();
    if (error) throw error;
    if (!client) throw new Error("Compte client non actif");

    const [pRes, payRes, promoRes, commercialRes] = await Promise.all([
      supabase.from("plantations").select("id,id_unique,nom_plantation,superficie_ha,superficie_activee,date_activation,statut,statut_global,phase_actuelle,derniere_visite,prochaine_visite,district_id,region_id,departement_id,sous_prefecture_id,villages_id,created_at").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("paiements").select("id,reference,type_paiement,statut,montant,montant_theorique,montant_paye,mode_paiement,date_paiement,date_echeance,numero_echeance,annee,phase,est_paiement_initial,est_depot_initial,created_at,metadata").eq("client_id", clientId).order("created_at", { ascending: false }).limit(200),
      supabase.from("promotions").select("id,nom,code,pourcentage_reduction,montant_fixe_reduction,date_debut,date_fin,cible,active,applique_toutes_offres,offre_ids").eq("active", true).lte("date_debut", new Date().toISOString()).gte("date_fin", new Date().toISOString()).order("created_at", { ascending: false }).limit(20),
      client.created_by ? supabase.from("profiles").select("nom_complet,telephone,email,photo_url").eq("user_id", client.created_by).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const plantations = pRes.data || [];
    const paiements = payRes.data || [];
    const promotion = (promoRes.data || []).find((p: any) => p.applique_toutes_offres || (Array.isArray(p.offre_ids) && p.offre_ids.includes(client.offre_id))) || null;
    const totalInitial = paiements.filter((p: any) => (p.est_paiement_initial || p.est_depot_initial || p.type_paiement === "DA") && p.statut === "valide").reduce((s: number, p: any) => s + Number(p.montant_paye ?? p.montant ?? 0), 0);
    const totalRedevances = paiements.filter((p: any) => p.type_paiement === "REDEVANCE" && p.statut === "valide").reduce((s: number, p: any) => s + Number(p.montant_paye ?? p.montant ?? 0), 0);
    const safe: any = { ...client, promotion_active: promotion, commercial: commercialRes.data ? { ...commercialRes.data, fonction: "Conseiller AgriCapital" } : null, total_initial_verse: totalInitial, total_redevances: totalRedevances, total_paye: totalInitial + totalRedevances };
    delete safe.user_id; delete safe.created_by; delete safe.updated_by; delete safe.numero_piece; delete safe.fichier_piece_url; delete safe.fichier_piece_recto_url; delete safe.fichier_piece_verso_url; delete safe.numero_compte;
    return new Response(JSON.stringify({ success: true, client: safe, souscripteur: safe, plantations, paiements }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Erreur serveur" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});