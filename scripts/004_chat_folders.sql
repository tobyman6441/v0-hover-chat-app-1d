-- Chat folders table
create table if not exists public.chat_folders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text default '#6b7280', -- Default gray color
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.chat_folders enable row level security;

-- RLS policies for chat_folders
create policy "chat_folders_select_own" on public.chat_folders 
  for select using (auth.uid() = user_id);
create policy "chat_folders_insert_own" on public.chat_folders 
  for insert with check (auth.uid() = user_id);
create policy "chat_folders_update_own" on public.chat_folders 
  for update using (auth.uid() = user_id);
create policy "chat_folders_delete_own" on public.chat_folders 
  for delete using (auth.uid() = user_id);

-- Add folder_id column to chats table
alter table public.chats add column if not exists folder_id uuid references public.chat_folders(id) on delete set null;

-- Function to get user's folders
create or replace function get_user_folders(p_user_id uuid)
returns table (
  id uuid,
  name text,
  color text,
  sort_order integer,
  chat_count bigint,
  created_at timestamptz
)
language sql security definer as $$
  select 
    f.id,
    f.name,
    f.color,
    f.sort_order,
    count(c.id) as chat_count,
    f.created_at
  from chat_folders f
  left join chats c on c.folder_id = f.id
  where f.user_id = p_user_id
  group by f.id, f.name, f.color, f.sort_order, f.created_at
  order by f.sort_order, f.created_at;
$$;

-- Function to create a folder
create or replace function create_folder(p_user_id uuid, p_org_id uuid, p_name text, p_color text default '#6b7280')
returns uuid
language plpgsql security definer as $$
declare
  v_folder_id uuid;
  v_max_order integer;
begin
  -- Get max sort order
  select coalesce(max(sort_order), -1) + 1 into v_max_order
  from chat_folders
  where user_id = p_user_id;

  insert into chat_folders (user_id, org_id, name, color, sort_order)
  values (p_user_id, p_org_id, p_name, p_color, v_max_order)
  returning id into v_folder_id;
  
  return v_folder_id;
end;
$$;

-- Function to update a folder
create or replace function update_folder(p_folder_id uuid, p_user_id uuid, p_name text, p_color text)
returns void
language plpgsql security definer as $$
begin
  update chat_folders
  set name = p_name, color = p_color, updated_at = now()
  where id = p_folder_id and user_id = p_user_id;
end;
$$;

-- Function to delete a folder
create or replace function delete_folder(p_folder_id uuid, p_user_id uuid)
returns void
language plpgsql security definer as $$
begin
  -- Chats will have folder_id set to null automatically due to ON DELETE SET NULL
  delete from chat_folders
  where id = p_folder_id and user_id = p_user_id;
end;
$$;

-- Function to move chat to folder
create or replace function move_chat_to_folder(p_chat_id uuid, p_user_id uuid, p_folder_id uuid)
returns void
language plpgsql security definer as $$
begin
  update chats
  set folder_id = p_folder_id, updated_at = now()
  where id = p_chat_id and user_id = p_user_id;
end;
$$;

-- Update get_user_chats to include folder_id
create or replace function get_user_chats(p_user_id uuid)
returns table (
  id uuid,
  title text,
  folder_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language sql security definer as $$
  select c.id, c.title, c.folder_id, c.created_at, c.updated_at
  from chats c
  join members m on m.org_id = c.org_id
  where m.user_id = p_user_id
  order by c.updated_at desc;
$$;
