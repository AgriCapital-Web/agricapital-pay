import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// === SECURITY: Input validation ===
function sanitizePhone(input: string): string {
  if (typeof input !== 'string') throw new Error("Format invalide");
  const cleaned = input.replace(/\D/g, '');
  if (cleaned.length < 8 || cleaned.length > 15) throw new Error("Numéro de téléphone invalide");
  return cleaned;
}

// === SECURITY: Rate limiting ===
async function checkRateLimit(supabase: any, identifier: string, maxAttempts = 5, windowMinutes = 15): Promise<{ allowed: boolean; retryAfter?: number }> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  
  // Check if blocked
  const { data: blocked } = await supabase
    .from('rate_limits')
    .select('blocked_until')
    .eq('identifier', identifier)
    .eq('action', 'login')
    .gt('blocked_until', new Date().toISOString())
    .maybeSingle();

  if (blocked?.blocked_until) {
    const retryAfter = Math.ceil((new Date(blocked.blocked_until).getTime() - Date.now()) / 1000);
    return { allowed: false, retryAfter };
  }

  // Count recent attempts
  const { count } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('identifier', identifier)
    .eq('action', 'login')
    .gt('first_attempt_at', windowStart);

  if ((count || 0) >= maxAttempts) {
    // Block for 30 minutes
    await supabase.from('rate_limits').insert({
      identifier,
      action: 'login',
      blocked_until: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
    return { allowed: false, retryAfter: 1800 };
  }

  // Record attempt
  await supabase.from('rate_limits').insert({ identifier, action: 'login' });
  return { allowed: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // === SECURITY: Validate input ===
    if (!body || typeof body !== 'object') {
      throw new Error("Corps de requête invalide");
    }
    
    const cleanPhone = sanitizePhone(body.telephone || '');

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // === SECURITY: Rate limiting ===
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 'unknown';
    const rateLimitKey = `${clientIP}:${cleanPhone}`;
    
    const rateCheck = await checkRateLimit(supabase, rateLimitKey);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Trop de tentatives. Réessayez dans ${Math.ceil((rateCheck.retryAfter || 1800) / 60)} minutes.` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
      );
    }

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
      // Log failed attempt for audit
      await supabase.from('historique_activites').insert({
        table_name: 'souscripteurs',
        record_id: 'lookup_failed',
        action: 'LOOKUP_FAILED',
        details: `Tentative de connexion échouée pour le numéro: ${cleanPhone.slice(0, 4)}****`,
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || 'unknown',
      });

      return new Response(
        JSON.stringify({ success: false, error: "Aucun compte trouvé avec ce numéro" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Log successful lookup for audit
    await supabase.from('historique_activites').insert({
      table_name: 'souscripteurs',
      record_id: souscripteur.id,
      action: 'PORTAIL_LOGIN',
      details: `Connexion au portail souscripteur: ${souscripteur.nom_complet || souscripteur.id_unique}`,
      ip_address: clientIP,
      user_agent: req.headers.get('user-agent') || 'unknown',
    });

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
      const { data: paiementsData } = await supabase
        .from("paiements")
        .select("*")
        .eq("souscripteur_id", souscripteur.id)
        .order("created_at", { ascending: false });
      
      paiements = paiementsData || [];
    }

    // Calculate totals
    const totalDAVerse = paiements
      .filter((p: any) => p.type_paiement === 'DA' && p.statut === 'valide')
      .reduce((sum: number, p: any) => sum + (p.montant_paye || p.montant || 0), 0);

    const totalRedevances = paiements
      .filter((p: any) => (p.type_paiement === 'REDEVANCE' || p.type_paiement === 'contribution') && p.statut === 'valide')
      .reduce((sum: number, p: any) => sum + (p.montant_paye || p.montant || 0), 0);

    souscripteur.total_da_verse = totalDAVerse;
    souscripteur.total_redevances = totalRedevances;
    souscripteur.total_paiements = paiements.filter((p: any) => p.statut === 'valide').length;
    souscripteur.total_paye = totalDAVerse + totalRedevances;

    // Compute per-plantation arrears (default to PalmInvest An 1 daily rate if no offer)
    const tarifJour = souscripteur.offres?.contribution_mensuelle_par_ha 
      ? (souscripteur.offres.contribution_mensuelle_par_ha / 30) 
      : 2000;

    let totalArrieres = 0;
    const plantationsEnriched = (plantations || []).map((p: any) => {
      if (p.date_activation && (p.superficie_activee || 0) > 0) {
        const jours = Math.floor((Date.now() - new Date(p.date_activation).getTime()) / 86400000);
        const attendu = jours * tarifJour * (p.superficie_activee || 0);
        const paye = paiements
          .filter((pay: any) => pay.plantation_id === p.id && (pay.type_paiement === 'REDEVANCE' || pay.type_paiement === 'contribution') && pay.statut === 'valide')
          .reduce((sum: number, pay: any) => sum + (pay.montant_paye || pay.montant || 0), 0);
        
        const arriere = Math.max(0, attendu - paye);
        totalArrieres += arriere;
        return { ...p, _arriere: arriere, _jours_retard: arriere > 0 ? Math.floor(arriere / (tarifJour * (p.superficie_activee || 1))) : 0 };
      }
      return { ...p, _arriere: 0, _jours_retard: 0 };
    });

    souscripteur.total_arrieres = totalArrieres;

    // === Sanitize sensitive fields before returning ===
    delete souscripteur.fichier_piece_url;
    delete souscripteur.fichier_piece_recto_url;
    delete souscripteur.fichier_piece_verso_url;
    delete souscripteur.numero_piece;
    delete souscripteur.user_id;
    delete souscripteur.created_by;
    delete souscripteur.updated_by;

    console.log(`Subscriber data: ${plantationsEnriched.length} plantations, ${paiements.length} paiements, DA=${totalDAVerse}, Arriérés=${totalArrieres}`);

    return new Response(
      JSON.stringify({
        success: true,
        souscripteur,
        plantations: plantationsEnriched,
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
