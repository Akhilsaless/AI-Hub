drop policy if exists "referred users read own referral" on public.referrals;
drop policy if exists "referrers read own referrals" on public.referrals;

create policy "participants read own referrals"
on public.referrals
for select
to authenticated
using (
  (select auth.uid()) = referrer_id
  or (select auth.uid()) = referred_user_id
);
