#!/usr/bin/env bash
# Uji RLS di Postgres lokal (bukan Supabase). Contoh:
#   PGHOST=/tmp/pg PGPORT=5433 PGUSER=postgres scripts/test-rls.sh
# Membutuhkan role anon, authenticated, service_role (dibuat otomatis bila belum ada).
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${RLS_TEST_DB:-podcast_rls_test}"
psql -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
psql -q -d "$DB" -v ON_ERROR_STOP=1 <<'SQL'
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
SQL
psql -q -d "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/00_stub_supabase.sql
for f in supabase/migrations/*.sql; do
  echo "migrasi: $f"
  PGOPTIONS="-c client_min_messages=warning" psql -q -d "$DB" -v ON_ERROR_STOP=1 -f "$f"
done
# Supabase memberi hak tabel ke role ini secara default; RLS yang membatasi baris.
psql -q -d "$DB" -v ON_ERROR_STOP=1 -c "grant all on all tables in schema public to authenticated, service_role;"
psql -d "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
psql -q -d postgres -c "drop database $DB"
