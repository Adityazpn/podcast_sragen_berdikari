-- =====================================================================
-- Uji izin database (RLS). Jalankan lewat scripts/test-rls.sh.
-- Setiap pemeriksaan yang gagal menghentikan skrip dengan pesan FAIL.
-- =====================================================================
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null
set client_min_messages = warning;

create schema tests;
grant usage on schema tests to authenticated, anon, service_role;
create table tests.results (label text, ok boolean);
grant insert, select on tests.results to authenticated, anon, service_role;

-- Hasil harus sama dengan nilai yang diharapkan.
create function tests.eq(label text, actual bigint, expected bigint) returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL: % (dapat %, harusnya %)', label, actual, expected;
  end if;
  insert into tests.results values (label, true);
end $$;

-- Statement harus ditolak (error RLS/trigger) ATAU tidak mengenai baris apa pun.
create function tests.denied(label text, stmt text) returns void language plpgsql as $$
declare n bigint;
begin
  begin
    execute stmt;
    get diagnostics n = row_count;
  exception when others then
    insert into tests.results values (label, true);
    return;
  end;
  if n > 0 then
    raise exception 'FAIL: % (statement berhasil mengenai % baris)', label, n;
  end if;
  insert into tests.results values (label, true);
end $$;

-- Statement harus berhasil dan mengenai minimal satu baris.
create function tests.allowed(label text, stmt text) returns void language plpgsql as $$
declare n bigint;
begin
  execute stmt;
  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'FAIL: % (tidak ada baris yang terkena)', label;
  end if;
  insert into tests.results values (label, true);
end $$;
grant execute on all functions in schema tests to authenticated, anon, service_role;

-- ---------------------------------------------------------------------
-- Data uji: A = admin/pemilik workspace W, B = member W, C = orang luar (punya workspace sendiri)
-- ---------------------------------------------------------------------
\set A 'aaaaaaaa-0000-0000-0000-000000000001'
\set B 'bbbbbbbb-0000-0000-0000-000000000002'
\set C 'cccccccc-0000-0000-0000-000000000003'

insert into auth.users (id, email, raw_user_meta_data) values
  (:'A', 'a@test.id', '{"full_name":"Admin A","username":"admin_a"}'),
  (:'B', 'b@test.id', '{"full_name":"Member B","username":"member_b"}'),
  (:'C', 'c@test.id', '{"full_name":"Outsider C","username":"outsider_c"}');

select tests.eq('trigger membuat profile untuk tiap user baru', (select count(*) from profiles), 3);
select tests.eq('trigger membuat workspace pribadi', (select count(*) from workspaces), 3);
select tests.eq('pembuat workspace menjadi admin', (select count(*) from workspace_members where role = 'admin'), 3);
select tests.eq('username dari metadata tersimpan', (select count(*) from profiles where username = 'member_b'), 1);

create temp table w as select id from workspaces where owner_id = :'A';
create temp table wc as select id from workspaces where owner_id = :'C';
grant select on w, wc to authenticated, anon;

insert into workspace_members (workspace_id, user_id, role) select id, :'B', 'member' from w;
insert into podcast_projects (id, workspace_id, name) select '11111111-0000-0000-0000-00000000000a', id, 'Open' from w;
insert into podcast_projects (id, workspace_id, name) select '22222222-0000-0000-0000-00000000000b', id, 'Secret' from w;
insert into guests (id, workspace_id, name) select '6a000000-0000-0000-0000-000000000001', id, 'Tamu' from w;
insert into episodes (id, workspace_id, project_id, title) select 'e1111111-0000-0000-0000-000000000001', id, '11111111-0000-0000-0000-00000000000a', 'E open' from w;
insert into episodes (id, workspace_id, project_id, title) select 'e2222222-0000-0000-0000-000000000002', id, '22222222-0000-0000-0000-00000000000b', 'E secret' from w;
insert into scripts (id, workspace_id, episode_id, title) select '5c111111-0000-0000-0000-000000000001', id, 'e2222222-0000-0000-0000-000000000002', 'S secret' from w;
insert into scripts (id, workspace_id, episode_id, title) select '5c222222-0000-0000-0000-000000000002', id, 'e1111111-0000-0000-0000-000000000001', 'S open' from w;
insert into script_sections (workspace_id, script_id, part, title) select id, '5c111111-0000-0000-0000-000000000001', 'opening', 'PART 1' from w;
insert into questions (id, workspace_id, episode_id, question, category) select '9a111111-0000-0000-0000-000000000001', id, 'e2222222-0000-0000-0000-000000000002', 'Q?', 'opening' from w;
insert into follow_up_questions (workspace_id, question_id, question) select id, '9a111111-0000-0000-0000-000000000001', 'fu' from w;
insert into research_notes (workspace_id, episode_id, category, title) select id, 'e2222222-0000-0000-0000-000000000002', 'education', 'RN secret' from w;
insert into research_notes (workspace_id, category, title) select id, 'education', 'RN general' from w;
insert into rundown_segments (workspace_id, episode_id, title) select id, 'e2222222-0000-0000-0000-000000000002', 'Opening' from w;
insert into recording_notes (workspace_id, episode_id, type, content) select id, 'e2222222-0000-0000-0000-000000000002', 'live', 'catatan' from w;
insert into conversation_flow_items (workspace_id, episode_id, type, title) select id, 'e2222222-0000-0000-0000-000000000002', 'opening_transition', 'Alur' from w;
insert into storage.objects (bucket_id, name) select 'guest-photos', id || '/foto.jpg' from w;
insert into storage.objects (bucket_id, name) values ('avatars', :'A' || '/a.jpg');

-- ---------------------------------------------------------------------
-- 1. Anon (belum login) tidak bisa membaca apa pun
-- ---------------------------------------------------------------------
set role anon;
select tests.denied('anon tidak bisa membaca profiles', 'select 1 from profiles');
select tests.denied('anon tidak bisa memanggil email_for_username', $q$select public.email_for_username('admin_a')$q$);
reset role;

set role authenticated;
-- ---------------------------------------------------------------------
-- 2. Orang luar (C) tidak melihat atau mengubah data workspace W
-- ---------------------------------------------------------------------
set request.jwt.claim.sub = :'C';
select tests.eq('C hanya melihat workspace sendiri', (select count(*) from workspaces), 1);
select tests.eq('C tidak melihat project W', (select count(*) from podcast_projects), 0);
select tests.eq('C tidak melihat episode W', (select count(*) from episodes), 0);
select tests.eq('C tidak melihat guest W', (select count(*) from guests), 0);
select tests.eq('C tidak melihat script W', (select count(*) from scripts), 0);
select tests.eq('C tidak melihat riset W', (select count(*) from research_notes), 0);
select tests.eq('C tidak melihat rundown W', (select count(*) from rundown_segments), 0);
select tests.eq('C tidak melihat catatan rekaman W', (select count(*) from recording_notes), 0);
select tests.eq('C tidak melihat alur W', (select count(*) from conversation_flow_items), 0);
select tests.eq('C tidak melihat anggota W', (select count(*) from workspace_members where workspace_id = (select id from w)), 0);
select tests.eq('C hanya melihat profile sendiri', (select count(*) from profiles), 1);
select tests.eq('C tidak melihat file storage W', (select count(*) from storage.objects where bucket_id = 'guest-photos'), 0);
select tests.denied('C tidak bisa membuat project di W', $q$insert into podcast_projects (workspace_id, name) select id, 'x' from w$q$);
select tests.denied('C tidak bisa menambah dirinya ke W', format($q$insert into workspace_members (workspace_id, user_id) select id, %L from w$q$, :'C'));
select tests.denied('C tidak bisa mengubah nama workspace W', $q$update workspaces set name = 'hack' where id = (select id from w)$q$);
select tests.denied('C tidak bisa menghapus episode W', $q$delete from episodes$q$);
select tests.denied('C tidak bisa menulis log atas nama A', format($q$insert into activity_logs (workspace_id, user_id, action, entity_type) select id, %L, 'created', 'project' from wc$q$, :'A'));
select tests.denied('C tidak bisa mengunggah ke folder W', $q$insert into storage.objects (bucket_id, name) select 'guest-photos', id || '/x.jpg' from w$q$);
select tests.denied('C tidak bisa menimpa avatar A', format($q$insert into storage.objects (bucket_id, name) values ('avatars', %L)$q$, :'A' || '/x.jpg'));
select tests.denied('C tidak bisa mengubah profile A', format($q$update profiles set full_name = 'hack' where id = %L$q$, :'A'));
select tests.denied('C tidak bisa membuat script di workspacenya untuk episode W', $q$insert into scripts (workspace_id, episode_id, title) select id, 'e1111111-0000-0000-0000-000000000001', 'x' from wc$q$);

-- ---------------------------------------------------------------------
-- 3. Member (B): baca/tulis konten, tapi tidak bisa mengelola tim
-- ---------------------------------------------------------------------
set request.jwt.claim.sub = :'B';
select tests.eq('B melihat semua project terbuka W', (select count(*) from podcast_projects where workspace_id = (select id from w)), 2);
select tests.eq('B melihat profile rekan', (select count(*) from profiles where id in (:'A', :'B')), 2);
select tests.eq('B melihat file storage W', (select count(*) from storage.objects where bucket_id = 'guest-photos'), 1);
select tests.allowed('B bisa membuat guest di W', $q$insert into guests (workspace_id, name) select id, 'Tamu B' from w$q$);
select tests.allowed('B bisa mengubah episode', $q$update episodes set title = 'E open 2' where id = 'e1111111-0000-0000-0000-000000000001'$q$);
select tests.allowed('B bisa menulis log atas nama sendiri', format($q$insert into activity_logs (workspace_id, user_id, action, entity_type) select id, %L, 'created', 'guest' from w$q$, :'B'));
select tests.denied('B tidak bisa menghapus project', $q$delete from podcast_projects where name = 'Open'$q$);
select tests.denied('B tidak bisa mengubah nama workspace', $q$update workspaces set name = 'hack' where id = (select id from w)$q$);
select tests.denied('B tidak bisa menjadikan dirinya admin', format($q$update workspace_members set role = 'admin' where user_id = %L and workspace_id = (select id from w)$q$, :'B'));
select tests.denied('B tidak bisa menambah anggota', format($q$insert into workspace_members (workspace_id, user_id) select id, %L from w$q$, :'C'));
select tests.denied('B tidak bisa mengeluarkan admin', format($q$delete from workspace_members where user_id = %L and workspace_id = (select id from w)$q$, :'A'));
select tests.denied('B tidak bisa membatasi project', $q$update podcast_projects set restricted = true where name = 'Secret'$q$);
select tests.denied('B tidak bisa mengubah log aktivitas', $q$update activity_logs set entity_label = 'x'$q$);
select tests.denied('B tidak bisa menghapus log aktivitas', $q$delete from activity_logs$q$);

-- ---------------------------------------------------------------------
-- 4. Akses per project (Phase 3)
-- ---------------------------------------------------------------------
set request.jwt.claim.sub = :'A';
select tests.allowed('A bisa membatasi project', $q$update podcast_projects set restricted = true where name = 'Secret'$q$);

set request.jwt.claim.sub = :'B';
select tests.eq('B tidak melihat project terbatas', (select count(*) from podcast_projects where name = 'Secret'), 0);
select tests.eq('B tidak melihat episode project terbatas', (select count(*) from episodes where title = 'E secret'), 0);
select tests.eq('B tidak melihat script project terbatas', (select count(*) from scripts where title = 'S secret'), 0);
select tests.eq('B tetap melihat script project terbuka', (select count(*) from scripts where title = 'S open'), 1);
select tests.eq('B tidak melihat section script terbatas', (select count(*) from script_sections), 0);
select tests.eq('B tidak melihat pertanyaan terbatas', (select count(*) from questions), 0);
select tests.eq('B tidak melihat follow-up terbatas', (select count(*) from follow_up_questions), 0);
select tests.eq('B tidak melihat rundown terbatas', (select count(*) from rundown_segments), 0);
select tests.eq('B tidak melihat catatan rekaman terbatas', (select count(*) from recording_notes), 0);
select tests.eq('B tidak melihat alur terbatas', (select count(*) from conversation_flow_items), 0);
select tests.eq('B hanya melihat riset umum', (select count(*) from research_notes), 1);
select tests.denied('B tidak bisa menambah script ke episode terbatas', $q$insert into scripts (workspace_id, episode_id, title) select id, 'e2222222-0000-0000-0000-000000000002', 'hack' from w$q$);
select tests.denied('B tidak bisa menambah episode ke project terbatas', $q$insert into episodes (workspace_id, project_id, title) select id, '22222222-0000-0000-0000-00000000000b', 'hack' from w$q$);
select tests.denied('B tidak bisa memberi dirinya akses', format($q$insert into project_members (workspace_id, project_id, user_id) select id, '22222222-0000-0000-0000-00000000000b', %L from w$q$, :'B'));

set request.jwt.claim.sub = :'A';
select tests.denied('A tidak bisa memberi akses ke orang luar', format($q$insert into project_members (workspace_id, project_id, user_id) select id, '22222222-0000-0000-0000-00000000000b', %L from w$q$, :'C'));
select tests.allowed('A bisa memberi akses ke B', format($q$insert into project_members (workspace_id, project_id, user_id) select id, '22222222-0000-0000-0000-00000000000b', %L from w$q$, :'B'));

set request.jwt.claim.sub = :'B';
select tests.eq('B melihat project terbatas setelah diberi akses', (select count(*) from podcast_projects where name = 'Secret'), 1);
select tests.eq('B melihat script setelah diberi akses', (select count(*) from scripts where title = 'S secret'), 1);
select tests.allowed('B bisa menyimpan versi script', $q$insert into script_versions (workspace_id, script_id, title, content) select workspace_id, id, title, '{}' from scripts where title = 'S secret'$q$);

set request.jwt.claim.sub = :'C';
select tests.eq('C tidak melihat versi script W', (select count(*) from script_versions), 0);

-- ---------------------------------------------------------------------
-- 5. Perlindungan pemilik workspace
-- ---------------------------------------------------------------------
set request.jwt.claim.sub = :'A';
select tests.denied('Pemilik tidak bisa diturunkan menjadi member', format($q$update workspace_members set role = 'member' where user_id = %L and workspace_id = (select id from w)$q$, :'A'));
select tests.denied('Admin tidak bisa mengeluarkan diri sendiri', format($q$delete from workspace_members where user_id = %L and workspace_id = (select id from w)$q$, :'A'));
select tests.allowed('Admin bisa mengeluarkan member', format($q$delete from workspace_members where user_id = %L and workspace_id = (select id from w)$q$, :'B'));
reset role;
select tests.eq('Akses project ikut dicabut saat member dikeluarkan', (select count(*) from project_members where user_id = :'B'), 0);

set role authenticated;
set request.jwt.claim.sub = :'B';
select tests.eq('B tidak melihat W setelah dikeluarkan', (select count(*) from podcast_projects where workspace_id = (select id from w)), 0);
reset role;

-- ---------------------------------------------------------------------
-- 6. Fungsi username
-- ---------------------------------------------------------------------
select tests.eq('username_available menolak username terpakai (case-insensitive)', (select count(*) from (select public.username_available('ADMIN_A') v) x where v), 0);
set role service_role;
select tests.eq('service_role bisa mencari email dari username', (select count(*) from (select public.email_for_username('Admin_A') e) x where e = 'a@test.id'), 1);
reset role;

\o
\set QUIET off
select count(*) as "pemeriksaan lulus" from tests.results where ok;
