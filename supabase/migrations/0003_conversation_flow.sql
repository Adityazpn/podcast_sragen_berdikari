-- =====================================================================
-- Phase 2: Conversation Flow. Hanya MENAMBAH tabel baru.
-- =====================================================================

create table if not exists public.conversation_flow_items (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  episode_id    uuid not null references public.episodes(id) on delete cascade,
  type          text not null check (type in (
                  'opening_transition','question_transition','topic_bridge','follow_up_prompt',
                  'natural_prompt','backup_question','closing_transition')),
  title         text not null default '',
  content       text not null default '',
  position      integer not null default 0,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists conversation_flow_items_episode_idx on public.conversation_flow_items (episode_id, position);

drop trigger if exists set_updated_at on public.conversation_flow_items;
create trigger set_updated_at before update on public.conversation_flow_items
  for each row execute function public.set_updated_at();

alter table public.conversation_flow_items enable row level security;

drop policy if exists "conversation_flow_items_select" on public.conversation_flow_items;
drop policy if exists "conversation_flow_items_insert" on public.conversation_flow_items;
drop policy if exists "conversation_flow_items_update" on public.conversation_flow_items;
drop policy if exists "conversation_flow_items_delete" on public.conversation_flow_items;
create policy "conversation_flow_items_select" on public.conversation_flow_items for select using (public.is_workspace_member(workspace_id));
create policy "conversation_flow_items_insert" on public.conversation_flow_items for insert with check (public.is_workspace_member(workspace_id));
create policy "conversation_flow_items_update" on public.conversation_flow_items for update using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "conversation_flow_items_delete" on public.conversation_flow_items for delete using (public.is_workspace_member(workspace_id));

-- Batas ukuran file riset (20 MB) dan tipe yang diizinkan.
update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'image/jpeg','image/png','image/webp'
    ]
where id = 'research-files';
