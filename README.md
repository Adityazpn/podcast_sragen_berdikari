# Podcast Studio

A Professional Podcast Production Management Workspace. Seluruh pekerjaan dilakukan manual oleh tim, **tanpa fitur AI**.

Stack: Next.js 15, React 19, TypeScript, Tailwind CSS 4, Supabase (Auth, Postgres + RLS, Storage). Rencana lengkap ada di [`docs/PLAN.md`](docs/PLAN.md).

## 1. Siapkan Supabase

1. Buat project di https://supabase.com (paket gratis cukup). Pilih region **Southeast Asia (Singapore)**.
2. Buka **SQL Editor → New query**, salin seluruh isi `supabase/migrations/0001_init.sql`, lalu **Run**.
3. Buka **Authentication → URL Configuration**:
   - **Site URL**: `https://podcast.peluangruang.id` (atau `http://localhost:3000` saat lokal)
   - **Redirect URLs**: tambahkan `https://podcast.peluangruang.id/auth/callback` dan `http://localhost:3000/auth/callback`
4. Buka **Project Settings → API**, catat **Project URL** dan **anon public key**.

## 2. Jalankan di komputer

Prasyarat: Node.js 20 atau lebih baru.

```bash
npm install
cp .env.example .env.local   # isi dengan nilai dari langkah 1.4
npm run dev
```

Buka http://localhost:3000, lalu daftar akun. Akun pertama otomatis menjadi Admin di workspace-nya.

Perintah lain: `npm run typecheck`, `npm run lint`, `npm run build`.

## 3. Deploy ke Vercel + domain Hostinger

1. Di https://vercel.com: **Add New → Project → Import** repo `podcast_sragen_berdikari`.
2. Di **Environment Variables** isi `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, dan `NEXT_PUBLIC_SITE_URL=https://podcast.peluangruang.id`, lalu **Deploy**.
3. Di project Vercel: **Settings → Domains → Add** `podcast.peluangruang.id`. Vercel akan menampilkan record DNS yang dibutuhkan (biasanya **CNAME** `podcast` → `cname.vercel-dns.com`).
4. Di Hostinger hPanel: **Domains → peluangruang.id → DNS / Nameservers**. Hapus record lama untuk `podcast` (A/CNAME), lalu tambahkan CNAME dari langkah 3.
5. Tunggu propagasi DNS (biasanya beberapa menit, maksimal 24 jam). Vercel memasang SSL otomatis.

Setelah itu setiap push ke branch `main` otomatis ter-deploy.

## Struktur folder

```
src/
  app/(auth)/        login, register, lupa password + server actions auth
  app/auth/          callback email & reset password
  app/(app)/         halaman terproteksi: dashboard, projects, episodes, guests, settings
  components/ui/     komponen dasar (button, input, card, dialog, dropdown, badge, ...)
  components/...     komponen per fitur
  lib/               supabase client, sesi & role, validasi, storage, activity log
  middleware.ts      proteksi rute & refresh sesi
supabase/migrations/ skema database + RLS + storage
docs/PLAN.md         rencana implementasi per fase
```
