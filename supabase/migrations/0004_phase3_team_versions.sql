-- =====================================================================
-- Phase 3: Version History, akses per project, perlindungan owner workspace.
-- Tidak menghapus data. Kebijakan RLS lama diganti dengan versi yang
-- memperhitungkan akses per project (drop policy + create policy).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Akses per project
-- ---------------------------------------------------------------------
alter table public.podcast_projects add column if not exists restricted boolean not null default false;

create table if not exists public.project_members (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  project_id    uuid not null references public.podcast_projects(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (project_id, user_id)
);
create index if not exists project_members_user_idx on public.project_members (user_id);

drop trigger if exists set_updated_at on public.project_members;
create trigger set_updated_at before update on public.project_members
  for each row execute function public.set_updated_at();

-- Admin workspace: semua project. Member: project terbuka, atau project terbatas yang ia ditugaskan.
create or replace function public.can_access_project(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.podcast_projects p
    where p.id = pid
      and (
        public.is_workspace_admin(p.workspace_id)
        or (
          public.is_workspace_member(p.workspace_id)
          and (not p.restricted
               or exists (select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = auth.uid()))
        )
      )
  );
$$;

create or replace function public.can_access_episode(eid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.episodes e where e.id = eid and public.can_access_project(e.project_id));
$$;

-- Hanya admin yang boleh mengubah status "terbatas" sebuah project.
create or replace function public.guard_project_restricted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.restricted is distinct from old.restricted and not public.is_workspace_admin(new.workspace_id) then
    raise exception 'Hanya admin yang dapat mengatur akses project';
  end if;
  return new;
end $$;
drop trigger if exists guard_project_restricted on public.podcast_projects;
create trigger guard_project_restricted before update on public.podcast_projects
  for each row execute function public.guard_project_restricted();

-- Anggota project harus anggota workspace yang sama.
create or replace function public.check_project_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from podcast_projects where id = new.project_id and workspace_id = new.workspace_id) then
    raise exception 'Project tidak berada di workspace ini';
  end if;
  if not exists (select 1 from workspace_members where workspace_id = new.workspace_id and user_id = new.user_id) then
    raise exception 'Pengguna bukan anggota workspace ini';
  end if;
  return new;
end $$;
drop trigger if exists check_project_member on public.project_members;
create trigger check_project_member before insert or update on public.project_members
  for each row execute function public.check_project_member();

alter table public.project_members enable row level security;
drop policy if exists "project_members_select" on public.project_members;
drop policy if exists "project_members_insert" on public.project_members;
drop policy if exists "project_members_delete" on public.project_members;
create policy "project_members_select" on public.project_members for select using (public.is_workspace_member(workspace_id));
create policy "project_members_insert" on public.project_members for insert with check (public.is_workspace_admin(workspace_id));
create policy "project_members_delete" on public.project_members for delete using (public.is_workspace_admin(workspace_id));

-- ---------------------------------------------------------------------
-- 2. Version History script
-- ---------------------------------------------------------------------
create table if not exists public.script_versions (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  script_id     uuid not null references public.scripts(id) on delete cascade,
  title         text not null,
  content       jsonb not null,
  word_count    integer not null default 0,
  note          text,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists script_versions_script_idx on public.script_versions (script_id, created_at desc);

drop trigger if exists set_updated_at on public.script_versions;
create trigger set_updated_at before update on public.script_versions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 3. Lindungi owner workspace: tidak bisa dikeluarkan atau diturunkan dari admin.
-- ---------------------------------------------------------------------
create or replace function public.guard_workspace_owner()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select owner_id into owner from workspaces where id = old.workspace_id;
  if owner is not null and old.user_id = owner then
    if tg_op = 'DELETE' then
      -- Izinkan bila workspace sendiri sedang dihapus (cascade).
      if exists (select 1 from workspaces where id = old.workspace_id) then
        raise exception 'Pemilik workspace tidak dapat dikeluarkan';
      end if;
    elsif new.role <> 'admin' then
      raise exception 'Pemilik workspace harus tetap admin';
    end if;
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists guard_workspace_owner on public.workspace_members;
create trigger guard_workspace_owner before update or delete on public.workspace_members
  for each row execute function public.guard_workspace_owner();

-- Saat anggota dikeluarkan dari workspace, hapus juga akses project-nya.
create or replace function public.cleanup_project_members()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from project_members where workspace_id = old.workspace_id and user_id = old.user_id;
  return old;
end $$;
drop trigger if exists cleanup_project_members on public.workspace_members;
create trigger cleanup_project_members after delete on public.workspace_members
  for each row execute function public.cleanup_project_members();

-- ---------------------------------------------------------------------
-- 4. RLS baru yang memperhitungkan akses project
-- ---------------------------------------------------------------------
-- podcast_projects
drop policy if exists "podcast_projects_select" on public.podcast_projects;
drop policy if exists "podcast_projects_update" on public.podcast_projects;
create policy "podcast_projects_select" on public.podcast_projects for select using (public.can_access_project(id));
create policy "podcast_projects_update" on public.podcast_projects for update
  using (public.can_access_project(id)) with check (public.is_workspace_member(workspace_id));

-- episodes
drop policy if exists "episodes_select" on public.episodes;
drop policy if exists "episodes_insert" on public.episodes;
drop policy if exists "episodes_update" on public.episodes;
drop policy if exists "episodes_delete" on public.episodes;
create policy "episodes_select" on public.episodes for select using (public.can_access_project(project_id));
create policy "episodes_insert" on public.episodes for insert with check (public.is_workspace_member(workspace_id) and public.can_access_project(project_id));
create policy "episodes_update" on public.episodes for update using (public.can_access_project(project_id)) with check (public.can_access_project(project_id));
create policy "episodes_delete" on public.episodes for delete using (public.can_access_project(project_id));

-- Tabel turunan episode
do $$
declare t text;
begin
  foreach t in array array['scripts','questions','conversation_flow_items','rundown_segments','recording_notes','episode_assets'] loop
    execute format('drop policy if exists "%1$s_select" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_insert" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_update" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_delete" on public.%1$I', t);
    execute format('create policy "%1$s_select" on public.%1$I for select using (public.can_access_episode(episode_id))', t);
    execute format('create policy "%1$s_insert" on public.%1$I for insert with check (public.is_workspace_member(workspace_id) and public.can_access_episode(episode_id))', t);
    execute format('create policy "%1$s_update" on public.%1$I for update using (public.can_access_episode(episode_id)) with check (public.can_access_episode(episode_id))', t);
    execute format('create policy "%1$s_delete" on public.%1$I for delete using (public.can_access_episode(episode_id))', t);
  end loop;
end $$;

-- script_sections & script_versions (lewat script)
create or replace function public.can_access_script(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.scripts s where s.id = sid and public.can_access_episode(s.episode_id));
$$;

do $$
declare t text;
begin
  foreach t in array array['script_sections','script_versions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%1$s_select" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_insert" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_update" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_delete" on public.%1$I', t);
    execute format('create policy "%1$s_select" on public.%1$I for select using (public.can_access_script(script_id))', t);
    execute format('create policy "%1$s_insert" on public.%1$I for insert with check (public.is_workspace_member(workspace_id) and public.can_access_script(script_id))', t);
    execute format('create policy "%1$s_update" on public.%1$I for update using (public.can_access_script(script_id)) with check (public.can_access_script(script_id))', t);
    execute format('create policy "%1$s_delete" on public.%1$I for delete using (public.can_access_script(script_id))', t);
  end loop;
end $$;

-- follow_up_questions (lewat pertanyaan)
drop policy if exists "follow_up_questions_select" on public.follow_up_questions;
drop policy if exists "follow_up_questions_insert" on public.follow_up_questions;
drop policy if exists "follow_up_questions_update" on public.follow_up_questions;
drop policy if exists "follow_up_questions_delete" on public.follow_up_questions;
create policy "follow_up_questions_select" on public.follow_up_questions for select
  using (exists (select 1 from public.questions q where q.id = question_id and public.can_access_episode(q.episode_id)));
create policy "follow_up_questions_insert" on public.follow_up_questions for insert
  with check (public.is_workspace_member(workspace_id) and exists (select 1 from public.questions q where q.id = question_id and public.can_access_episode(q.episode_id)));
create policy "follow_up_questions_update" on public.follow_up_questions for update
  using (exists (select 1 from public.questions q where q.id = question_id and public.can_access_episode(q.episode_id)));
create policy "follow_up_questions_delete" on public.follow_up_questions for delete
  using (exists (select 1 from public.questions q where q.id = question_id and public.can_access_episode(q.episode_id)));

-- Riset: tingkat workspace, kecuali bila terhubung ke episode dari project terbatas.
do $$
declare t text;
begin
  foreach t in array array['research_notes','research_sources'] loop
    execute format('drop policy if exists "%1$s_select" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_insert" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_update" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_delete" on public.%1$I', t);
    execute format('create policy "%1$s_select" on public.%1$I for select using (public.is_workspace_member(workspace_id) and (episode_id is null or public.can_access_episode(episode_id)))', t);
    execute format('create policy "%1$s_insert" on public.%1$I for insert with check (public.is_workspace_member(workspace_id) and (episode_id is null or public.can_access_episode(episode_id)))', t);
    execute format('create policy "%1$s_update" on public.%1$I for update using (public.is_workspace_member(workspace_id) and (episode_id is null or public.can_access_episode(episode_id))) with check (public.is_workspace_member(workspace_id))', t);
    execute format('create policy "%1$s_delete" on public.%1$I for delete using (public.is_workspace_member(workspace_id) and (episode_id is null or public.can_access_episode(episode_id)))', t);
  end loop;
end $$;
