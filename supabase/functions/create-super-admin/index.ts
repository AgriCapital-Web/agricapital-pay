import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { username, email, password, nom_complet, telephone, photo_url } = await req.json();
    console.log('Creating/updating super admin:', { username, email, nom_complet });

    let userId: string | undefined;

    // Check if user already exists
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existingUser = listData?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

    if (existingUser) {
      userId = existingUser.id;
      console.log('User exists, updating password for:', userId);
      
      // Update the existing user's password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password,
        email_confirm: true,
      });
      
      if (updateError) {
        console.error('Error updating password:', updateError);
        return new Response(JSON.stringify({ error: 'Erreur mise à jour mot de passe: ' + updateError.message }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    } else {
      // Create new auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError) {
        return new Response(JSON.stringify({ error: authError.message }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      userId = authData?.user?.id;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Impossible de créer l\'utilisateur' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Upsert profile
    await supabaseAdmin.from('profiles').upsert({
      id: userId,
      user_id: userId,
      nom_complet,
      email,
      telephone: telephone || null,
      photo_url: photo_url || null,
      actif: true,
      role: 'super_admin',
    }, { onConflict: 'id' });

    // Upsert role
    await supabaseAdmin.from('user_roles').upsert(
      { user_id: userId, role: 'super_admin' }, 
      { onConflict: 'user_id,role' }
    );

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Super admin créé avec succès',
      user_id: userId,
      username,
      email
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Erreur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});