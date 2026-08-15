create or replace function public.get_provider_secret_for_test(
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
    where pc.workspace_id = p_workspace_id and pc.provider = p_provider;
  return secret_value;
end;
$$;

revoke all on function public.get_provider_secret_for_test(uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.get_provider_secret_for_test(uuid,text,uuid) to service_role;
