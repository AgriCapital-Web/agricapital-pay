import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function formatMontant(m: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(m));
}

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.startsWith('225') ? cleaned : '225' + cleaned;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const INFOBIP_API_KEY = Deno.env.get("INFOBIP_API_KEY");
    const INFOBIP_BASE_URL = Deno.env.get("INFOBIP_BASE_URL");
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'arrears'; // 'arrears' | 'upcoming' | 'both'

    const results = { arrears: [] as any[], upcoming: [] as any[], errors: [] as string[] };

    // ===== 1. ARREARS NOTIFICATIONS =====
    if (mode === 'arrears' || mode === 'both') {
      // Get all active plantations with their souscripteur and offre
      const { data: plantations, error: plantErr } = await supabase
        .from('plantations')
        .select('*, souscripteurs(id, nom_complet, telephone, offre_id, offres(contribution_mensuelle_par_ha))')
        .in('statut_global', ['actif', 'active'])
        .not('date_activation', 'is', null)
        .gt('superficie_activee', 0);

      if (plantErr) throw plantErr;

      for (const plant of (plantations || [])) {
        const souscripteur = plant.souscripteurs as any;
        if (!souscripteur?.telephone) continue;

        const offre = souscripteur.offres as any;
        const tarifJour = offre ? Math.round((offre.contribution_mensuelle_par_ha || 0) / 30) : 65;
        const superficie = plant.superficie_activee || 0;

        // Calculate days since activation
        const joursSinceActivation = Math.floor(
          (Date.now() - new Date(plant.date_activation).getTime()) / 86400000
        );
        const montantAttendu = joursSinceActivation * tarifJour * superficie;

        // Get total paid for redevances
        const { data: paiementsData } = await supabase
          .from('paiements')
          .select('montant_paye')
          .eq('plantation_id', plant.id)
          .in('type_paiement', ['REDEVANCE', 'contribution'])
          .eq('statut', 'valide');

        const totalPaye = (paiementsData || []).reduce((s, p) => s + (p.montant_paye || 0), 0);
        const arriere = montantAttendu - totalPaye;

        if (arriere > 1000) { // Only notify if arrears > 1000 FCFA
          const joursRetard = Math.floor(arriere / (tarifJour * superficie));
          
          const message = `AgriCapital: Bonjour ${souscripteur.nom_complet || 'cher client'}, vous avez un arriere de ${formatMontant(arriere)} F CFA (${joursRetard}j) sur ${plant.nom_plantation || plant.id_unique}. Regularisez sur pay.agricapital.ci ou appelez le 05 64 55 17 17.`;

          if (INFOBIP_API_KEY && INFOBIP_BASE_URL) {
            try {
              const smsRes = await fetch(`${INFOBIP_BASE_URL}/sms/2/text/advanced`, {
                method: 'POST',
                headers: {
                  'Authorization': `App ${INFOBIP_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  messages: [{
                    destinations: [{ to: formatPhone(souscripteur.telephone) }],
                    from: "AgriCapital",
                    text: message,
                  }]
                }),
              });
              const smsData = await smsRes.json();
              results.arrears.push({
                souscripteur_id: souscripteur.id,
                plantation_id: plant.id,
                montant_arriere: arriere,
                jours_retard: joursRetard,
                sms_sent: smsRes.ok,
                sms_response: smsData?.messages?.[0]?.status?.name || 'unknown'
              });
            } catch (e: any) {
              results.errors.push(`SMS error for ${souscripteur.telephone}: ${e.message}`);
            }
          } else {
            console.log(`[DEV] Arrears SMS for ${souscripteur.telephone}: ${message}`);
            results.arrears.push({
              souscripteur_id: souscripteur.id,
              plantation_id: plant.id,
              montant_arriere: arriere,
              jours_retard: joursRetard,
              sms_sent: false,
              dev_mode: true
            });
          }

          // Create in-app notification
          if (souscripteur.user_id) {
            await supabase.from('notifications').insert({
              user_id: souscripteur.user_id,
              type: 'arrears_alert',
              title: `Arriéré de ${formatMontant(arriere)} F CFA`,
              message: `Vous avez ${joursRetard} jours de retard sur ${plant.nom_plantation || plant.id_unique}. Régularisez votre situation.`,
              data: { plantation_id: plant.id, montant: arriere, jours: joursRetard }
            });
          }
        }
      }
    }

    // ===== 2. UPCOMING PAYMENT REMINDERS =====
    if (mode === 'upcoming' || mode === 'both') {
      // Get payments with upcoming due dates (next 3 days)
      const now = new Date();
      const in3Days = new Date(Date.now() + 3 * 86400000);

      const { data: upcomingPaiements } = await supabase
        .from('paiements')
        .select('*, souscripteurs(nom_complet, telephone, user_id), plantations(nom_plantation, id_unique)')
        .eq('statut', 'en_attente')
        .gte('date_echeance', now.toISOString().split('T')[0])
        .lte('date_echeance', in3Days.toISOString().split('T')[0]);

      for (const paiement of (upcomingPaiements || [])) {
        const souscripteur = paiement.souscripteurs as any;
        if (!souscripteur?.telephone) continue;

        const plantation = paiement.plantations as any;
        const daysUntil = Math.ceil(
          (new Date(paiement.date_echeance!).getTime() - Date.now()) / 86400000
        );

        const message = `AgriCapital: Rappel - Echeance de ${formatMontant(paiement.montant)} F CFA dans ${daysUntil}j pour ${plantation?.nom_plantation || plantation?.id_unique || 'votre plantation'}. Payez sur pay.agricapital.ci`;

        if (INFOBIP_API_KEY && INFOBIP_BASE_URL) {
          try {
            const smsRes = await fetch(`${INFOBIP_BASE_URL}/sms/2/text/advanced`, {
              method: 'POST',
              headers: {
                'Authorization': `App ${INFOBIP_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messages: [{
                  destinations: [{ to: formatPhone(souscripteur.telephone) }],
                  from: "AgriCapital",
                  text: message,
                }]
              }),
            });
            results.upcoming.push({
              paiement_id: paiement.id,
              montant: paiement.montant,
              jours_restants: daysUntil,
              sms_sent: smsRes.ok
            });
          } catch (e: any) {
            results.errors.push(`Upcoming SMS error: ${e.message}`);
          }
        } else {
          console.log(`[DEV] Upcoming SMS for ${souscripteur.telephone}: ${message}`);
          results.upcoming.push({ paiement_id: paiement.id, montant: paiement.montant, jours_restants: daysUntil, dev_mode: true });
        }

        // In-app notification
        if (souscripteur.user_id) {
          await supabase.from('notifications').insert({
            user_id: souscripteur.user_id,
            type: 'payment_reminder',
            title: `Échéance dans ${daysUntil} jour(s)`,
            message: `${formatMontant(paiement.montant)} F CFA à régler pour ${plantation?.nom_plantation || 'votre plantation'}.`,
            data: { paiement_id: paiement.id, montant: paiement.montant }
          });
        }
      }
    }

    // Log activity
    await supabase.from('historique_activites').insert({
      table_name: 'sms_notifications',
      action: 'SMS_BATCH_SENT',
      details: `Arrears: ${results.arrears.length}, Upcoming: ${results.upcoming.length}, Errors: ${results.errors.length}`,
    });

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("SMS notification error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
