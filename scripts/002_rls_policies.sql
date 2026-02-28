-- Organizations: members can read their org, admins can update
create policy "org_select_member" on public.organizations
  for select using (
    exists (select 1 from public.members where members.org_id = organizations.id and members.user_id = auth.uid())
  );

create policy "org_update_admin" on public.organizations
  for update using (
    exists (select 1 from public.members where members.org_id = organizations.id and members.user_id = auth.uid() and members.role = 'admin')
  );

-- Allow any authenticated user to create an org (during onboarding)
create policy "org_insert_authenticated" on public.organizations
  for insert with check (auth.uid() is not null);

-- Members: can see members in their own org
create policy "members_select_own_org" on public.members
  for select using (
    exists (select 1 from public.members m where m.org_id = members.org_id and m.user_id = auth.uid())
  );

-- Admins can insert new members
create policy "members_insert_admin" on public.members
  for insert with check (
    -- Allow self-insert (first admin creating org) or admin adding members
    auth.uid() = user_id or
    exists (select 1 from public.members m where m.org_id = org_id and m.user_id = auth.uid() and m.role = 'admin')
  );

-- Admins can remove members
create policy "members_delete_admin" on public.members
  for delete using (
    exists (select 1 from public.members m where m.org_id = members.org_id and m.user_id = auth.uid() and m.role = 'admin')
  );

-- Invitations: admins can manage for their org
create policy "invitations_select_admin" on public.invitations
  for select using (
    exists (select 1 from public.members where members.org_id = invitations.org_id and members.user_id = auth.uid() and members.role = 'admin')
  );

-- Anyone can select an invitation by token (for accepting)
create policy "invitations_select_by_token" on public.invitations
  for select using (token is not null);

create policy "invitations_insert_admin" on public.invitations
  for insert with check (
    exists (select 1 from public.members where members.org_id = org_id and members.user_id = auth.uid() and members.role = 'admin')
  );

create policy "invitations_update_accept" on public.invitations
  for update using (auth.uid() is not null);

create policy "invitations_delete_admin" on public.invitations
  for delete using (
    exists (select 1 from public.members where members.org_id = invitations.org_id and members.user_id = auth.uid() and members.role = 'admin')
  );

-- Chats: users can CRUD their own chats
create policy "chats_select_own" on public.chats
  for select using (auth.uid() = user_id);

create policy "chats_insert_own" on public.chats
  for insert with check (auth.uid() = user_id);

create policy "chats_update_own" on public.chats
  for update using (auth.uid() = user_id);

create policy "chats_delete_own" on public.chats
  for delete using (auth.uid() = user_id);

-- Messages: users can CRUD messages in their own chats
create policy "messages_select_own_chat" on public.messages
  for select using (
    exists (select 1 from public.chats where chats.id = messages.chat_id and chats.user_id = auth.uid())
  );

create policy "messages_insert_own_chat" on public.messages
  for insert with check (
    exists (select 1 from public.chats where chats.id = messages.chat_id and chats.user_id = auth.uid())
  );

create policy "messages_update_own_chat" on public.messages
  for update using (
    exists (select 1 from public.chats where chats.id = messages.chat_id and chats.user_id = auth.uid())
  );

create policy "messages_delete_own_chat" on public.messages
  for delete using (
    exists (select 1 from public.chats where chats.id = messages.chat_id and chats.user_id = auth.uid())
  );
