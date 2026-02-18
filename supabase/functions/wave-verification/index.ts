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
    // API Key Authentication (add WAVE_API_KEY secret in Lovable Cloud settings)
    const apiKey = req.headers.get('X-API-Key');
    const expectedApiKey = Deno.env.get('WAVE_API_KEY');
    
    if (expectedApiKey && apiKey !== expectedApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized - Invalid API key' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
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

    // Récupérer le numéro de téléphone depuis URL
    const url = new URL(req.url);
    const telephone = url.searchParams.get('telephone');

    // Input validation
    if (!telephone) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Numéro de téléphone requis' 
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

    console.log('Wave verification initiated');

    // Rechercher le souscripteur par téléphone
    const { data: souscripteur, error: sousError } = await supabase
      .from('souscripteurs')
      .select(`
        id,
        nom_complet,
        prenoms,
        telephone,
        total_hectares,
        total_da_verse,
        plantations (
          id,
          superficie_ha
        )
      `)
      .eq('telephone', telephone)
      .maybeSingle();

    if (sousError) {
      console.error('Erreur recherche souscripteur:', sousError);
      throw sousError;
    }

    if (!souscripteur) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Souscripteur non trouvé avec ce numéro' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Calculer la superficie totale
    const superficieTotale = souscripteur.plantations?.reduce(
      (sum: number, p: any) => sum + (p.superficie_ha || 0), 
      0
    ) || 0;

    console.log('Subscriber found, processing payment calculation');

    // Déterminer le type de paiement
    const daTotal = souscripteur.total_da_verse || 0;
    let typePaiement = 'droit_acces';
    let montantRecommande = 0;
    let promotionInfo: any = null;
    let statutContribution = 'a_jour';

    if (daTotal === 0) {
      // Premier paiement = Droit d'Accès
      typePaiement = 'droit_acces';
      
      // Calculer montant DA avec promotion
      const { data: daInfo, error: daError } = await supabase
        .rpc('get_montant_da_wave', { superficie_ha: superficieTotale });

      if (!daError && daInfo && daInfo.length > 0) {
        const info = daInfo[0];
        montantRecommande = info.montant_total;
        
        if (info.promotion_active) {
          promotionInfo = {
            nom: info.nom_promotion,
            reduction_pct: info.reduction_pct,
            montant_unitaire: info.montant_unitaire,
          };
        }
      } else {
        montantRecommande = superficieTotale * 30000;
      }
      
    } else {
      // Paiements suivants = Contribution Annuelle
      typePaiement = 'contribution_annuelle';
      
      // Calculer le total des contributions payées
      const { data: paiements, error: paiError } = await supabase
        .from('paiements')
        .select('montant_paye')
        .eq('plantation_id', souscripteur.plantations?.[0]?.id || null)
        .eq('type_paiement', 'Contribution Trimestrielle');

      const totalContributions = paiements?.reduce(
        (sum: number, p: any) => sum + (p.montant_paye || 0), 
        0
      ) || 0;

      console.log('Contributions calculated');

      // Calculer statut avec la fonction
      const { data: statut, error: statError } = await supabase
        .rpc('calculer_statut_contribution', {
          p_souscripteur_id: souscripteur.id,
          p_montant_total_paye: totalContributions
        });

      if (!statError && statut && statut.length > 0) {
        const s = statut[0];
        statutContribution = s.statut;
        montantRecommande = s.montant_recommande;
        
        console.log('Contribution status calculated');
      } else {
        // Par défaut, suggérer un mois
        montantRecommande = 1900;
        statutContribution = 'en_arriere';
      }
    }

    // Construire la réponse
    const response = {
      success: true,
      souscripteur: {
        nom_complet: `${souscripteur.nom_complet} ${souscripteur.prenoms}`,
        telephone: souscripteur.telephone,
        superficie_totale: superficieTotale,
      },
      type_paiement: typePaiement,
      montant_recommande: montantRecommande,
      statut: statutContribution,
      promotion: promotionInfo,
      message: typePaiement === 'droit_acces' 
        ? 'Premier paiement - Droit d\'Accès' 
        : `Contribution Annuelle - Statut: ${statutContribution}`,
    };

    console.log('Wave verification completed successfully');

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Erreur wave-verification:', error);
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
