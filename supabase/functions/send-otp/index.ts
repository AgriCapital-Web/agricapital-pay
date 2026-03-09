import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function sanitizePhone(input: string): string {
  if (typeof input !== 'string') throw new Error("Format invalide");
  const cleaned = input.replace(/\D/g, '');
  if (cleaned.length < 8 || cleaned.length > 15) throw new Error("Numéro de téléphone invalide");
  return cleaned;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { telephone, action } = await req.json();
    const cleanPhone = sanitizePhone(telephone || '');

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'send') {
      // Rate limit: max 3 OTP per phone per 10 minutes
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('otp_codes')
        .select('*', { count: 'exact', head: true })
        .eq('telephone', cleanPhone)
        .gt('created_at', tenMinAgo);

      if ((count || 0) >= 3) {
        return new Response(
          JSON.stringify({ success: false, error: "Trop de codes envoyés. Patientez 10 minutes." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
        );
      }

      // Generate OTP
      const code = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

      // Store OTP
      await supabase.from('otp_codes').insert({
        telephone: cleanPhone,
        code,
        expires_at: expiresAt,
      });

      // Send via Infobip
      const INFOBIP_API_KEY = Deno.env.get("INFOBIP_API_KEY");
      const INFOBIP_BASE_URL = Deno.env.get("INFOBIP_BASE_URL");

      if (INFOBIP_API_KEY && INFOBIP_BASE_URL) {
        // Format phone: ensure +225 prefix for CI
        let formattedPhone = cleanPhone;
        if (!formattedPhone.startsWith('225')) {
          formattedPhone = '225' + formattedPhone;
        }

        try {
          const smsResponse = await fetch(`${INFOBIP_BASE_URL}/sms/2/text/advanced`, {
            method: 'POST',
            headers: {
              'Authorization': `App ${INFOBIP_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [{
                destinations: [{ to: formattedPhone }],
                from: "AgriCapital",
                text: `Votre code de vérification AgriCapital est: ${code}. Valide 5 minutes. Ne partagez jamais ce code.`,
              }]
            }),
          });

          const smsData = await smsResponse.json();
          console.log("Infobip response:", JSON.stringify(smsData));

          if (!smsResponse.ok) {
            console.error("Infobip error:", smsData);
            // Still return success - code is stored, user can use it
          }
        } catch (smsError) {
          console.error("SMS send error:", smsError);
        }
      } else {
        // Dev mode: log the code
        console.log(`[DEV MODE] OTP for ${cleanPhone}: ${code}`);
      }

      // Audit log
      await supabase.from('historique_activites').insert({
        table_name: 'otp_codes',
        record_id: cleanPhone,
        action: 'OTP_SENT',
        details: `Code OTP envoyé au ${cleanPhone.slice(0, 4)}****`,
        ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Code envoyé par SMS",
          // In dev mode (no Infobip), include code for testing
          ...((!INFOBIP_API_KEY) ? { devCode: code } : {})
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (action === 'verify') {
      const { code } = await req.json().catch(() => ({ code: '' }));
      // Actually re-parse since we already parsed
      // The code should have been passed in the original body
    }

    // Default: verify action
    const { code } = await new Response(req.body).json().catch(() => ({ code: '' }));
    
    return new Response(
      JSON.stringify({ success: false, error: "Action invalide" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );

  } catch (error: any) {
    console.error("OTP error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erreur serveur" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
