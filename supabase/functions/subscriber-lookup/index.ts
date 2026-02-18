import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { telephone } = await req.json();

    if (!telephone) {
      throw new Error("Le numéro de téléphone est requis");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Normalize phone number - remove all non-digits
    const cleanPhone = telephone.replace(/\D/g, '');
    
    // Try multiple formats for matching
    const phoneVariants = [
      cleanPhone,
      cleanPhone.startsWith('225') ? cleanPhone.slice(3) : cleanPhone,
      cleanPhone.startsWith('0') ? cleanPhone.slice(1) : '0' + cleanPhone,
    ];

    console.log("Searching subscriber with phone variants:", phoneVariants);

    let souscripteur = null;

    for (const phone of phoneVariants) {
      const { data, error } = await supabase
        .from("souscripteurs")
        .select(`
          *,
          offres (id, nom, code, montant_da_par_ha, contribution_mensuelle_par_ha, couleur, description, avantages),
          regions (id, nom),
          departements (id, nom),
          districts (id, nom),
          sous_prefectures (id, nom)
        `)
        .eq("telephone", phone)
        .maybeSingle();

      if (data) {
        souscripteur = data;
        break;
      }
    }

    if (!souscripteur) {
      return new Response(
        JSON.stringify({ success: false, error: "Aucun compte trouvé avec ce numéro" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    console.log("Found subscriber:", souscripteur.id, souscripteur.nom_complet);

    // Fetch plantations
    const { data: plantations } = await supabase
      .from("plantations")
      .select(`
        *,
        regions (id, nom),
        departements (id, nom),
        districts (id, nom),
        sous_prefectures (id, nom)
      `)
      .eq("souscripteur_id", souscripteur.id)
      .order("created_at", { ascending: false });

    // Fetch paiements
    const plantationIds = (plantations || []).map((p: any) => p.id);
    let paiements: any[] = [];
    
    if (plantationIds.length > 0) {
      const { data: paiementsData } = await supabase
        .from("paiements")
        .select("*")
        .or(`souscripteur_id.eq.${souscripteur.id},plantation_id.in.(${plantationIds.join(',')})`)
        .order("created_at", { ascending: false });
      
      paiements = paiementsData || [];
    } else {
      // Also check paiements by souscripteur_id alone
      const { data: paiementsData } = await supabase
        .from("paiements")
        .select("*")
        .eq("souscripteur_id", souscripteur.id)
        .order("created_at", { ascending: false });
      
      paiements = paiementsData || [];
    }

    // Calculate total_da_verse from paiements (column doesn't exist in DB)
    const totalDAVerse = paiements
      .filter((p: any) => p.type_paiement === 'DA' && p.statut === 'valide')
      .reduce((sum: number, p: any) => sum + (p.montant_paye || p.montant || 0), 0);

    // Calculate total redevances
    const totalRedevances = paiements
      .filter((p: any) => (p.type_paiement === 'REDEVANCE' || p.type_paiement === 'contribution') && p.statut === 'valide')
      .reduce((sum: number, p: any) => sum + (p.montant_paye || p.montant || 0), 0);

    // Enrich souscripteur with computed fields
    souscripteur.total_da_verse = totalDAVerse;
    souscripteur.total_redevances = totalRedevances;

    console.log(`Subscriber data: ${plantations?.length || 0} plantations, ${paiements.length} paiements, DA=${totalDAVerse}`);

    return new Response(
      JSON.stringify({
        success: true,
        souscripteur,
        plantations: plantations || [],
        paiements
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Subscriber lookup error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erreur serveur" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
