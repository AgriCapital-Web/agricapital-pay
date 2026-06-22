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

      if (isDepotInitial && plantation_id) {
        const { data: existingDepot, error: existingError } = await supabase
          .from("paiements")
          .select("id, reference, statut, metadata")
          .eq("souscripteur_id", souscripteur_id)
          .eq("plantation_id", plantation_id)
          .eq("est_depot_initial", true)
          .maybeSingle();

        if (existingError) throw existingError;
        if (existingDepot) {
          if (existingDepot.statut === "valide") {
            throw new Error("Le Dépôt Initial de cette plantation est déjà validé.");
          }

          const { data: updatedDepot, error: updateExistingError } = await supabase
            .from("paiements")
            .update({
              type_paiement,
              montant,
              montant_theorique: montant,
              montant_paye: null,
              statut: "en_attente",
              mode_paiement: mode_paiement || "Mobile Money",
              reference,
              phase: paymentPhase,
              metadata: { ...(existingDepot.metadata || {}), ...(metadata || {}), refreshed_for_retry: true },
            })
            .eq("id", existingDepot.id)
            .select()
            .single();

          if (updateExistingError) throw updateExistingError;
          return new Response(JSON.stringify({ success: true, paiement: updatedDepot, reused: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

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

        const { data: souscripteur } = await supabase
          .from("souscripteurs")
          .select("*, offres(*)")
          .eq("id", paiementData.souscripteur_id)
          .maybeSingle();

        if (souscripteur) {
          const debut = new Date();
          const dureeMois = Number(souscripteur.offres?.duree_paiement_mois || 34);
          const fin = new Date(debut);
          fin.setMonth(fin.getMonth() + dureeMois);
          const prochaine = new Date(debut);
          prochaine.setMonth(prochaine.getMonth() + 1);

          await supabase.from("souscripteurs").update({
            compte_actif: true,
            da_paye_at: new Date().toISOString(),
            contrat_debut_at: debut.toISOString().slice(0, 10),
            contrat_fin_at: fin.toISOString().slice(0, 10),
            phase_actuelle: "annee_1",
            prochaine_echeance: prochaine.toISOString().slice(0, 10),
          }).eq("id", paiementData.souscripteur_id);

          const { count } = await supabase
            .from("paiements")
            .select("id", { count: "exact", head: true })
            .eq("souscripteur_id", paiementData.souscripteur_id)
            .eq("type_paiement", "REDEVANCE");

          const tranches = Array.isArray(souscripteur.offres?.tranches_paiement) ? souscripteur.offres.tranches_paiement : [];
          if ((count || 0) === 0 && tranches.length > 0) {
            const echeances: any[] = [];
            let numero = 0;
            for (const tranche of tranches) {
              const mois = Number(tranche?.mois || 0);
              const anneeOffre = Number(tranche?.annee || 1);
              const mensualite = Number(tranche?.mensualite_par_ha || 0) * Number(souscripteur.total_hectares || 0);
              for (let i = 0; i < mois; i++) {
                numero += 1;
                const due = new Date(debut);
                due.setMonth(due.getMonth() + numero);
                echeances.push({
                  souscripteur_id: paiementData.souscripteur_id,
                  type_paiement: "REDEVANCE",
                  statut: "en_attente",
                  montant: mensualite,
                  montant_theorique: mensualite,
                  numero_echeance: numero,
                  date_echeance: due.toISOString().slice(0, 10),
                  annee: due.getFullYear(),
                  phase: `annee_${anneeOffre}`,
                  est_depot_initial: false,
                  metadata: { generated_by: "create-payment", offer_tranche: tranche },
                });
              }
            }
            if (echeances.length > 0) await supabase.from("paiements").insert(echeances);
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "status") {
      const { reference, transaction_id } = body;
      if (!reference && !transaction_id) throw new Error("Reference requise");
      let query = supabase
        .from("paiements")
        .select("id, reference, statut, montant, montant_paye, type_paiement, mode_paiement, date_paiement, created_at, metadata, plantations(nom_plantation, id_unique, superficie_ha), souscripteurs(nom_complet, telephone, id_unique)");
      if (reference) query = query.eq("reference", reference);
      else query = query.or(`kkiapay_transaction_id.eq.${transaction_id},metadata->>kkiapay_transaction_id.eq.${transaction_id}`);
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, paiement: data }), {
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
