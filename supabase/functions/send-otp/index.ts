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
  if (cleaned.length < 8 || cleaned.length > 15) throw new Error("Numéro invalide");
  return cleaned;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { telephone, action, code } = body;
    const cleanPhone = sanitizePhone(telephone || '');
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ===== SEND OTP =====
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

      // Invalidate previous codes
      await supabase.from('otp_codes')
        .update({ expires_at: new Date().toISOString() })
        .eq('telephone', cleanPhone)
        .eq('verified', false);

      const otpCode = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      await supabase.from('otp_codes').insert({
        telephone: cleanPhone,
        code: otpCode,
        expires_at: expiresAt,
      });

      // Send via Infobip
      const INFOBIP_API_KEY = Deno.env.get("INFOBIP_API_KEY");
      const INFOBIP_BASE_URL = Deno.env.get("INFOBIP_BASE_URL");
      let smsSent = false;

      if (INFOBIP_API_KEY && INFOBIP_BASE_URL) {
        let formattedPhone = cleanPhone;
        if (!formattedPhone.startsWith('225')) {
          formattedPhone = '225' + formattedPhone;
        }

        try {
          const smsRes = await fetch(`${INFOBIP_BASE_URL}/sms/2/text/advanced`, {
            method: 'POST',
            headers: {
              'Authorization': `App ${INFOBIP_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [{
                destinations: [{ to: formattedPhone }],
                from: "AgriCapital",
                text: `Votre code AgriCapital: ${otpCode}. Valide 5 min. Ne partagez jamais ce code.`,
              }]
            }),
          });
          const smsData = await smsRes.json();
          console.log("Infobip response:", JSON.stringify(smsData));
          smsSent = smsRes.ok;
        } catch (e) {
          console.error("SMS error:", e);
        }
      } else {
        console.log(`[DEV] OTP for ${cleanPhone}: ${otpCode}`);
      }

      await supabase.from('historique_activites').insert({
        table_name: 'otp_codes',
        record_id: cleanPhone,
        action: 'OTP_SENT',
        details: `Code OTP envoyé au ${cleanPhone.slice(0, 4)}****`,
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || 'unknown',
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: smsSent ? "Code envoyé par SMS" : "Code généré",
          ...(!INFOBIP_API_KEY ? { devCode: otpCode } : {})
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== VERIFY OTP =====
    if (action === 'verify') {
      if (!code || typeof code !== 'string' || code.length !== 6) {
        return new Response(
          JSON.stringify({ success: false, error: "Code invalide" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Get latest valid OTP for this phone
      const { data: otpRecord } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('telephone', cleanPhone)
        .eq('verified', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!otpRecord) {
        return new Response(
          JSON.stringify({ success: false, error: "Code expiré ou inexistant. Demandez un nouveau code." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Check max attempts
      if (otpRecord.attempts >= 5) {
        await supabase.from('otp_codes')
          .update({ expires_at: new Date().toISOString() })
          .eq('id', otpRecord.id);

        return new Response(
          JSON.stringify({ success: false, error: "Trop de tentatives. Demandez un nouveau code." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
        );
      }

      // Increment attempts
      await supabase.from('otp_codes')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('id', otpRecord.id);

      if (otpRecord.code !== code) {
        return new Response(
          JSON.stringify({ success: false, error: `Code incorrect. ${4 - otpRecord.attempts} tentative(s) restante(s).` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Mark as verified
      await supabase.from('otp_codes')
        .update({ verified: true })
        .eq('id', otpRecord.id);

      await supabase.from('historique_activites').insert({
        table_name: 'otp_codes',
        record_id: cleanPhone,
        action: 'OTP_VERIFIED',
        details: `Code OTP vérifié pour ${cleanPhone.slice(0, 4)}****`,
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || 'unknown',
      });

      return new Response(
        JSON.stringify({ success: true, message: "Code vérifié" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Action invalide. Utilisez 'send' ou 'verify'." }),
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
