import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "insert") {
      const { souscripteur_id, plantation_id, type_paiement, montant, reference, mode_paiement, metadata } = body;
      if (!souscripteur_id || !type_paiement || !montant || !reference) {
        throw new Error("Champs requis manquants");
      }
      const isDepotInitial = type_paiement === "DA";
      const paymentPhase = isDepotInitial ? null : (metadata?.phase || (metadata?.annee_tarif ? `annee_${metadata.annee_tarif}` : null));
      const { data, error } = await supabase.from("paiements").insert({
        souscripteur_id,
        plantation_id: plantation_id || null,
        type_paiement,
        montant,
        montant_theorique: montant,
        statut: "en_attente",
        mode_paiement: mode_paiement || "Mobile Money",
        reference,
        est_depot_initial: isDepotInitial,
        phase: paymentPhase,
        metadata: metadata || {},
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, paiement: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "confirm") {
      const { reference, kkiapay_transaction_id, montant_paye, method, fees } = body;
      if (!reference) throw new Error("Reference requise");

      const { data: paiementData } = await supabase
        .from("paiements")
        .select("*, plantations(*)")
        .eq("reference", reference)
        .maybeSingle();

      if (!paiementData) throw new Error("Paiement introuvable");

      const { error: updateError } = await supabase.from("paiements").update({
        statut: "valide",
        date_paiement: new Date().toISOString(),
        montant_paye: montant_paye || paiementData.montant,
        kkiapay_transaction_id: kkiapay_transaction_id || paiementData.kkiapay_transaction_id || null,
        metadata: {
          ...(paiementData.metadata || {}),
          payment_provider: "kkiapay",
          kkiapay_transaction_id,
          method: method || null,
          fees: fees || 0,
        },
      }).eq("reference", reference);

      if (updateError) throw updateError;

      // If DI, activate plantation
      if (paiementData.type_paiement === "DA" && paiementData.plantation_id) {
        const p = paiementData.plantations;
        if (p) {
          await supabase.from("plantations").update({
            superficie_activee: p.superficie_ha,
            date_activation: new Date().toISOString(),
            statut: "active",
            statut_global: "actif",
          }).eq("id", paiementData.plantation_id);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Action inconnue");
  } catch (e: any) {
    console.error("create-payment error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
