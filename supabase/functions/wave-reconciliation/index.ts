import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('Démarrage de la réconciliation Wave...');

    // Récupérer tous les paiements Wave
    const { data: paiementsWave, error: waveError } = await supabase
      .from('paiements_wave')
      .select('*')
      .order('date_paiement', { ascending: false });

    if (waveError) {
      console.error('Erreur récupération paiements Wave:', waveError);
      throw waveError;
    }

    const resultats: {
      total_verifies: number;
      incoherences: Array<{
        transaction_id: string;
        type: string;
        telephone: string;
        montant: number;
      }>;
      corriges: number;
    } = {
      total_verifies: 0,
      incoherences: [],
      corriges: 0
    };

    // Vérifier chaque paiement Wave
    for (const paiementWave of paiementsWave) {
      resultats.total_verifies++;

      // Vérifier l'existence du souscripteur
      const { data: souscripteur, error: sousError } = await supabase
        .from('souscripteurs')
        .select('id, nom_complet, total_da_verse, total_contributions_versees')
        .eq('id', paiementWave.souscripteur_id)
        .maybeSingle();

      if (sousError || !souscripteur) {
        resultats.incoherences.push({
          transaction_id: paiementWave.transaction_wave_id,
          type: 'souscripteur_introuvable',
          telephone: paiementWave.telephone,
          montant: paiementWave.montant_paye
        });
        continue;
      }

      // Vérifier si le paiement existe dans la table paiements
      const { data: paiementCRM, error: crmError } = await supabase
        .from('paiements')
        .select('id, montant_paye')
        .eq('id_transaction', paiementWave.transaction_wave_id)
        .maybeSingle();

      if (paiementWave.type_paiement === 'droit_acces') {
        // Vérifier cohérence DA
        const { data: plantations } = await supabase
          .from('plantations')
          .select('id, superficie_ha')
          .eq('souscripteur_id', souscripteur.id);

        if (!paiementCRM && plantations && plantations.length > 0) {
          // Paiement Wave existe mais pas dans CRM - créer
          const { error: insertError } = await supabase
            .from('paiements')
            .insert({
              plantation_id: plantations[0].id,
              type_paiement: 'Droit d\'Accès',
              montant_theorique: paiementWave.montant_paye,
              montant_paye: paiementWave.montant_paye,
              date_paiement: paiementWave.date_paiement,
              statut: 'valide',
              mode_paiement: 'wave',
              id_transaction: paiementWave.transaction_wave_id,
              annee: new Date().getFullYear(),
              created_by: souscripteur.id
            });

          if (!insertError) {
            resultats.corriges++;
            console.log('Paiement DA recréé:', paiementWave.transaction_wave_id);
          }
        }
      } else if (paiementWave.type_paiement === 'contribution_annuelle') {
        // Vérifier cohérence contributions
        if (!paiementCRM) {
          const { data: plantations } = await supabase
            .from('plantations')
            .select('id')
            .eq('souscripteur_id', souscripteur.id);

          if (plantations && plantations.length > 0) {
            const tauxJour = 65;
            const nombreMois = paiementWave.montant_paye / tauxJour;

            const { error: insertError } = await supabase
              .from('paiements')
              .insert({
                plantation_id: plantations[0].id,
                type_paiement: 'Contribution Trimestrielle',
                montant_theorique: paiementWave.montant_paye,
                montant_paye: paiementWave.montant_paye,
                nombre_mois: nombreMois,
                date_paiement: paiementWave.date_paiement,
                statut: 'valide',
                mode_paiement: 'wave',
                id_transaction: paiementWave.transaction_wave_id,
                annee: new Date().getFullYear(),
                created_by: souscripteur.id
              });

            if (!insertError) {
              resultats.corriges++;
              console.log('Paiement contribution recréé:', paiementWave.transaction_wave_id);
            }
          }
        }
      }
    }

    console.log('Réconciliation terminée:', resultats);

    return new Response(
      JSON.stringify({
        success: true,
        resultats
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Erreur réconciliation:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Erreur interne du serveur' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
