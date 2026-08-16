create table public.hope_threads (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 100),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation' check (char_length(title) <= 80),
  mood text not null default 'balanced' check (mood in ('balanced','calm','focused','creative','angry')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id)
);

create table public.hope_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  thread_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('hope','user')),
  body text not null check (char_length(body) between 1 and 12000),
  meta text check (meta is null or char_length(meta) <= 300),
  created_at timestamptz not null default now(),
  foreign key (workspace_id, thread_id) references public.hope_threads(workspace_id, id) on delete cascade
);

create table public.academy_progress (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id text not null check (char_length(track_id) between 1 and 80),
  progress integer not null default 0 check (progress between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id, track_id)
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  brand text not null check (char_length(brand) between 1 and 120),
  goal text not null check (char_length(goal) between 1 and 1200),
  audience text not null check (char_length(audience) <= 80),
  channels jsonb not null default '[]'::jsonb,
  draft text,
  status text not null default 'draft' check (status in ('draft','approved','scheduled','published','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  object_key text not null unique,
  filename text not null check (char_length(filename) <= 200),
  content_type text not null,
  byte_size bigint not null check (byte_size between 1 and 8388608),
  created_at timestamptz not null default now()
);

create index hope_threads_workspace_updated_idx on public.hope_threads(workspace_id, updated_at desc);
create index hope_threads_user_idx on public.hope_threads(user_id);
create index hope_messages_thread_idx on public.hope_messages(workspace_id, thread_id, created_at);
create index hope_messages_user_idx on public.hope_messages(user_id);
create index academy_progress_user_idx on public.academy_progress(user_id);
create index campaigns_workspace_updated_idx on public.campaigns(workspace_id, updated_at desc);
create index campaigns_user_idx on public.campaigns(user_id);
create index uploads_workspace_idx on public.uploads(workspace_id, created_at desc);
create index uploads_user_idx on public.uploads(user_id);

alter table public.hope_threads enable row level security;
alter table public.hope_messages enable row level security;
alter table public.academy_progress enable row level security;
alter table public.campaigns enable row level security;
alter table public.uploads enable row level security;

create policy "members read hope threads" on public.hope_threads for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "contributors create hope threads" on public.hope_threads for insert to authenticated
  with check (user_id = (select auth.uid()) and public.has_workspace_role(workspace_id, array['owner','admin','member']));
create policy "contributors update hope threads" on public.hope_threads for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','admin','member']))
  with check (public.has_workspace_role(workspace_id, array['owner','admin','member']));
create policy "owners delete own hope threads" on public.hope_threads for delete to authenticated
  using (user_id = (select auth.uid()) or public.has_workspace_role(workspace_id, array['owner','admin']));

create policy "members read hope messages" on public.hope_messages for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "contributors create hope messages" on public.hope_messages for insert to authenticated
  with check (user_id = (select auth.uid()) and public.has_workspace_role(workspace_id, array['owner','admin','member']));
create policy "owners delete own hope messages" on public.hope_messages for delete to authenticated
  using (user_id = (select auth.uid()) or public.has_workspace_role(workspace_id, array['owner','admin']));

create policy "members read academy progress" on public.academy_progress for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "users write own academy progress" on public.academy_progress for insert to authenticated
  with check (user_id = (select auth.uid()) and public.has_workspace_role(workspace_id, array['owner','admin','member']));
create policy "users update own academy progress" on public.academy_progress for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.has_workspace_role(workspace_id, array['owner','admin','member']));

create policy "members read campaigns" on public.campaigns for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "contributors create campaigns" on public.campaigns for insert to authenticated
  with check (user_id = (select auth.uid()) and public.has_workspace_role(workspace_id, array['owner','admin','member']));
create policy "contributors update campaigns" on public.campaigns for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','admin','member']))
  with check (public.has_workspace_role(workspace_id, array['owner','admin','member']));
create policy "owners delete own campaigns" on public.campaigns for delete to authenticated
  using (user_id = (select auth.uid()) or public.has_workspace_role(workspace_id, array['owner','admin']));

create policy "members read upload metadata" on public.uploads for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "contributors create upload metadata" on public.uploads for insert to authenticated
  with check (user_id = (select auth.uid()) and public.has_workspace_role(workspace_id, array['owner','admin','member']));
create policy "owners delete own uploads" on public.uploads for delete to authenticated
  using (user_id = (select auth.uid()) or public.has_workspace_role(workspace_id, array['owner','admin']));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hyvora-uploads',
  'hyvora-uploads',
  false,
  8388608,
  array['image/jpeg','image/png','image/webp','image/gif','text/plain','text/markdown','application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "workspace members read hyvora uploads" on storage.objects for select to authenticated
  using (
    bucket_id = 'hyvora-uploads'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );
create policy "workspace contributors upload hyvora files" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'hyvora-uploads'
    and owner_id = (select auth.uid())::text
    and ((storage.foldername(name))[2]) = (select auth.uid())::text
    and public.has_workspace_role(((storage.foldername(name))[1])::uuid, array['owner','admin','member'])
  );
create policy "owners delete own hyvora files" on storage.objects for delete to authenticated
  using (
    bucket_id = 'hyvora-uploads'
    and (
      owner_id = (select auth.uid())::text
      or public.has_workspace_role(((storage.foldername(name))[1])::uuid, array['owner','admin'])
    )
  );
