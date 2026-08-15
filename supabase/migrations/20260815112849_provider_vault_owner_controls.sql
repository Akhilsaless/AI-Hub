create or replace function public.store_provider_secret(
  p_workspace_id uuid, p_provider text, p_secret text, p_actor_id uuid,
  p_tier text, p_last_four text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare existing_id uuid; secret_id uuid; secret_name text;
begin
  if p_provider not in ('gemini','groq','huggingface','openai','openrouter','anthropic')
     or p_tier not in ('free','bonus','paid')
     or char_length(p_secret) < 10 or char_length(p_secret) > 500 then
    raise exception 'INVALID_PROVIDER_SECRET';
  end if;
  if not exists (
    select 1 from public.memberships where workspace_id = p_workspace_id
      and user_id = p_actor_id and role in ('owner','admin')
  ) then raise exception 'PROVIDER_PERMISSION_DENIED'; end if;
  select vault_secret_id into existing_id from public.provider_connections
    where workspace_id = p_workspace_id and provider = p_provider;
  secret_name := 'hope_' || replace(p_workspace_id::text, '-', '_') || '_' || p_provider;
  if existing_id is null then
    secret_id := vault.create_secret(p_secret, secret_name, 'HOPE encrypted provider credential for ' || p_provider);
  else
    perform vault.update_secret(existing_id, p_secret, secret_name, 'HOPE encrypted provider credential for ' || p_provider);
    secret_id := existing_id;
  end if;
  insert into public.provider_connections (
    workspace_id, provider, vault_secret_id, tier, enabled, configured_by,
    last_four, health_status, health_message, last_checked_at, updated_at
  ) values (
    p_workspace_id, p_provider, secret_id, p_tier, false, p_actor_id,
    right(p_last_four, 8), 'unchecked', null, null, now()
  ) on conflict (workspace_id, provider) do update set
    vault_secret_id = excluded.vault_secret_id, tier = excluded.tier,
    enabled = false, configured_by = excluded.configured_by,
    last_four = excluded.last_four, health_status = 'unchecked',
    health_message = null, last_checked_at = null, updated_at = now();
  return secret_id;
end;
$$;

create or replace function public.get_provider_secret(
  p_workspace_id uuid, p_provider text, p_actor_id uuid
)
returns text language plpgsql security definer set search_path = '' as $$
declare secret_value text;
begin
  if not exists (
    select 1 from public.memberships where workspace_id = p_workspace_id
      and user_id = p_actor_id and role in ('owner','admin')
  ) then raise exception 'PROVIDER_PERMISSION_DENIED'; end if;
  select ds.decrypted_secret into secret_value
    from vault.decrypted_secrets ds
    join public.provider_connections pc on pc.vault_secret_id = ds.id
    where pc.workspace_id = p_workspace_id and pc.provider = p_provider and pc.enabled = true;
  return secret_value;
end;
$$;

create or replace function public.set_provider_enabled(
  p_workspace_id uuid, p_provider text, p_enabled boolean, p_actor_id uuid
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.memberships where workspace_id = p_workspace_id
      and user_id = p_actor_id and role in ('owner','admin')
  ) then raise exception 'PROVIDER_PERMISSION_DENIED'; end if;
  update public.provider_connections set enabled = p_enabled, updated_at = now()
    where workspace_id = p_workspace_id and provider = p_provider;
  if not found then raise exception 'PROVIDER_NOT_FOUND'; end if;
end;
$$;

create or replace function public.delete_provider_secret(
  p_workspace_id uuid, p_provider text, p_actor_id uuid
)
returns void language plpgsql security definer set search_path = '' as $$
declare secret_id uuid;
begin
  if not exists (
    select 1 from public.memberships where workspace_id = p_workspace_id
      and user_id = p_actor_id and role in ('owner','admin')
  ) then raise exception 'PROVIDER_PERMISSION_DENIED'; end if;
  select vault_secret_id into secret_id from public.provider_connections
    where workspace_id = p_workspace_id and provider = p_provider;
  delete from public.provider_connections where workspace_id = p_workspace_id and provider = p_provider;
  if secret_id is not null then delete from vault.secrets where id = secret_id; end if;
end;
$$;

revoke all on function public.store_provider_secret(uuid,text,text,uuid,text,text) from public, anon, authenticated;
revoke all on function public.get_provider_secret(uuid,text,uuid) from public, anon, authenticated;
revoke all on function public.set_provider_enabled(uuid,text,boolean,uuid) from public, anon, authenticated;
revoke all on function public.delete_provider_secret(uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.store_provider_secret(uuid,text,text,uuid,text,text) to service_role;
grant execute on function public.get_provider_secret(uuid,text,uuid) to service_role;
grant execute on function public.set_provider_enabled(uuid,text,boolean,uuid) to service_role;
grant execute on function public.delete_provider_secret(uuid,text,uuid) to service_role;
