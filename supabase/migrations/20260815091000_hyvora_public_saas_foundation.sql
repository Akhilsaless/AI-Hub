create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','member','viewer')),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin','member','viewer')),
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  accepted_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create unique index invitations_pending_email_workspace_idx
  on public.invitations (workspace_id, lower(email))
  where status = 'pending';

create index memberships_user_idx on public.memberships(user_id);
create index invitations_email_idx on public.invitations(lower(email));
create index invitations_workspace_idx on public.invitations(workspace_id, created_at desc);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_events_workspace_created_idx on public.audit_events(workspace_id, created_at desc);

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships
    where workspace_id = target_workspace and user_id = auth.uid()
  );
$$;

create or replace function public.has_workspace_role(target_workspace uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships
    where workspace_id = target_workspace
      and user_id = auth.uid()
      and role = any(allowed_roles)
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite_count integer;
  new_workspace_id uuid;
  safe_slug text;
  workspace_label text;
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    updated_at = now();

  select count(*) into invite_count
  from public.invitations
  where lower(email) = lower(new.email)
    and status = 'pending'
    and expires_at > now();

  if invite_count > 0 then
    insert into public.memberships (workspace_id, user_id, role)
    select workspace_id, new.id, role
    from public.invitations
    where lower(email) = lower(new.email)
      and status = 'pending'
      and expires_at > now()
    on conflict (workspace_id, user_id) do update set role = excluded.role;

    update public.invitations
    set status = 'accepted', accepted_by = new.id, accepted_at = now()
    where lower(email) = lower(new.email)
      and status = 'pending'
      and expires_at > now();
  else
    safe_slug := trim(both '-' from regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9]+', '-', 'g'))
      || '-' || substr(new.id::text, 1, 8);
    workspace_label := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)) || '''s Workspace';

    insert into public.workspaces (name, slug, owner_id)
    values (workspace_label, safe_slug, new.id)
    returning id into new_workspace_id;

    insert into public.memberships (workspace_id, user_id, role)
    values (new_workspace_id, new.id, 'owner');
  end if;

  return new;
end;
$$;

create or replace function public.accept_existing_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_user_id uuid;
begin
  select id into existing_user_id
  from auth.users
  where lower(email) = lower(new.email)
  limit 1;

  if existing_user_id is not null and new.status = 'pending' and new.expires_at > now() then
    insert into public.memberships (workspace_id, user_id, role)
    values (new.workspace_id, existing_user_id, new.role)
    on conflict (workspace_id, user_id) do update set role = excluded.role;

    update public.invitations
    set status = 'accepted', accepted_by = existing_user_id, accepted_at = now()
    where id = new.id;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger on_invitation_created
  after insert on public.invitations
  for each row execute function public.accept_existing_invitation();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.audit_events enable row level security;

create policy profiles_select_self on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy workspaces_select_members on public.workspaces
  for select to authenticated using (public.is_workspace_member(id));
create policy workspaces_update_admin on public.workspaces
  for update to authenticated
  using (public.has_workspace_role(id, array['owner','admin']))
  with check (public.has_workspace_role(id, array['owner','admin']));

create policy memberships_select_workspace on public.memberships
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy memberships_manage_admin on public.memberships
  for all to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','admin']))
  with check (public.has_workspace_role(workspace_id, array['owner','admin']));

create policy invitations_select_admin_or_recipient on public.invitations
  for select to authenticated using (
    public.has_workspace_role(workspace_id, array['owner','admin'])
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
create policy invitations_manage_admin on public.invitations
  for all to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','admin']))
  with check (public.has_workspace_role(workspace_id, array['owner','admin']));

create policy audit_select_members on public.audit_events
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy audit_insert_members on public.audit_events
  for insert to authenticated with check (
    actor_id = auth.uid() and public.is_workspace_member(workspace_id)
  );

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, update on public.workspaces to authenticated;
grant select on public.memberships to authenticated;
grant select on public.invitations to authenticated;
grant select, insert on public.audit_events to authenticated;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, text[]) to authenticated;
