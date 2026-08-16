create table public.missions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(title) between 2 and 120),
  objective text not null check (char_length(objective) between 2 and 2000),
  status text not null default 'draft' check (status in ('draft','running','paused','awaiting_approval','completed','cancelled')),
  stage integer not null default 0 check (stage between 0 and 5),
  budget_minor integer not null default 0 check (budget_minor >= 0),
  agent_team jsonb not null default '["orchestrator","planner","researcher","builder","quality_guardian"]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  mission_id uuid references public.missions(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete restrict,
  resolved_by uuid references auth.users(id) on delete restrict,
  action text not null check (char_length(action) between 2 and 160),
  summary text not null check (char_length(summary) between 2 and 1200),
  risk text not null default 'medium' check (risk in ('low','medium','high')),
  status text not null default 'pending' check (status in ('pending','approved','rejected','changes_requested')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index missions_workspace_updated_idx on public.missions(workspace_id, updated_at desc);
create index missions_created_by_idx on public.missions(created_by);
create index approvals_workspace_status_idx on public.approvals(workspace_id, status, created_at desc);
create index approvals_mission_idx on public.approvals(mission_id);
create index approvals_requested_by_idx on public.approvals(requested_by);
create index approvals_resolved_by_idx on public.approvals(resolved_by);

alter table public.missions enable row level security;
alter table public.approvals enable row level security;

create policy "members read missions" on public.missions for select to authenticated
  using (private.is_workspace_member(workspace_id));
create policy "contributors create missions" on public.missions for insert to authenticated
  with check (created_by = (select auth.uid()) and private.has_workspace_role(workspace_id, array['owner','admin','member']));
create policy "contributors update missions" on public.missions for update to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin','member']))
  with check (private.has_workspace_role(workspace_id, array['owner','admin','member']));
create policy "owners cancel missions" on public.missions for delete to authenticated
  using (created_by = (select auth.uid()) or private.has_workspace_role(workspace_id, array['owner','admin']));

create policy "members read approvals" on public.approvals for select to authenticated
  using (private.is_workspace_member(workspace_id));
create policy "contributors request approvals" on public.approvals for insert to authenticated
  with check (requested_by = (select auth.uid()) and private.has_workspace_role(workspace_id, array['owner','admin','member']));
create policy "contributors resolve approvals" on public.approvals for update to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin','member']))
  with check (private.has_workspace_role(workspace_id, array['owner','admin','member']));
