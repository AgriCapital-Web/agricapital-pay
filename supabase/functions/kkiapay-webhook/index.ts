import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-kkiapay-signature",
};

serve(async (req) => {
  console.log("=== KKiaPay Webhook received ===");
  console.log("Method:", req.method);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the raw body
    const body = await req.json();
    console.log("Webhook payload:", JSON.stringify(body, null, 2));
    
    // KKiaPay sends:
    // - status: "SUCCESS" | "FAILED" | "PENDING"
    // - transactionId: string
    // - amount: number
    // - fees: number
    // - source: string (payment method)
    // - data: object (custom data sent during payment)
    
    const { 
      status, 
      transactionId, 
      amount, 
      fees,
      source,
      data,
      performed_at
    } = body;

    console.log(`Transaction ${transactionId}: Status=${status}, Amount=${amount}, Fees=${fees}`);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Extract reference from custom data
    const reference = data?.reference;
    const paiementId = data?.paiement_id;
    
    if (!reference && !paiementId) {
      console.log("No reference or paiement_id in webhook data, searching by transaction ID");
    }

    // Find the payment record
    let query = supabase.from('paiements').select('*');
    
    if (reference) {
      query = query.eq('reference', reference);
    } else if (paiementId) {
      query = query.eq('id', paiementId);
    } else {
      // Try to find by transaction ID in metadata
      query = query.eq('fedapay_transaction_id', transactionId);
    }
    
    const { data: paiementRecords, error: findError } = await query;
    
    if (findError) {
      console.error("Error finding payment:", findError);
      throw findError;
    }
    
    let paiement = paiementRecords?.[0];
    
    // If not found by reference, try finding by transaction ID
    if (!paiement && transactionId) {
      const { data: byTxn } = await supabase
        .from('paiements')
        .select('*')
        .contains('metadata', { kkiapay_transaction_id: transactionId });
      
      paiement = byTxn?.[0];
    }
    
    if (!paiement) {
      console.log("Payment record not found for webhook");
      // Still return 200 to acknowledge receipt
      return new Response(
        JSON.stringify({ success: true, message: "No matching payment found, webhook acknowledged" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
    console.log("Found payment record:", paiement.id);
    
    // Map KKiaPay status to our status
    let newStatus: string;
    switch (status?.toUpperCase()) {
      case "SUCCESS":
        newStatus = "valide";
        break;
      case "FAILED":
        newStatus = "echoue";
        break;
      case "PENDING":
        newStatus = "en_attente";
        break;
      default:
        newStatus = paiement.statut; // Keep current status
    }
    
    // Update the payment record
    const updateData: any = {
      statut: newStatus,
      fedapay_transaction_id: transactionId,
      updated_at: new Date().toISOString(),
      metadata: {
        ...(paiement.metadata || {}),
        kkiapay_transaction_id: transactionId,
        kkiapay_status: status,
        method: source || data?.method,
        fees: fees || 0,
        performed_at: performed_at || new Date().toISOString(),
        webhook_received_at: new Date().toISOString()
      }
    };
    
    // If payment succeeded, set the payment date and amount
    if (newStatus === "valide") {
      updateData.date_paiement = new Date().toISOString();
      updateData.montant_paye = amount || paiement.montant;
      
      // Calculate the "monnaie" (excess payment)
      const excessAmount = (amount || 0) - (paiement.montant || 0);
      if (excessAmount > 0) {
        updateData.metadata.monnaie = excessAmount;
      }
      
      // If it's a DA payment, update the plantation's activated area
      if (paiement.type_paiement === 'DA' && paiement.plantation_id) {
        const { data: plantation } = await supabase
          .from('plantations')
          .select('superficie_ha, superficie_activee, montant_da')
          .eq('id', paiement.plantation_id)
          .single();
        
        if (plantation) {
          const superficieRestante = (plantation.superficie_ha || 0) - (plantation.superficie_activee || 0);
          const nouvelleSuperificieActivee = (plantation.superficie_activee || 0) + superficieRestante;
          
          await supabase
            .from('plantations')
            .update({
              superficie_activee: nouvelleSuperificieActivee,
              date_activation: new Date().toISOString(),
              statut_global: 'active',
              montant_da: (plantation.montant_da || 0) + amount,
              updated_at: new Date().toISOString()
            })
            .eq('id', paiement.plantation_id);
          
          console.log(`Plantation ${paiement.plantation_id} activated: ${nouvelleSuperificieActivee} ha`);
        }
      }
      
      // Update souscripteur total_da_verse if DA payment
      if (paiement.type_paiement === 'DA' && paiement.souscripteur_id) {
        const { data: souscripteur } = await supabase
          .from('souscripteurs')
          .select('total_da_verse')
          .eq('id', paiement.souscripteur_id)
          .single();
        
        if (souscripteur) {
          await supabase
            .from('souscripteurs')
            .update({
              total_da_verse: (souscripteur.total_da_verse || 0) + amount,
              statut_global: 'actif',
              updated_at: new Date().toISOString()
            })
            .eq('id', paiement.souscripteur_id);
          
          console.log(`Souscripteur ${paiement.souscripteur_id} DA total updated`);
        }
      }
    }
    
    const { error: updateError } = await supabase
      .from('paiements')
      .update(updateData)
      .eq('id', paiement.id);
    
    if (updateError) {
      console.error("Error updating payment:", updateError);
      throw updateError;
    }
    
    console.log(`Payment ${paiement.id} updated to status: ${newStatus}`);
    
    // Log the webhook event for audit
    await supabase
      .from('fedapay_events')
      .insert({
        event_type: 'kkiapay_webhook',
        event_id: transactionId,
        transaction_id: transactionId,
        transaction_reference: reference,
        status: status,
        amount: amount,
        paiement_id: paiement.id,
        raw_payload: body,
        processed: true,
        processed_at: new Date().toISOString()
      });
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Webhook processed successfully",
        paiement_id: paiement.id,
        new_status: newStatus
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
    
  } catch (error: any) {
    console.error("KKiaPay webhook error:", error);
    
    // Always return 200 to acknowledge webhook receipt
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Webhook processing error",
        acknowledged: true
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
