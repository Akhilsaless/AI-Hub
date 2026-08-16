alter table public.hope_os_autonomy_settings add column if not exists id uuid default gen_random_uuid();
update public.hope_os_autonomy_settings set id=gen_random_uuid() where id is null;
alter table public.hope_os_autonomy_settings alter column id set not null;
alter table public.hope_os_autonomy_settings add constraint hope_os_autonomy_settings_pkey primary key (id);
create unique index if not exists hope_os_autonomy_scope_unique on public.hope_os_autonomy_settings (user_id,coalesce(workspace_id,'00000000-0000-0000-0000-000000000000'::uuid));
