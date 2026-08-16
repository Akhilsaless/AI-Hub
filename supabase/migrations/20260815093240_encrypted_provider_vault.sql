create table public.provider_connections (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null check (provider in ('gemini','groq','huggingface','openai','anthropic')),
  vault_secret_id uuid not null,
  tier text not null check (tier in ('free','bonus','paid')),
  enabled boolean not null default true,
  configured_by uuid not null references auth.users(id) on delete restrict,
  last_four text not null check (char_length(last_four) between 2 and 8),
  health_status text not null default 'unchecked' check (health_status in ('unchecked','healthy','limited','invalid','unavailable')),
  health_message text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, provider)
);

create index provider_connections_configured_by_idx on public.provider_connections(configured_by);
alter table public.provider_connections enable row level security;

create policy "members read provider connection status" on public.provider_connections
for select to authenticated using (private.is_workspace_member(workspace_id));

create or replace function public.store_provider_secret(
  p_workspace_id uuid,
  p_provider text,
  p_secret text,
  p_actor_id uuid,
  p_tier text,
  p_last_four text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_id uuid;
  secret_id uuid;
  secret_name text;
begin
  if p_provider not in ('gemini','groq','huggingface','openai','anthropic')
     or p_tier not in ('free','bonus','paid')
     or char_length(p_secret) < 10
     or char_length(p_secret) > 500 then
    raise exception 'INVALID_PROVIDER_SECRET';
  end if;

  if not exists (
    select 1 from public.memberships
    where workspace_id = p_workspace_id
      and user_id = p_actor_id
      and role in ('owner','admin')
  ) then
    raise exception 'PROVIDER_PERMISSION_DENIED';
  end if;

  select vault_secret_id into existing_id
  from public.provider_connections
  where workspace_id = p_workspace_id and provider = p_provider;

  secret_name := 'hyvora_' || replace(p_workspace_id::text, '-', '_') || '_' || p_provider;

  if existing_id is null then
    secret_id := vault.create_secret(
      p_secret,
      secret_name,
      'HYVORA encrypted provider credential for ' || p_provider
    );
  else
    perform vault.update_secret(
      existing_id,
      p_secret,
      secret_name,
      'HYVORA encrypted provider credential for ' || p_provider
    );
    secret_id := existing_id;
  end if;

  insert into public.provider_connections (
    workspace_id, provider, vault_secret_id, tier, enabled,
    configured_by, last_four, health_status, health_message,
    last_checked_at, updated_at
  ) values (
    p_workspace_id, p_provider, secret_id, p_tier, true,
    p_actor_id, right(p_last_four, 8), 'unchecked', null,
    null, now()
  )
  on conflict (workspace_id, provider) do update set
    vault_secret_id = excluded.vault_secret_id,
    tier = excluded.tier,
    enabled = true,
    configured_by = excluded.configured_by,
    last_four = excluded.last_four,
    health_status = 'unchecked',
    health_message = null,
    last_checked_at = null,
    updated_at = now();

  return secret_id;
end;
$$;

create or replace function public.get_provider_secret(
  p_workspace_id uuid,
  p_provider text,
  p_actor_id uuid
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  secret_value text;
begin
  if not exists (
    select 1 from public.memberships
    where workspace_id = p_workspace_id and user_id = p_actor_id
  ) then
    raise exception 'PROVIDER_PERMISSION_DENIED';
  end if;

  select decrypted_secret into secret_value
  from vault.decrypted_secrets ds
  join public.provider_connections pc on pc.vault_secret_id = ds.id
  where pc.workspace_id = p_workspace_id
    and pc.provider = p_provider
    and pc.enabled = true;

  return secret_value;
end;
$$;

revoke all on function public.store_provider_secret(uuid,text,text,uuid,text,text) from public, anon, authenticated;
revoke all on function public.get_provider_secret(uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.store_provider_secret(uuid,text,text,uuid,text,text) to service_role;
grant execute on function public.get_provider_secret(uuid,text,uuid) to service_role;
