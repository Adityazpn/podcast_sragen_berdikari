-- =====================================================================
-- Login dengan username.
-- Hanya MENAMBAH kolom/fungsi; tidak menghapus data.
-- =====================================================================

alter table public.profiles add column if not exists username text;

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[A-Za-z0-9_.]{3,30}$');

-- Unik tanpa membedakan huruf besar/kecil ("Admin" = "admin").
create unique index if not exists profiles_username_lower_key on public.profiles (lower(username));

-- Pendaftaran: simpan username dari metadata (bila ada).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ws_id uuid;
  display_name text := coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1));
  uname text := nullif(trim(new.raw_user_meta_data->>'username'), '');
begin
  insert into public.profiles (id, full_name, email, username) values (new.id, display_name, new.email, uname);
  insert into public.workspaces (name, owner_id) values (display_name || '''s Studio', new.id) returning id into ws_id;
  insert into public.workspace_members (workspace_id, user_id, role) values (ws_id, new.id, 'admin');
  return new;
end $$;

-- Cek ketersediaan username (dipakai form register). Hanya mengembalikan true/false.
create or replace function public.username_available(p_username text)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(trim(p_username)));
$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- Ambil email dari username untuk proses login.
-- HANYA bisa dipanggil service_role (server), agar email pengguna tidak bocor ke publik.
create or replace function public.email_for_username(p_username text)
returns text language sql stable security definer set search_path = public as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.username) = lower(trim(p_username))
  limit 1;
$$;
revoke all on function public.email_for_username(text) from public;
revoke all on function public.email_for_username(text) from anon, authenticated;
grant execute on function public.email_for_username(text) to service_role;
