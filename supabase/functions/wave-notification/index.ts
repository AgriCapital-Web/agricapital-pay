import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Webhook Signature Verification (add WAVE_WEBHOOK_SECRET in Lovable Cloud settings)
    const signature = req.headers.get('X-Wave-Signature');
    const webhookSecret = Deno.env.get('WAVE_WEBHOOK_SECRET');
    
    if (webhookSecret && signature) {
      const body = await req.text();
      const encoder = new TextEncoder();
      const data = encoder.encode(body + webhookSecret);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      if (signature !== expectedSignature) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid webhook signature' 
          }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Re-parse body after verification
      var { transaction_id, telephone, montant, date_paiement, type_paiement, donnees_supplementaires } = JSON.parse(body);
    } else {
      // No signature verification configured - parse normally
      var { transaction_id, telephone, montant, date_paiement, type_paiement, donnees_supplementaires } = await req.json();
    }

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

    console.log('Wave notification received');

    // Input Validation
    if (!transaction_id || !telephone || !montant) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Données de paiement incomplètes' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate transaction ID format
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(transaction_id)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Format de transaction ID invalide' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate phone number format (10 digits)
    if (!/^\d{10}$/.test(telephone)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Format de téléphone invalide. Doit être 10 chiffres.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate amount (positive, reasonable range)
    if (typeof montant !== 'number' || montant <= 0 || montant > 50000000) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Montant invalide. Doit être entre 1 et 50,000,000 FCFA.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate type_paiement
    const validTypes = ['droit_acces', 'contribution_annuelle'];
    if (type_paiement && !validTypes.includes(type_paiement)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Type de paiement invalide' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Vérifier si la transaction existe déjà
    const { data: existingTrans, error: checkError } = await supabase
      .from('paiements_wave')
      .select('id')
      .eq('transaction_wave_id', transaction_id)
      .maybeSingle();

    if (existingTrans) {
      console.log('Duplicate transaction detected');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Transaction déjà enregistrée' 
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Rechercher le souscripteur
    const { data: souscripteur, error: sousError } = await supabase
      .from('souscripteurs')
      .select(`
        id,
        nom_complet,
        total_da_verse,
        plantations (
          id,
          superficie_ha
        )
      `)
      .eq('telephone', telephone)
      .maybeSingle();

    if (sousError || !souscripteur) {
      console.error('Subscriber not found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Souscripteur non trouvé' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Subscriber identified, processing payment');

    // Enregistrer le paiement Wave
    const { data: paiementWave, error: waveError } = await supabase
      .from('paiements_wave')
      .insert({
        transaction_wave_id: transaction_id,
        telephone: telephone,
        souscripteur_id: souscripteur.id,
        montant_paye: montant,
        type_paiement: type_paiement || 'droit_acces',
        date_paiement: date_paiement || new Date().toISOString(),
        statut: 'valide',
        donnees_wave: donnees_supplementaires || {}
      })
      .select()
      .single();

    if (waveError) {
      console.error('Erreur enregistrement paiement Wave:', waveError);
      throw waveError;
    }

    console.log('Wave payment recorded successfully');

    // Mettre à jour le CRM selon le type de paiement
    if (type_paiement === 'droit_acces') {
      // Mise à jour du Droit d'Accès
      const nouveauDA = (souscripteur.total_da_verse || 0) + montant;
      
      const { error: updateSousError } = await supabase
        .from('souscripteurs')
        .update({
          total_da_verse: nouveauDA
        })
        .eq('id', souscripteur.id);

      if (updateSousError) {
        console.error('Erreur mise à jour DA:', updateSousError);
        throw updateSousError;
      }

      // Enregistrer dans la table paiements standard
      if (souscripteur.plantations && souscripteur.plantations.length > 0) {
        const plantationId = souscripteur.plantations[0].id;
        
        const { error: paiementError } = await supabase
          .from('paiements')
          .insert({
            plantation_id: plantationId,
            type_paiement: 'Droit d\'Accès',
            montant_theorique: montant,
            montant_paye: montant,
            date_paiement: date_paiement || new Date().toISOString(),
            statut: 'valide',
            mode_paiement: 'wave',
            id_transaction: transaction_id,
            annee: new Date().getFullYear(),
            created_by: souscripteur.id
          });

        if (paiementError) {
          console.error('Erreur enregistrement paiement DA:', paiementError);
        }
      }

      console.log('Access right payment processed');

    } else if (type_paiement === 'contribution_annuelle') {
      // Contribution Annuelle
      const tauxJour = 65;
      const nombreMois = montant / tauxJour;

      if (souscripteur.plantations && souscripteur.plantations.length > 0) {
        const plantationId = souscripteur.plantations[0].id;
        
        const { error: contribError } = await supabase
          .from('paiements')
          .insert({
            plantation_id: plantationId,
            type_paiement: 'Contribution Trimestrielle',
            montant_theorique: montant,
            montant_paye: montant,
            nombre_mois: nombreMois,
            date_paiement: date_paiement || new Date().toISOString(),
            statut: 'valide',
            mode_paiement: 'wave',
            id_transaction: transaction_id,
            annee: new Date().getFullYear(),
            created_by: souscripteur.id
          });

        if (contribError) {
          console.error('Erreur enregistrement contribution:', contribError);
          throw contribError;
        }
      }

      // Mise à jour du total contributions
      const { error: updateContribError } = await supabase
        .from('souscripteurs')
        .update({
          total_contributions_versees: (souscripteur.total_da_verse || 0) + montant
        })
        .eq('id', souscripteur.id);

      if (updateContribError) {
        console.error('Erreur mise à jour contributions:', updateContribError);
      }

      console.log('Annual contribution processed');
    }

    // Réponse de succès
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Paiement enregistré avec succès',
        paiement_id: paiementWave.id,
        souscripteur_id: souscripteur.id,
        type_paiement: type_paiement,
        montant: montant
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Erreur wave-notification:', error);
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
