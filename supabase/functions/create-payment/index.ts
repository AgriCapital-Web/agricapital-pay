import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Verify a KKiaPay transaction against KKiaPay's own API.
 * This is the ONLY source of truth for whether a payment succeeded.
 * We never trust client-supplied "success" flags, URL params, or amounts.
 */
async function verifyKkiapayTransaction(transactionId: string): Promise<
  | { ok: true; amount: number | null; method: string | null; fees: number; raw: any }
  | { ok: false; reason: string }
> {
  const privateKey = Deno.env.get("KKIAPAY_PRIVATE_KEY");
  if (!privateKey) return { ok: false, reason: "KKIAPAY_PRIVATE_KEY not configured" };
  try {
    const res = await fetch("https://api.kkiapay.me/api/v1/transactions/status", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-private-key": privateKey },
      body: JSON.stringify({ transactionId }),
    });
    const result = await res.json();
    const status = String(result?.status || "").toUpperCase();
    if (status !== "SUCCESS") return { ok: false, reason: `KKiaPay status=${status || "unknown"}` };
    return {
      ok: true,
      amount: typeof result?.amount === "number" ? result.amount : null,
      method: result?.source || null,
      fees: Number(result?.fees || 0),
      raw: result,
    };
  } catch (e: any) {
    return { ok: false, reason: `verify error: ${e?.message || "unknown"}` };
  }
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function resolvePortalClient(supabase: any, token: string): Promise<string> {
  if (!token || typeof token !== "string") throw new Error("Session portail requise");
  const hash = await sha256(token);
  const { data: session, error } = await supabase.from("client_portal_sessions")
    .select("id, client_id").eq("token_hash", hash).is("revoked_at", null)
    .gt("expires_at", new Date().toISOString()).maybeSingle();
  if (error) throw error;
  if (!session) throw new Error("Session portail expirée");
  return session.client_id;
}

async function sendConfirmationSms(phoneRaw: string | null | undefined, message: string) {
  if (!phoneRaw) return;
  const INFOBIP_API_KEY = Deno.env.get("INFOBIP_API_KEY");
  const INFOBIP_BASE_URL = Deno.env.get("INFOBIP_BASE_URL");
  if (!INFOBIP_API_KEY || !INFOBIP_BASE_URL) {
    console.log("[DEV] confirmation SMS:", phoneRaw, message);
    return;
  }
  let phone = String(phoneRaw).replace(/\D/g, "");
  if (!phone.startsWith("225")) phone = "225" + phone;
  try {
    await fetch(`${INFOBIP_BASE_URL}/sms/2/text/advanced`, {
      method: "POST",
      headers: { "Authorization": `App ${INFOBIP_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ destinations: [{ to: phone }], from: "AgriCapital", text: message }] }),
    });
  } catch (e) { console.error("SMS confirmation error:", e); }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // === DI à 0 F : activation automatique sans passer par KKiaPay ===
    // Le montant est recalculé côté serveur depuis la vue v_prix_effectif_offres
    // (prix CRM + promotions). L'activation n'est possible que si le DI effectif est 0.
    if (action === "activate_free") {
      const { client_id, plantation_id, reference } = body;
      if (!client_id || !plantation_id) throw new Error("client_id et plantation_id requis");

      const { data: souscripteur } = await supabase
        .from("clients")
        .select("*, offres(*)")
        .eq("id", client_id)
        .maybeSingle();
      if (!souscripteur) throw new Error("Souscripteur introuvable");

      const { data: plantation } = await supabase
        .from("plantations")
        .select("*")
        .eq("id", plantation_id)
        .eq("client_id", client_id)
        .maybeSingle();
      if (!plantation) throw new Error("Plantation introuvable");

      const { data: effectiveDi, error: priceError } = await supabase
        .rpc("get_subscriber_effective_di", { _client_id: client_id });
      if (priceError) throw priceError;
      const diParHa = Number(effectiveDi ?? souscripteur.offres?.montant_depot_initial_par_ha ?? 0);
      const hectares = Math.max(0, Number(plantation.superficie_ha || 0) - Number(plantation.superficie_activee || 0));
      const diTotal = diParHa * hectares;

      if (diTotal > 0) {
        return new Response(
          JSON.stringify({ success: false, error: "Le Dépôt Initial de cette plantation n'est pas à 0 F.", montant: diTotal }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const ref = reference || `DI0-${Date.now()}`;
      const nowIso = new Date().toISOString();

      const { data: existing } = await supabase
        .from("paiements")
        .select("id, statut")
        .eq("client_id", client_id)
        .eq("plantation_id", plantation_id)
        .eq("est_paiement_initial", true)
        .maybeSingle();

      const payload = {
        client_id,
        plantation_id,
        type_paiement: "DA",
        montant: 0,
        montant_theorique: 0,
        montant_paye: 0,
        statut: "valide",
        mode_paiement: "Promotion",
        reference: ref,
        est_paiement_initial: true,
        date_paiement: nowIso,
        metadata: { payment_provider: "promotion", di_offert: true, di_par_ha: diParHa, hectares },
      };

      let paiementId = existing?.id;
      if (existing) {
        const { error } = await supabase.from("paiements").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase.from("paiements").insert(payload).select("id").single();
        if (error) throw error;
        paiementId = created.id;
      }

      const { data: finalized, error: finalizeError } = await supabase.rpc("finalize_portal_payment", {
        _paiement_id: paiementId,
        _provider_amount: 0,
        _metadata: { payment_provider: "promotion", di_offert: true, activation_source: "client_portal" },
        _validated_at: nowIso,
      });
      if (finalizeError) throw finalizeError;

      try {
        await sendConfirmationSms(
          souscripteur.telephone,
          `AgriCapital: Votre Depot Initial est offert (0 F). Votre plantation est activee. Suivi: client.agricapital.ci`
        );
      } catch (_e) { /* ignore */ }

      return new Response(JSON.stringify({ success: true, activated: true, reference: ref, propagation: finalized }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "insert") {

      const portalClientId = await resolvePortalClient(supabase, body.session_token);
      const { client_id, plantation_id, type_paiement, montant, reference, mode_paiement, metadata } = body;
      if (client_id !== portalClientId) throw new Error("Client non autorisé");
      if (!client_id || !type_paiement || !montant || !reference) {
        throw new Error("Champs requis manquants");
      }
      const isDepotInitial = type_paiement === "DA";
      const paymentPhase = isDepotInitial ? null : (metadata?.phase || (metadata?.annee_tarif ? `annee_${metadata.annee_tarif}` : null));

      if (isDepotInitial && plantation_id) {
        const { data: existingDepot, error: existingError } = await supabase
          .from("paiements")
          .select("id, reference, statut, metadata")
          .eq("client_id", client_id)
          .eq("plantation_id", plantation_id)
          .eq("est_paiement_initial", true)
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
        client_id,
        plantation_id: plantation_id || null,
        type_paiement,
        montant,
        montant_theorique: montant,
        statut: "en_attente",
        mode_paiement: mode_paiement || "Mobile Money",
        reference,
        est_paiement_initial: isDepotInitial,
        phase: paymentPhase,
        metadata: metadata || {},
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, paiement: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "confirm") {
      const { reference, kkiapay_transaction_id, client_debit_amount, fee_absorption_rate } = body;
      if (!reference) throw new Error("Reference requise");

      // SECURITY: A payment can ONLY be confirmed via server-side verification
      // against KKiaPay. The client cannot force a payment into `valide`.
      if (!kkiapay_transaction_id || typeof kkiapay_transaction_id !== "string") {
        throw new Error("kkiapay_transaction_id requis pour confirmer un paiement");
      }

      const verification = await verifyKkiapayTransaction(kkiapay_transaction_id);
      if (!verification.ok) {
        console.warn("Refusing confirm — KKiaPay verification failed:", verification.reason, "ref:", reference);
        return new Response(
          JSON.stringify({ success: false, error: "Transaction non vérifiée par KKiaPay" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: paiementData } = await supabase
        .from("paiements")
        .select("*, plantations(*), clients(telephone, nom_complet)")
        .eq("reference", reference)
        .maybeSingle();

      if (!paiementData) throw new Error("Paiement introuvable");
      // Amount actually charged is what KKiaPay returned, not what the client claims.
      const kkiapayAmount = verification.amount;
      const trustedMontantPaye = typeof kkiapayAmount === "number" ? kkiapayAmount : paiementData.montant;

      const { error: updateError } = await supabase.rpc("finalize_portal_payment", {
        _paiement_id: paiementData.id,
        _transaction_id: kkiapay_transaction_id,
        _provider_amount: trustedMontantPaye,
        _validated_at: new Date().toISOString(),
        _metadata: {
          ...(paiementData.metadata || {}),
          payment_provider: "kkiapay",
          kkiapay_transaction_id,
          kkiapay_amount: kkiapayAmount,
          client_debit_amount: typeof client_debit_amount === "number" ? client_debit_amount : trustedMontantPaye,
          fee_absorption_rate: typeof fee_absorption_rate === "number" ? fee_absorption_rate : (paiementData.metadata?.fee_absorption_rate ?? 0),
          method: verification.method,
          fees: verification.fees,
          verified_at: new Date().toISOString(),
        },
      });

      if (updateError) throw updateError;

      // Legacy repair remains intentionally absent: finalize_portal_payment is
      // the single atomic source of truth for payment and activation propagation.
      if (false && paiementData.type_paiement === "DA" && paiementData.plantation_id) {
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
          .from("clients")
          .select("*, offres(*)")
          .eq("id", paiementData.client_id)
          .maybeSingle();

        if (souscripteur) {
          const debut = new Date();
          const dureeMois = Number(souscripteur.offres?.duree_paiement_mois || 34);
          const fin = new Date(debut);
          fin.setMonth(fin.getMonth() + dureeMois);
          const prochaine = new Date(debut);
          prochaine.setMonth(prochaine.getMonth() + 1);

          await supabase.from("clients").update({
            compte_actif: true,
            da_paye_at: new Date().toISOString(),
            contrat_debut_at: debut.toISOString().slice(0, 10),
            contrat_fin_at: fin.toISOString().slice(0, 10),
            phase_actuelle: "annee_1",
            prochaine_echeance: prochaine.toISOString().slice(0, 10),
          }).eq("id", paiementData.client_id);

          const { count } = await supabase
            .from("paiements")
            .select("id", { count: "exact", head: true })
            .eq("client_id", paiementData.client_id)
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
                  client_id: paiementData.client_id,
                  type_paiement: "REDEVANCE",
                  statut: "en_attente",
                  montant: mensualite,
                  montant_theorique: mensualite,
                  numero_echeance: numero,
                  date_echeance: due.toISOString().slice(0, 10),
                  annee: due.getFullYear(),
                  phase: `annee_${anneeOffre}`,
                  est_paiement_initial: false,
                  metadata: { generated_by: "create-payment", offer_tranche: tranche },
                });
              }
            }
            if (echeances.length > 0) await supabase.from("paiements").insert(echeances);
          }
        }
      }

      // Server-side confirmation SMS (replaces the removed `send_custom` action).
      try {
        const fmt = new Intl.NumberFormat("fr-FR").format(trustedMontantPaye);
        await sendConfirmationSms(
          paiementData.clients?.telephone,
          `AgriCapital: Paiement de ${fmt} F CFA recu (Ref: ${reference}). Merci! Votre recu est disponible sur client.agricapital.ci`
        );
      } catch (e) { console.error("SMS post-confirm error:", e); }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "status") {
      const { reference, transaction_id } = body;
      if (!reference && !transaction_id) throw new Error("Reference requise");
      // SECURITY: this endpoint is unauthenticated (called from the client after
      // return from KKiaPay). Do NOT expose PII (nom_complet, telephone) or
      // subscriber ID by reference — return only the minimum needed to render
      // the payment result UI. Sensitive fields are stripped.
      let query = supabase
        .from("paiements")
        .select("id, reference, statut, montant, montant_paye, type_paiement, mode_paiement, date_paiement, created_at, metadata, plantations(nom_plantation, id_unique, superficie_ha)");
      if (reference) query = query.eq("reference", reference);
      else query = query.or(`kkiapay_transaction_id.eq.${transaction_id},metadata->>kkiapay_transaction_id.eq.${transaction_id}`);
      const { data, error } = await query.maybeSingle();
      if (error) throw error;

      // Strip metadata fields that could leak internal details.
      let safe = data;
      if (data && data.metadata && typeof data.metadata === "object") {
        const md: any = data.metadata;
        safe = {
          ...data,
          metadata: {
            client_debit_amount: md.client_debit_amount ?? null,
            fee_absorption_rate: md.fee_absorption_rate ?? null,
            method: md.method ?? null,
          },
        };
      }
      return new Response(JSON.stringify({ success: true, paiement: safe }), {
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
