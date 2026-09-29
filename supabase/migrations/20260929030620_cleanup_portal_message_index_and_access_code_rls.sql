drop index if exists public.idx_portail_messages_client_created_at;
drop index if exists public.idx_portail_messages_client;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='client_portal_access_codes'
      and policyname='deny_client_portal_access_codes_api'
  ) then
    create policy deny_client_portal_access_codes_api
      on public.client_portal_access_codes
      for all
      to anon, authenticated
      using (false)
      with check (false);
  end if;
end $$;