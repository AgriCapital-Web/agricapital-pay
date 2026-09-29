create or replace function public.notification_vapid_config()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
  v_parts text[];
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Accès refusé';
  end if;
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name='agricapital_vapid_config'
  limit 1;
  if v_secret is null then raise exception 'Configuration VAPID absente'; end if;
  v_parts := string_to_array(v_secret, ':');
  if array_length(v_parts,1) <> 3 then raise exception 'Configuration VAPID invalide'; end if;
  return jsonb_build_object('public_key',v_parts[1],'private_key',v_parts[2],'subject',v_parts[3]);
end;
$$;

revoke all on function public.notification_vapid_config() from public, anon, authenticated;
grant execute on function public.notification_vapid_config() to service_role;