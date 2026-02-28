-- RPC function to add a chat message (bypasses RLS for server-side use)
create or replace function add_chat_message(
  p_chat_id uuid,
  p_user_id uuid,
  p_role text,
  p_content text
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_message_id uuid;
  v_chat_user_id uuid;
begin
  -- Verify the chat belongs to the user
  select user_id into v_chat_user_id
  from public.chats
  where id = p_chat_id;
  
  if v_chat_user_id is null then
    raise exception 'Chat not found';
  end if;
  
  if v_chat_user_id != p_user_id then
    raise exception 'Not authorized';
  end if;
  
  -- Insert the message
  insert into public.messages (chat_id, role, content)
  values (p_chat_id, p_role, p_content)
  returning id into v_message_id;
  
  -- Update chat's updated_at timestamp
  update public.chats
  set updated_at = now()
  where id = p_chat_id;
  
  return v_message_id;
end;
$$;

-- RPC function to get chat messages (with user verification)
create or replace function get_chat_messages(
  p_chat_id uuid,
  p_user_id uuid
)
returns table (
  id uuid,
  chat_id uuid,
  role text,
  content text,
  created_at timestamptz
)
language plpgsql
security definer
as $$
begin
  -- Verify the chat belongs to the user
  if not exists (
    select 1 from public.chats
    where chats.id = p_chat_id and chats.user_id = p_user_id
  ) then
    raise exception 'Not authorized';
  end if;
  
  -- Return messages ordered by creation time
  return query
  select m.id, m.chat_id, m.role, m.content, m.created_at
  from public.messages m
  where m.chat_id = p_chat_id
  order by m.created_at asc;
end;
$$;
