revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.accept_existing_invitation() from public, anon, authenticated;
revoke all on function public.is_workspace_member(uuid) from public, anon;
revoke all on function public.has_workspace_role(uuid, text[]) from public, anon;

create index workspaces_owner_idx on public.workspaces(owner_id);
create index invitations_invited_by_idx on public.invitations(invited_by);
create index invitations_accepted_by_idx on public.invitations(accepted_by) where accepted_by is not null;
create index audit_events_actor_idx on public.audit_events(actor_id) where actor_id is not null;

drop policy if exists profiles_select_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists invitations_select_admin_or_recipient on public.invitations;
drop policy if exists invitations_manage_admin on public.invitations;
create policy invitations_select_admin_or_recipient on public.invitations
  for select to authenticated using (
    public.has_workspace_role(workspace_id, array['owner','admin'])
    or lower(email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  );
create policy invitations_insert_admin on public.invitations
  for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner','admin']));
create policy invitations_update_admin on public.invitations
  for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','admin']))
  with check (public.has_workspace_role(workspace_id, array['owner','admin']));
create policy invitations_delete_admin on public.invitations
  for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','admin']));

drop policy if exists memberships_manage_admin on public.memberships;
create policy memberships_insert_admin on public.memberships
  for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner','admin']));
create policy memberships_update_admin on public.memberships
  for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','admin']))
  with check (public.has_workspace_role(workspace_id, array['owner','admin']));
create policy memberships_delete_admin on public.memberships
  for delete to authenticated
  using (
    public.has_workspace_role(workspace_id, array['owner','admin'])
    and not (user_id = (select auth.uid()) and role = 'owner')
  );

drop policy if exists audit_insert_members on public.audit_events;
create policy audit_insert_members on public.audit_events
  for insert to authenticated with check (
    actor_id = (select auth.uid()) and public.is_workspace_member(workspace_id)
  );
