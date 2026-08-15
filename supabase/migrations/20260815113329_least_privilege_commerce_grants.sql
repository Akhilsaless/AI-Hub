revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;

revoke all privileges on table
  public.product_modules,
  public.user_entitlements,
  public.module_trials,
  public.hope_credit_accounts,
  public.hope_credit_ledger,
  public.referral_profiles,
  public.referrals,
  public.referral_rewards,
  public.provider_policies,
  public.ai_usage_events,
  public.owner_commerce_config
from authenticated;

grant select on table public.product_modules to authenticated;
grant select on table
  public.user_entitlements,
  public.module_trials,
  public.hope_credit_accounts,
  public.hope_credit_ledger,
  public.referral_profiles,
  public.referrals,
  public.referral_rewards
to authenticated;
grant select, insert, update on table public.provider_policies to authenticated;

revoke all privileges on sequence public.ai_usage_events_id_seq from authenticated;
