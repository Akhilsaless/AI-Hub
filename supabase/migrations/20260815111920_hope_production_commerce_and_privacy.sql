-- Production commerce, allowance, credits and referral foundation.
-- This migration also narrows personal product data from workspace-wide reads
-- to records owned by the authenticated user.

drop policy if exists "workspace members read hope threads" on public.hope_threads;
drop policy if exists "workspace members read hope messages" on public.hope_messages;
drop policy if exists "workspace members read academy progress" on public.academy_progress;
drop policy if exists "workspace members read campaigns" on public.campaigns;
drop policy if exists "workspace members read uploads" on public.uploads;
drop policy if exists "workspace members read missions" on public.missions;
drop policy if exists "workspace members read approvals" on public.approvals;
drop policy if exists "workspace members read provider status" on public.provider_connections;

create policy "users read own hope threads" on public.hope_threads for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "users update own hope threads" on public.hope_threads for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and private.is_workspace_member(workspace_id));
create policy "users delete own hope threads" on public.hope_threads for delete to authenticated
  using ((select auth.uid()) = user_id);
create policy "users read own hope messages" on public.hope_messages for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "users delete own hope messages" on public.hope_messages for delete to authenticated
  using ((select auth.uid()) = user_id);
create policy "users read own academy progress" on public.academy_progress for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "users read own campaigns" on public.campaigns for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "users update own campaigns" on public.campaigns for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and private.is_workspace_member(workspace_id));
create policy "users delete own campaigns" on public.campaigns for delete to authenticated
  using ((select auth.uid()) = user_id);
create policy "users read own upload metadata" on public.uploads for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "users delete own upload metadata" on public.uploads for delete to authenticated
  using ((select auth.uid()) = user_id);
create policy "users read own missions" on public.missions for select to authenticated
  using ((select auth.uid()) = created_by);
create policy "users update own missions" on public.missions for update to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by and private.is_workspace_member(workspace_id));
create policy "users delete own missions" on public.missions for delete to authenticated
  using ((select auth.uid()) = created_by);
create policy "users read own approvals" on public.approvals for select to authenticated
  using ((select auth.uid()) = requested_by);
create policy "users resolve own approvals" on public.approvals for update to authenticated
  using ((select auth.uid()) = requested_by)
  with check ((select auth.uid()) = requested_by and (resolved_by is null or resolved_by = (select auth.uid())));
create policy "workspace admins read provider status" on public.provider_connections for select to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin']));

revoke all privileges on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;

create table public.product_modules (
  id text primary key check (id in ('hope_pro','academy','marketing','build','everything')),
  name text not null,
  price_minor integer not null check (price_minor >= 0),
  currency text not null default 'INR' check (char_length(currency) = 3),
  active boolean not null default true,
  included_credits integer not null default 0 check (included_credits >= 0),
  trial_days integer not null default 0 check (trial_days between 0 and 30),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.product_modules (id,name,price_minor,currency,trial_days,sort_order) values
  ('hope_pro','HOPE Pro',29900,'INR',0,10),
  ('academy','AI Academy',19900,'INR',3,20),
  ('marketing','Marketing',39900,'INR',3,30),
  ('build','Build',39900,'INR',3,40),
  ('everything','Everything',79900,'INR',0,50)
on conflict (id) do update set
  name=excluded.name, price_minor=excluded.price_minor, currency=excluded.currency,
  trial_days=excluded.trial_days, sort_order=excluded.sort_order, updated_at=now();

create table public.user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  module_id text not null references public.product_modules(id),
  source text not null check (source in ('subscription','trial','referral','promotion','owner')),
  status text not null default 'active' check (status in ('active','paused','expired','revoked')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  external_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
create unique index user_entitlements_active_unique on public.user_entitlements
  (user_id,module_id,source,coalesce(external_reference,'')) where status='active';
create index user_entitlements_user_status_idx on public.user_entitlements(user_id,status,ends_at);

create table public.module_trials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null references public.product_modules(id) check (module_id in ('academy','marketing','build')),
  status text not null default 'active' check (status in ('active','expired','converted','revoked','abuse_blocked')),
  activated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  device_fingerprint_hash text,
  abuse_score integer not null default 0 check (abuse_score between 0 and 100),
  abuse_reasons jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id,module_id),
  check (expires_at > activated_at)
);
create index module_trials_device_idx on public.module_trials(device_fingerprint_hash) where device_fingerprint_hash is not null;

create table public.hope_credit_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  lifetime_earned integer not null default 0 check (lifetime_earned >= 0),
  lifetime_spent integer not null default 0 check (lifetime_spent >= 0),
  updated_at timestamptz not null default now()
);
create table public.hope_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount <> 0),
  balance_after integer not null check (balance_after >= 0),
  entry_type text not null check (entry_type in ('included','bonus','referral','promotion','purchase','spend','expiry','reversal','adjustment')),
  operation text,
  reference_type text,
  reference_id text,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index hope_credit_ledger_user_created_idx on public.hope_credit_ledger(user_id,created_at desc);

create table public.referral_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  referral_code text not null unique check (char_length(referral_code) between 6 and 24),
  status text not null default 'active' check (status in ('active','suspended','ambassador')),
  paying_referrals integer not null default 0,
  active_paying_referrals integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid not null unique references auth.users(id) on delete cascade,
  referral_code text not null,
  status text not null default 'signed_up' check (status in ('signed_up','verified','trial','subscribed','retained','refunded','fraud','revoked')),
  signup_at timestamptz not null default now(),
  verified_at timestamptz,
  first_subscription_at timestamptz,
  retained_at timestamptz,
  abuse_score integer not null default 0 check (abuse_score between 0 and 100),
  abuse_flags jsonb not null default '[]'::jsonb,
  payment_identity_hash text,
  device_fingerprint_hash text,
  updated_at timestamptz not null default now(),
  check (referrer_id <> referred_user_id)
);
create index referrals_referrer_status_idx on public.referrals(referrer_id,status);
create table public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  beneficiary_id uuid not null references auth.users(id) on delete cascade,
  reward_type text not null check (reward_type in ('hope_credit','hope_pro_day','hope_pro_month','ambassador','retention')),
  reward_amount integer not null check (reward_amount > 0),
  status text not null default 'pending' check (status in ('pending','granted','reversed','blocked')),
  granted_at timestamptz,
  reversed_at timestamptz,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index referral_rewards_beneficiary_idx on public.referral_rewards(beneficiary_id,status,created_at desc);

create table public.provider_policies (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null,
  enabled boolean not null default false,
  routing_priority integer not null default 100 check (routing_priority between 1 and 1000),
  daily_budget_minor integer not null default 0 check (daily_budget_minor >= 0),
  monthly_budget_minor integer not null default 0 check (monthly_budget_minor >= 0),
  warning_percent integer not null default 80 check (warning_percent between 1 and 100),
  emergency_stop boolean not null default false,
  last_success_at timestamptz,
  last_error text,
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key(workspace_id,provider)
);

create table public.ai_usage_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text,
  provider text not null,
  model text,
  operation text not null,
  reasoning_class text not null check (reasoning_class in ('fast','balanced','strong','tool')),
  input_units bigint not null default 0 check (input_units >= 0),
  output_units bigint not null default 0 check (output_units >= 0),
  estimated_cost_minor bigint not null default 0 check (estimated_cost_minor >= 0),
  latency_ms integer not null default 0 check (latency_ms >= 0),
  success boolean not null,
  error_code text,
  created_at timestamptz not null default now()
);
create index ai_usage_events_user_created_idx on public.ai_usage_events(user_id,created_at desc);
create index ai_usage_events_workspace_created_idx on public.ai_usage_events(workspace_id,created_at desc);

create table public.owner_commerce_config (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
insert into public.owner_commerce_config(key,value) values
  ('free_limits','{"messages_day":40,"advanced_day":5,"voice_minutes_month":20,"uploads_day":4,"vision_day":3,"research_day":3,"tool_calls_day":5}'::jsonb),
  ('referral_rules','{"signup_credit_referrer":0,"signup_credit_referred":0,"paid_conversion_pro_days":1,"five_paid_bonus_credits":0,"ten_paid_pro_days":30,"twenty_five_active_ambassador":true,"retention_months":3,"retention_pro_days":7}'::jsonb)
on conflict(key) do update set value=excluded.value,updated_at=now();

alter table public.product_modules enable row level security;
alter table public.user_entitlements enable row level security;
alter table public.module_trials enable row level security;
alter table public.hope_credit_accounts enable row level security;
alter table public.hope_credit_ledger enable row level security;
alter table public.referral_profiles enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_rewards enable row level security;
alter table public.provider_policies enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.owner_commerce_config enable row level security;

create policy "authenticated read active product modules" on public.product_modules for select to authenticated using (active);
create policy "users read own entitlements" on public.user_entitlements for select to authenticated using ((select auth.uid())=user_id);
create policy "users read own trials" on public.module_trials for select to authenticated using ((select auth.uid())=user_id);
create policy "users read own credit balance" on public.hope_credit_accounts for select to authenticated using ((select auth.uid())=user_id);
create policy "users read own credit ledger" on public.hope_credit_ledger for select to authenticated using ((select auth.uid())=user_id);
create policy "users read own referral profile" on public.referral_profiles for select to authenticated using ((select auth.uid())=user_id);
create policy "referrers read own referrals" on public.referrals for select to authenticated using ((select auth.uid())=referrer_id);
create policy "referred users read own referral" on public.referrals for select to authenticated using ((select auth.uid())=referred_user_id);
create policy "users read own referral rewards" on public.referral_rewards for select to authenticated using ((select auth.uid())=beneficiary_id);
create policy "workspace admins read provider policies" on public.provider_policies for select to authenticated
  using (private.has_workspace_role(workspace_id,array['owner','admin']));
create policy "workspace admins insert provider policies" on public.provider_policies for insert to authenticated
  with check (updated_by=(select auth.uid()) and private.has_workspace_role(workspace_id,array['owner','admin']));
create policy "workspace admins update provider policies" on public.provider_policies for update to authenticated
  using (private.has_workspace_role(workspace_id,array['owner','admin']))
  with check (updated_by=(select auth.uid()) and private.has_workspace_role(workspace_id,array['owner','admin']));

grant select on public.product_modules to authenticated;
grant select on public.user_entitlements,public.module_trials,public.hope_credit_accounts,
  public.hope_credit_ledger,public.referral_profiles,public.referrals,public.referral_rewards to authenticated;
grant select,insert,update on public.provider_policies to authenticated;
