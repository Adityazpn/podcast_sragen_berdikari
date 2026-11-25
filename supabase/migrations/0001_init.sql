-- =====================================================================
-- PODCAST STUDIO — skema awal
-- Jalankan di Supabase SQL Editor (atau `supabase db push`).
-- Migrasi ini hanya MEMBUAT objek baru; tidak menghapus data apa pun.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Helper: kolom updated_at otomatis
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  email       text,
  avatar_url  text,
  job_title   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. workspaces
-- ---------------------------------------------------------------------
create table public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references public.profiles(id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. workspace_members
-- ---------------------------------------------------------------------
create table public.workspace_members (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  role          text not null default 'member' check (role in ('admin','member')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index on public.workspace_members (user_id);

-- ---------------------------------------------------------------------
-- RLS helper functions (SECURITY DEFINER agar tidak rekursif)
-- ---------------------------------------------------------------------
create or replace function public.is_workspace_member(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- 4. podcast_projects
-- ---------------------------------------------------------------------
create table public.podcast_projects (
  id                        uuid primary key default gen_random_uuid(),
  workspace_id              uuid not null references public.workspaces(id) on delete cascade,
  name                      text not null,
  description               text,
  category                  text,
  main_topic                text,
  target_audience           text,
  language                  text default 'Bahasa Indonesia',
  communication_style       text,
  default_episode_duration  integer check (default_episode_duration is null or default_episode_duration between 1 and 1440),
  host_name                 text,
  cover_path                text,
  created_by                uuid references public.profiles(id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index on public.podcast_projects (workspace_id);

-- ---------------------------------------------------------------------
-- 5. guests
-- ---------------------------------------------------------------------
create table public.guests (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  name            text not null,
  photo_path      text,
  profession      text,
  position        text,
  company         text,
  biography       text,
  background      text,
  career_journey  text,
  achievements    text,
  experiences     text,
  expertise       text,
  website         text,
  instagram       text,
  youtube         text,
  linkedin        text,
  contact_email   text,
  contact_phone   text,
  notes           text,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.guests (workspace_id);

-- ---------------------------------------------------------------------
-- 6. episodes
-- ---------------------------------------------------------------------
create table public.episodes (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references public.workspaces(id) on delete cascade,
  project_id          uuid not null references public.podcast_projects(id) on delete cascade,
  guest_id            uuid references public.guests(id) on delete set null,
  title               text not null,
  episode_number      integer,
  main_topic          text,
  description         text,
  host                text,
  recording_date      timestamptz,
  recording_location  text,
  duration_minutes    integer check (duration_minutes is null or duration_minutes between 1 and 1440),
  target_audience     text,
  objective           text,
  status              text not null default 'idea'
                      check (status in ('idea','planning','script_draft','ready_to_record','recorded','editing','published')),
  publication_link    text,
  archived_at         timestamptz,
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index on public.episodes (workspace_id);
create index on public.episodes (project_id);
create index on public.episodes (guest_id);

-- ---------------------------------------------------------------------
-- 7. scripts  &  8. script_sections
-- ---------------------------------------------------------------------
create table public.scripts (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  episode_id    uuid not null references public.episodes(id) on delete cascade,
  title         text not null default 'Untitled script',
  content       jsonb not null default '{}'::jsonb,
  word_count    integer not null default 0,
  status        text not null default 'draft' check (status in ('draft','final')),
  version       integer not null default 1,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.scripts (episode_id);

create table public.script_sections (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  script_id     uuid not null references public.scripts(id) on delete cascade,
  part          text not null check (part in ('opening','ice_breaking','main_discussion','deep_conversation','insight_takeaway','closing','custom')),
  title         text not null,
  content       jsonb not null default '{}'::jsonb,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.script_sections (script_id, position);

-- ---------------------------------------------------------------------
-- 9. questions  &  10. follow_up_questions
-- ---------------------------------------------------------------------
create table public.questions (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  episode_id    uuid not null references public.episodes(id) on delete cascade,
  question      text not null,
  category      text not null check (category in (
                  'opening','background','ice_breaking','career_journey','personal_experience',
                  'main_topic','challenges','deep_discussion','emotional','reflection',
                  'future_vision','closing')),
  purpose       text,
  host_notes    text,
  priority      text not null default 'normal' check (priority in ('important','normal','optional')),
  status        text not null default 'not_asked' check (status in ('not_asked','asked','skipped')),
  position      integer not null default 0,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.questions (episode_id, position);

create table public.follow_up_questions (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  question_id   uuid not null references public.questions(id) on delete cascade,
  question      text not null,
  status        text not null default 'not_asked' check (status in ('not_asked','asked','skipped')),
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.follow_up_questions (question_id, position);

-- ---------------------------------------------------------------------
-- 11. research_sources  &  12. research_notes
-- ---------------------------------------------------------------------
create table public.research_sources (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  guest_id      uuid references public.guests(id) on delete cascade,
  episode_id    uuid references public.episodes(id) on delete cascade,
  type          text not null check (type in ('pdf','document','website','youtube','article','other')),
  title         text not null,
  url           text,
  file_path     text,
  notes         text,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (url is not null or file_path is not null)
);
create index on public.research_sources (guest_id);
create index on public.research_sources (episode_id);

create table public.research_notes (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  guest_id      uuid references public.guests(id) on delete cascade,
  episode_id    uuid references public.episodes(id) on delete cascade,
  category      text not null check (category in (
                  'personal_background','education','career_journey','achievements',
                  'business_experience','interesting_stories','important_facts',
                  'interview_angles','topics_to_explore','sensitive_topics','sources_references')),
  title         text not null,
  content       text not null default '',
  position      integer not null default 0,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.research_notes (guest_id);
create index on public.research_notes (episode_id);

-- ---------------------------------------------------------------------
-- 13. rundown_segments
-- ---------------------------------------------------------------------
create table public.rundown_segments (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  episode_id        uuid not null references public.episodes(id) on delete cascade,
  title             text not null,
  duration_minutes  numeric(6,2) not null default 0 check (duration_minutes >= 0),
  notes             text,
  position          integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index on public.rundown_segments (episode_id, position);

-- ---------------------------------------------------------------------
-- 14. recording_notes
-- ---------------------------------------------------------------------
create table public.recording_notes (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces(id) on delete cascade,
  episode_id       uuid not null references public.episodes(id) on delete cascade,
  type             text not null check (type in ('live','important_moment','additional_question','revisit_topic','timestamp','checklist','post_recording')),
  content          text not null,
  timestamp_label  text,
  is_done          boolean not null default false,
  position         integer not null default 0,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on public.recording_notes (episode_id, position);

-- ---------------------------------------------------------------------
-- 15. episode_assets
-- ---------------------------------------------------------------------
create table public.episode_assets (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  episode_id    uuid not null references public.episodes(id) on delete cascade,
  name          text not null,
  type          text not null default 'file' check (type in ('file','link','image','audio','video')),
  file_path     text,
  url           text,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.episode_assets (episode_id);

-- ---------------------------------------------------------------------
-- 16. activity_logs
-- ---------------------------------------------------------------------
create table public.activity_logs (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  user_id       uuid references public.profiles(id) on delete set null,
  action        text not null,
  entity_type   text not null,
  entity_id     uuid,
  entity_label  text,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.activity_logs (workspace_id, created_at desc);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','workspaces','workspace_members','podcast_projects','guests','episodes',
    'scripts','script_sections','questions','follow_up_questions','research_sources',
    'research_notes','rundown_segments','recording_notes','episode_assets','activity_logs'
  ] loop
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Konsistensi workspace: episode harus satu workspace dengan project & guest
-- ---------------------------------------------------------------------
create or replace function public.check_episode_workspace()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from podcast_projects where id = new.project_id and workspace_id = new.workspace_id) then
    raise exception 'Project tidak berada di workspace yang sama';
  end if;
  if new.guest_id is not null and not exists (select 1 from guests where id = new.guest_id and workspace_id = new.workspace_id) then
    raise exception 'Guest tidak berada di workspace yang sama';
  end if;
  return new;
end $$;
create trigger check_episode_workspace before insert or update on public.episodes
  for each row execute function public.check_episode_workspace();

-- ---------------------------------------------------------------------
-- Pendaftaran pengguna baru: buat profile + workspace pribadi (role admin)
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ws_id uuid;
  display_name text := coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1));
begin
  insert into public.profiles (id, full_name, email) values (new.id, display_name, new.email);
  insert into public.workspaces (name, owner_id) values (display_name || '''s Studio', new.id) returning id into ws_id;
  insert into public.workspace_members (workspace_id, user_id, role) values (ws_id, new.id, 'admin');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles            enable row level security;
alter table public.workspaces          enable row level security;
alter table public.workspace_members   enable row level security;

-- profiles: diri sendiri + rekan satu workspace boleh dibaca; hanya diri sendiri boleh ubah
create policy "profiles_select" on public.profiles for select using (
  id = auth.uid() or exists (
    select 1 from public.workspace_members me
    join public.workspace_members other on other.workspace_id = me.workspace_id
    where me.user_id = auth.uid() and other.user_id = profiles.id
  )
);
create policy "profiles_update_self" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- workspaces
create policy "workspaces_select" on public.workspaces for select using (public.is_workspace_member(id));
create policy "workspaces_update_admin" on public.workspaces for update
  using (public.is_workspace_admin(id)) with check (public.is_workspace_admin(id));

-- workspace_members: anggota boleh lihat; hanya admin yang kelola
create policy "members_select" on public.workspace_members for select using (public.is_workspace_member(workspace_id));
create policy "members_insert_admin" on public.workspace_members for insert with check (public.is_workspace_admin(workspace_id));
create policy "members_update_admin" on public.workspace_members for update
  using (public.is_workspace_admin(workspace_id)) with check (public.is_workspace_admin(workspace_id));
create policy "members_delete_admin" on public.workspace_members for delete
  using (public.is_workspace_admin(workspace_id) and user_id <> auth.uid());

-- Tabel konten: anggota workspace boleh baca/tulis; hapus project hanya admin
do $$
declare t text;
begin
  foreach t in array array[
    'podcast_projects','guests','episodes','scripts','script_sections','questions',
    'follow_up_questions','research_sources','research_notes','rundown_segments',
    'recording_notes','episode_assets'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s_select" on public.%1$I for select using (public.is_workspace_member(workspace_id))', t);
    execute format('create policy "%1$s_insert" on public.%1$I for insert with check (public.is_workspace_member(workspace_id))', t);
    execute format('create policy "%1$s_update" on public.%1$I for update using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id))', t);
    if t = 'podcast_projects' then
      execute format('create policy "%1$s_delete" on public.%1$I for delete using (public.is_workspace_admin(workspace_id))', t);
    else
      execute format('create policy "%1$s_delete" on public.%1$I for delete using (public.is_workspace_member(workspace_id))', t);
    end if;
  end loop;
end $$;

-- activity_logs: anggota boleh baca dan menambah log atas nama sendiri; log tidak bisa diubah
alter table public.activity_logs enable row level security;
create policy "activity_select" on public.activity_logs for select using (public.is_workspace_member(workspace_id));
create policy "activity_insert" on public.activity_logs for insert
  with check (public.is_workspace_member(workspace_id) and user_id = auth.uid());

-- =====================================================================
-- STORAGE (bucket privat; path wajib diawali <workspace_id>/)
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('project-covers','project-covers', false),
       ('guest-photos','guest-photos', false),
       ('research-files','research-files', false),
       ('episode-assets','episode-assets', false)
on conflict (id) do nothing;

create or replace function public.storage_workspace_id(object_name text)
returns uuid language plpgsql immutable as $$
begin
  return (storage.foldername(object_name))[1]::uuid;
exception when others then
  return null;
end $$;

create policy "studio_storage_select" on storage.objects for select using (
  bucket_id in ('project-covers','guest-photos','research-files','episode-assets')
  and public.is_workspace_member(public.storage_workspace_id(name))
);
create policy "studio_storage_insert" on storage.objects for insert with check (
  bucket_id in ('project-covers','guest-photos','research-files','episode-assets')
  and public.is_workspace_member(public.storage_workspace_id(name))
);
create policy "studio_storage_update" on storage.objects for update using (
  bucket_id in ('project-covers','guest-photos','research-files','episode-assets')
  and public.is_workspace_member(public.storage_workspace_id(name))
);
create policy "studio_storage_delete" on storage.objects for delete using (
  bucket_id in ('project-covers','guest-photos','research-files','episode-assets')
  and public.is_workspace_member(public.storage_workspace_id(name))
);

-- Avatar pengguna: path <user_id>/<file>. Boleh dibaca semua pengguna login, ditulis hanya pemiliknya.
insert into storage.buckets (id, name, public) values ('avatars','avatars', false) on conflict (id) do nothing;

create policy "avatars_select" on storage.objects for select to authenticated using (bucket_id = 'avatars');
create policy "avatars_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
