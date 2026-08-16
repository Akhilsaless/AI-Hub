-- HOPE OS normalized persistence. Existing SaaS tables remain intact.
-- user_id is nullable during the D1 -> Supabase identity-link phase; legacy_user_id
-- allows idempotent server-side dual writes without granting client access.

create table if not exists public.hope_os_goals (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  legacy_user_id text not null,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  objective text not null,
  success_criteria jsonb not null default '[]'::jsonb,
  current_state jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('draft','active','paused','completed','cancelled')),
  priority smallint not null default 3 check (priority between 1 and 5),
  progress smallint not null default 0 check (progress between 0 and 100),
  budget_minor bigint check (budget_minor is null or budget_minor >= 0),
  currency text not null default 'INR' check (char_length(currency)=3),
  deadline timestamptz,
  permissions jsonb not null default '{}'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  next_action text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists hope_os_goals_user_status_idx on public.hope_os_goals(user_id,status,priority desc,updated_at desc);
create index if not exists hope_os_goals_workspace_idx on public.hope_os_goals(workspace_id,updated_at desc) where workspace_id is not null;

create table if not exists public.hope_os_goal_milestones (
  id text primary key, goal_id text not null references public.hope_os_goals(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade, legacy_user_id text not null,
  title text not null, description text, position integer not null default 0,
  status text not null default 'pending' check (status in ('pending','active','blocked','completed','cancelled')),
  progress smallint not null default 0 check (progress between 0 and 100), due_at timestamptz, completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists hope_os_goal_milestones_goal_idx on public.hope_os_goal_milestones(user_id,goal_id,position);

create table if not exists public.hope_os_world_state (
  id text primary key, user_id uuid references auth.users(id) on delete cascade, legacy_user_id text not null,
  workspace_id uuid references public.workspaces(id) on delete cascade, entity_type text not null, entity_id text not null,
  state_key text not null, value_json jsonb not null, source text not null default 'user',
  confidence real not null default 1 check (confidence between 0 and 1),
  verification_status text not null default 'unverified' check (verification_status in ('unverified','verified','stale','failed')),
  verified_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,workspace_id,entity_type,entity_id,state_key)
);
create index if not exists hope_os_world_state_scope_idx on public.hope_os_world_state(user_id,workspace_id,entity_type,entity_id,updated_at desc);

create table if not exists public.hope_os_missions (
  id text primary key, user_id uuid references auth.users(id) on delete cascade, legacy_user_id text not null,
  workspace_id uuid references public.workspaces(id) on delete cascade, goal_id text references public.hope_os_goals(id) on delete set null,
  title text not null, objective text not null,
  status text not null default 'planned' check (status in ('planned','running','waiting','awaiting_approval','paused','blocked','failed','completed','cancelled')),
  autonomy_level smallint not null default 1 check (autonomy_level between 0 and 3), budget_minor bigint check (budget_minor is null or budget_minor >= 0),
  currency text not null default 'INR' check (char_length(currency)=3), permissions jsonb not null default '{}'::jsonb,
  plan_json jsonb not null default '[]'::jsonb, current_task_id text, checkpoint_json jsonb not null default '{}'::jsonb,
  result_json jsonb, last_error text, next_run_at timestamptz, started_at timestamptz, completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists hope_os_missions_user_status_idx on public.hope_os_missions(user_id,status,next_run_at,updated_at desc);
create index if not exists hope_os_missions_goal_idx on public.hope_os_missions(goal_id,updated_at desc) where goal_id is not null;

create table if not exists public.hope_os_mission_tasks (
  id text primary key, mission_id text not null references public.hope_os_missions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade, legacy_user_id text not null, position integer not null default 0,
  title text not null, action_type text not null default 'internal',
  status text not null default 'pending' check (status in ('pending','running','waiting','awaiting_approval','failed','completed','cancelled')),
  risk text not null default 'low' check (risk in ('low','medium','high','critical')), input_json jsonb not null default '{}'::jsonb,
  output_json jsonb, error text, attempts integer not null default 0 check (attempts >= 0), max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  requires_approval boolean not null default false, approval_id uuid references public.approvals(id) on delete set null,
  depends_on jsonb not null default '[]'::jsonb, started_at timestamptz, completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists hope_os_mission_tasks_idx on public.hope_os_mission_tasks(user_id,mission_id,position,status);

create table if not exists public.hope_os_outcomes (
  id text primary key, user_id uuid references auth.users(id) on delete cascade, legacy_user_id text not null,
  workspace_id uuid references public.workspaces(id) on delete cascade, goal_id text references public.hope_os_goals(id) on delete set null,
  mission_id text references public.hope_os_missions(id) on delete set null, action text not null, outcome text not null,
  status text not null check (status in ('success','partial','failed','unknown')), evaluation text, learning text,
  evidence_json jsonb not null default '[]'::jsonb, confidence real not null default 0 check (confidence between 0 and 1),
  verified boolean not null default false, created_at timestamptz not null default now()
);
create index if not exists hope_os_outcomes_scope_idx on public.hope_os_outcomes(user_id,goal_id,mission_id,created_at desc);

create table if not exists public.hope_os_decisions (
  id text primary key, user_id uuid references auth.users(id) on delete cascade, legacy_user_id text not null,
  workspace_id uuid references public.workspaces(id) on delete cascade, subject text not null, decision text not null,
  rationale text, alternatives_json jsonb not null default '[]'::jsonb, owner_type text not null default 'user', outcome text,
  status text not null default 'active' check (status in ('active','superseded','reversed')), supersedes_id text references public.hope_os_decisions(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists hope_os_decisions_scope_idx on public.hope_os_decisions(user_id,workspace_id,subject,status,updated_at desc);

create table if not exists public.hope_os_skills (
  id text not null, user_id uuid references auth.users(id) on delete cascade, legacy_user_id text not null,
  workspace_id uuid references public.workspaces(id) on delete cascade, version integer not null check (version > 0),
  name text not null, visibility text not null default 'private' check (visibility in ('private','workspace','publishable')),
  status text not null default 'active' check (status in ('active','deprecated','retired')),
  trigger_json jsonb not null default '{}'::jsonb, instructions text not null, tools_json jsonb not null default '[]'::jsonb,
  permissions_json jsonb not null default '{}'::jsonb, output_schema_json jsonb not null default '{}'::jsonb,
  validation_json jsonb not null default '{}'::jsonb, source text not null default 'manual', change_reason text,
  created_at timestamptz not null default now(), primary key(id,version)
);
create index if not exists hope_os_skills_scope_idx on public.hope_os_skills(user_id,workspace_id,status,name,version desc);

create table if not exists public.hope_os_automations (
  id text primary key, user_id uuid references auth.users(id) on delete cascade, legacy_user_id text not null,
  workspace_id uuid references public.workspaces(id) on delete cascade, name text not null, trigger_json jsonb not null,
  conditions_json jsonb not null default '[]'::jsonb, actions_json jsonb not null,
  permission_json jsonb not null default '{}'::jsonb, approval_rules_json jsonb not null default '{}'::jsonb,
  enabled boolean not null default false, next_run_at timestamptz, last_run_at timestamptz, last_status text,
  failure_count integer not null default 0 check (failure_count >= 0), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists hope_os_automations_due_idx on public.hope_os_automations(enabled,next_run_at,user_id) where enabled;

create table if not exists public.hope_os_automation_runs (
  id text primary key, automation_id text not null references public.hope_os_automations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade, legacy_user_id text not null, status text not null,
  trigger_json jsonb not null default '{}'::jsonb, result_json jsonb, error text,
  started_at timestamptz not null default now(), finished_at timestamptz, audit_json jsonb not null default '{}'::jsonb
);
create index if not exists hope_os_automation_runs_idx on public.hope_os_automation_runs(user_id,automation_id,started_at desc);

create table if not exists public.hope_os_artifacts (
  id text primary key, user_id uuid references auth.users(id) on delete cascade, legacy_user_id text not null,
  workspace_id uuid references public.workspaces(id) on delete cascade, goal_id text references public.hope_os_goals(id) on delete set null,
  mission_id text references public.hope_os_missions(id) on delete set null, type text not null, title text not null,
  status text not null default 'active', visibility text not null default 'private' check (visibility in ('private','workspace')),
  current_version integer not null default 1 check (current_version > 0), metadata_json jsonb not null default '{}'::jsonb,
  created_by text not null, updated_by text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists hope_os_artifacts_scope_idx on public.hope_os_artifacts(user_id,workspace_id,type,updated_at desc);

create table if not exists public.hope_os_artifact_versions (
  artifact_id text not null references public.hope_os_artifacts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade, legacy_user_id text not null, version integer not null check (version > 0),
  content_json jsonb not null, change_summary text, created_by text not null, created_at timestamptz not null default now(),
  primary key(artifact_id,version)
);
create index if not exists hope_os_artifact_versions_user_idx on public.hope_os_artifact_versions(user_id,artifact_id,version desc);

create table if not exists public.hope_os_knowledge_items (
  id text primary key, user_id uuid references auth.users(id) on delete cascade, legacy_user_id text not null,
  workspace_id uuid references public.workspaces(id) on delete cascade, title text not null, kind text not null, source_uri text,
  content_text text, metadata_json jsonb not null default '{}'::jsonb, visibility text not null default 'private' check (visibility in ('private','workspace')),
  status text not null default 'active' check (status in ('active','deleted')), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists hope_os_knowledge_scope_idx on public.hope_os_knowledge_items(user_id,workspace_id,status,updated_at desc);

create table if not exists public.hope_os_opportunities (
  id text primary key, user_id uuid references auth.users(id) on delete cascade, legacy_user_id text not null,
  workspace_id uuid references public.workspaces(id) on delete cascade, type text not null, title text not null,
  evidence_json jsonb not null, expected_benefit text, confidence real not null default 0 check (confidence between 0 and 1),
  effort text not null default 'medium', risk text not null default 'low', status text not null default 'new',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists hope_os_opportunities_idx on public.hope_os_opportunities(user_id,status,confidence desc,updated_at desc);

create table if not exists public.hope_os_inbox_items (
  id text primary key, user_id uuid references auth.users(id) on delete cascade, legacy_user_id text not null,
  workspace_id uuid references public.workspaces(id) on delete cascade, category text not null, title text not null, detail text,
  source_type text not null, source_id text, priority smallint not null default 50 check (priority between 0 and 100),
  status text not null default 'open', due_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists hope_os_inbox_user_idx on public.hope_os_inbox_items(user_id,status,category,priority desc,updated_at desc);

create table if not exists public.hope_os_autonomy_settings (
  user_id uuid not null references auth.users(id) on delete cascade, workspace_id uuid references public.workspaces(id) on delete cascade,
  level smallint not null default 1 check (level between 0 and 3), allowed_actions_json jsonb not null default '[]'::jsonb,
  denied_actions_json jsonb not null default '[]'::jsonb, budget_minor bigint check (budget_minor is null or budget_minor >= 0),
  currency text not null default 'INR' check (char_length(currency)=3), high_impact_approval boolean not null default true,
  updated_at timestamptz not null default now(), unique(user_id,workspace_id)
);
create index if not exists hope_os_autonomy_user_idx on public.hope_os_autonomy_settings(user_id,workspace_id);

create table if not exists public.hope_os_guardian_events (
  id text primary key, user_id uuid references auth.users(id) on delete cascade, legacy_user_id text not null,
  workspace_id uuid references public.workspaces(id) on delete cascade, mission_id text references public.hope_os_missions(id) on delete set null,
  action text not null, authorization_level text not null, privacy_risk text not null, cost_risk text not null,
  side_effect_risk text not null, reversibility text not null, confidence real not null check (confidence between 0 and 1),
  decision text not null, reasons_json jsonb not null default '[]'::jsonb, created_at timestamptz not null default now()
);
create index if not exists hope_os_guardian_user_idx on public.hope_os_guardian_events(user_id,created_at desc);

create table if not exists public.hope_os_cost_events (
  id text primary key, user_id uuid references auth.users(id) on delete cascade, legacy_user_id text not null,
  workspace_id uuid references public.workspaces(id) on delete cascade, goal_id text references public.hope_os_goals(id) on delete set null,
  mission_id text references public.hope_os_missions(id) on delete set null, feature text not null, provider text, model text,
  units numeric not null default 0 check (units >= 0), cost_minor bigint not null default 0 check (cost_minor >= 0),
  currency text not null default 'INR' check (char_length(currency)=3), latency_ms integer check (latency_ms is null or latency_ms >= 0),
  metadata_json jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists hope_os_cost_scope_idx on public.hope_os_cost_events(user_id,workspace_id,feature,created_at desc);

-- RLS is enabled for every exposed table. Legacy rows written by the server remain
-- inaccessible to clients until their Supabase identity is linked.
do $$
declare t text;
begin
  foreach t in array array[
    'hope_os_goals','hope_os_goal_milestones','hope_os_world_state','hope_os_missions','hope_os_mission_tasks',
    'hope_os_outcomes','hope_os_decisions','hope_os_skills','hope_os_automations','hope_os_automation_runs',
    'hope_os_artifacts','hope_os_artifact_versions','hope_os_knowledge_items','hope_os_opportunities','hope_os_inbox_items',
    'hope_os_autonomy_settings','hope_os_guardian_events','hope_os_cost_events'
  ] loop execute format('alter table public.%I enable row level security',t); end loop;
end $$;

-- Personal ownership policies. Workspace sharing is explicit only for artifacts,
-- knowledge and skills; all other objects remain private to the owning identity.
do $$
declare t text;
begin
  foreach t in array array[
    'hope_os_goals','hope_os_goal_milestones','hope_os_world_state','hope_os_missions','hope_os_mission_tasks',
    'hope_os_outcomes','hope_os_decisions','hope_os_automations','hope_os_automation_runs','hope_os_opportunities','hope_os_inbox_items',
    'hope_os_autonomy_settings'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',t||'_select_own',t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',t||'_insert_own',t);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',t||'_update_own',t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',t||'_delete_own',t);
  end loop;
end $$;

create policy hope_os_skills_select on public.hope_os_skills for select to authenticated using (
  (select auth.uid())=user_id or (visibility='workspace' and workspace_id is not null and exists(select 1 from public.memberships m where m.workspace_id=hope_os_skills.workspace_id and m.user_id=(select auth.uid())))
);
create policy hope_os_skills_insert on public.hope_os_skills for insert to authenticated with check ((select auth.uid())=user_id);
create policy hope_os_skills_update on public.hope_os_skills for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy hope_os_skills_delete on public.hope_os_skills for delete to authenticated using ((select auth.uid())=user_id);

create policy hope_os_artifacts_select on public.hope_os_artifacts for select to authenticated using (
  (select auth.uid())=user_id or (visibility='workspace' and workspace_id is not null and exists(select 1 from public.memberships m where m.workspace_id=hope_os_artifacts.workspace_id and m.user_id=(select auth.uid())))
);
create policy hope_os_artifacts_insert on public.hope_os_artifacts for insert to authenticated with check ((select auth.uid())=user_id);
create policy hope_os_artifacts_update on public.hope_os_artifacts for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy hope_os_artifacts_delete on public.hope_os_artifacts for delete to authenticated using ((select auth.uid())=user_id);
create policy hope_os_artifact_versions_select on public.hope_os_artifact_versions for select to authenticated using (
  (select auth.uid())=user_id or exists(select 1 from public.hope_os_artifacts a where a.id=hope_os_artifact_versions.artifact_id and a.visibility='workspace' and a.workspace_id is not null and exists(select 1 from public.memberships m where m.workspace_id=a.workspace_id and m.user_id=(select auth.uid())))
);
create policy hope_os_artifact_versions_insert on public.hope_os_artifact_versions for insert to authenticated with check ((select auth.uid())=user_id);

create policy hope_os_knowledge_select on public.hope_os_knowledge_items for select to authenticated using (
  (select auth.uid())=user_id or (visibility='workspace' and workspace_id is not null and exists(select 1 from public.memberships m where m.workspace_id=hope_os_knowledge_items.workspace_id and m.user_id=(select auth.uid())))
);
create policy hope_os_knowledge_insert on public.hope_os_knowledge_items for insert to authenticated with check ((select auth.uid())=user_id);
create policy hope_os_knowledge_update on public.hope_os_knowledge_items for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy hope_os_knowledge_delete on public.hope_os_knowledge_items for delete to authenticated using ((select auth.uid())=user_id);

-- Immutable audit/cost evidence is readable by its owner but written only by the server.
create policy hope_os_guardian_select_own on public.hope_os_guardian_events for select to authenticated using ((select auth.uid())=user_id);
create policy hope_os_cost_select_own on public.hope_os_cost_events for select to authenticated using ((select auth.uid())=user_id);

revoke all on public.hope_os_goals,public.hope_os_goal_milestones,public.hope_os_world_state,
  public.hope_os_missions,public.hope_os_mission_tasks,public.hope_os_outcomes,public.hope_os_decisions,
  public.hope_os_skills,public.hope_os_automations,public.hope_os_automation_runs,public.hope_os_artifacts,
  public.hope_os_artifact_versions,public.hope_os_knowledge_items,public.hope_os_opportunities,
  public.hope_os_inbox_items,public.hope_os_autonomy_settings,public.hope_os_guardian_events,
  public.hope_os_cost_events from anon;
grant select,insert,update,delete on public.hope_os_goals,public.hope_os_goal_milestones,public.hope_os_world_state,
  public.hope_os_missions,public.hope_os_mission_tasks,public.hope_os_outcomes,public.hope_os_decisions,
  public.hope_os_skills,public.hope_os_automations,public.hope_os_automation_runs,public.hope_os_artifacts,
  public.hope_os_artifact_versions,public.hope_os_knowledge_items,public.hope_os_opportunities,
  public.hope_os_inbox_items,public.hope_os_autonomy_settings to authenticated;
grant select on public.hope_os_guardian_events,public.hope_os_cost_events to authenticated;
grant all on public.hope_os_goals,public.hope_os_goal_milestones,public.hope_os_world_state,
  public.hope_os_missions,public.hope_os_mission_tasks,public.hope_os_outcomes,public.hope_os_decisions,
  public.hope_os_skills,public.hope_os_automations,public.hope_os_automation_runs,public.hope_os_artifacts,
  public.hope_os_artifact_versions,public.hope_os_knowledge_items,public.hope_os_opportunities,
  public.hope_os_inbox_items,public.hope_os_autonomy_settings,public.hope_os_guardian_events,
  public.hope_os_cost_events to service_role;
