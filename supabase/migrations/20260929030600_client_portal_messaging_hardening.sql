create index if not exists idx_portail_messages_client_created_at
  on public.portail_messages (client_id, created_at desc);

create index if not exists idx_portail_messages_plantation_created_at
  on public.portail_messages (plantation_id, created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'portail_messages_message_length_check'
      and conrelid = 'public.portail_messages'::regclass
  ) then
    alter table public.portail_messages
      add constraint portail_messages_message_length_check
      check (char_length(btrim(message)) between 1 and 4000);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'portail_messages_auteur_type_check'
      and conrelid = 'public.portail_messages'::regclass
  ) then
    alter table public.portail_messages
      add constraint portail_messages_auteur_type_check
      check (auteur_type in ('client','staff','technicien','commercial','system'));
  end if;
end $$;

alter table public.portail_messages enable row level security;
