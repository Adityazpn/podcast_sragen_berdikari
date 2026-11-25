# Sukowati Berdikari (Podcast Studio) — Rencana Implementasi

A Professional Podcast Production Management Workspace. **Tanpa fitur AI dalam bentuk apa pun**: semua konten (riset, naskah, pertanyaan, rundown) ditulis manual oleh tim.

## 1. Audit awal

Pemilik memutuskan **mulai dari nol** di repo baru `podcast_sragen_berdikari`. Tidak ada kode, database, atau fitur lama yang perlu dipertahankan atau dimigrasikan.

Hosting: domain `podcast.peluangruang.id` ada di Hostinger paket **Premium** (hanya PHP, tanpa Node.js). Karena itu aplikasi di-deploy ke **Vercel**, lalu subdomain diarahkan ke Vercel lewat DNS di Hostinger. Database, login, dan file memakai **Supabase**.

## 2. Stack

| Lapisan | Pilihan |
| --- | --- |
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, komponen bergaya shadcn/ui (Radix UI) |
| Backend | Next.js Server Actions + Route Handlers |
| Database | Supabase PostgreSQL dengan Row Level Security |
| Auth | Supabase Auth (email + password) |
| Storage | Supabase Storage (bucket privat, akses via signed URL) |
| Editor (Phase 2) | Tiptap |
| Export (Phase 2) | PDF dan DOCX dibuat di server (pustaka `@react-pdf/renderer` dan `docx`), TXT polos |
| Deploy | Vercel + domain `podcast.peluangruang.id` |

## 3. Arsitektur data

- Setiap pengguna baru otomatis mendapat **profile** dan **workspace** pribadi dengan role **admin** (trigger `handle_new_user`).
- Semua tabel konten memiliki `workspace_id`, sehingga RLS cukup memeriksa keanggotaan workspace melalui fungsi `is_workspace_member()` / `is_workspace_admin()`.
- Role: **admin** mengelola anggota, workspace, dan boleh menghapus project. **Member** membaca dan menulis konten di workspace-nya.
- File disimpan di bucket privat dengan path `<workspace_id>/<file>`; policy storage memeriksa keanggotaan dari segmen pertama path. Avatar memakai `<user_id>/<file>`.

### Tabel (16)

`profiles`, `workspaces`, `workspace_members`, `podcast_projects`, `guests`, `episodes`, `scripts`, `script_sections`, `questions`, `follow_up_questions`, `research_sources`, `research_notes`, `rundown_segments`, `recording_notes`, `episode_assets`, `activity_logs`.

Semua tabel memiliki primary key UUID, foreign key, `created_at`, `updated_at` (diperbarui trigger), dan RLS aktif. Skema lengkap ada di `supabase/migrations/0001_init.sql`. Migrasi ini hanya **membuat** objek baru.

Skema dan kebijakan RLS sudah diuji di PostgreSQL 16 lokal: pengguna lain tidak bisa melihat, menyisipkan, mengubah, atau menghapus data workspace orang lain; member tidak bisa menghapus project atau menaikkan role-nya sendiri; hapus project ikut menghapus episode (cascade).

## 4. Fase pengembangan

### Phase 1 — Foundation ✅ (dikerjakan di commit ini)
- Auth: login, register, forgot/reset password, logout, **Ingat saya** (sesi berakhir saat browser ditutup bila tidak dicentang), middleware yang melindungi semua halaman dashboard.
- User Profile (nama, jabatan, foto) dan Account Settings (ganti password dengan verifikasi password lama), pengaturan workspace (admin).
- Skema database lengkap 16 tabel + RLS + Storage.
- Dashboard: total project, episode, narasumber, draft script, ready to record, upcoming recording, recent projects, recent activity, quick actions.
- Podcast Projects: create, edit, delete (konfirmasi, admin saja), duplicate, open, cari, cover.
- Episode Management: create, edit, duplicate, arsip/pulihkan, hapus, ubah status (7 status), nomor episode otomatis, tautan publikasi.
- Guest Database: add, edit, delete, search, filter (profesi, perusahaan), sort, detail, previous episodes, guest history, foto.
- Loading, error, dan empty state di semua halaman; toast notifikasi.

### Phase 2 — Core Podcast Workspace
- Research Notes (11 kategori, upload PDF/dokumen, link website/YouTube/artikel, terhubung ke guest dan episode).
- Script Studio dengan Tiptap: 6 PART, blok dialog HOST / GUEST / HOST NOTE / TRANSITION dengan warna berbeda, template, auto save (debounce) + manual save, word count, estimasi durasi baca (kata ÷ 130 kata/menit), duplicate script.
- Question Builder (12 kategori, follow-up, prioritas, status asked/not asked, drag-and-drop dengan `@dnd-kit`).
- Conversation Flow (editor per bagian + urutan drag-and-drop).
- Episode Rundown (segmen, durasi, catatan, total durasi = penjumlahan biasa).
- Episode Archive (search, sort, filter, grid/list).
- Export System: Full Script PDF/DOCX, Questions PDF/DOCX, Guest Profile PDF, Research Notes PDF, Rundown PDF, TXT.

### Phase 3 — Production Features
- Teleprompter (fullscreen, ukuran font, lebar teks, kecepatan scroll, auto/manual scroll, pause/resume, sorot bagian aktif, fokus dialog host, navigasi cepat).
- Recording Notes (live notes, momen penting, timestamp, checklist, catatan pasca-rekaman).
- Team Management (undang anggota via email, role admin/member, akses per project, aktivitas tim). Tabel `project_members` akan ditambahkan untuk akses per project.
- Version History script (tabel `script_versions`).
- Activity Logs lengkap.

### Phase 4 — Quality Assurance
Pengujian auth, permission database (skrip uji RLS), save/load, export, responsif, error handling, dan keamanan.

## 5. Keamanan
- Password hanya dikelola Supabase Auth (bcrypt); aplikasi tidak pernah menyimpan password.
- Semua input divalidasi dengan Zod di server; upload gambar dibatasi tipe (JPG/PNG/WEBP) dan ukuran (5 MB).
- Sesi divalidasi ke Supabase (`getUser()`) di middleware dan setiap server action.
- Pesan galat login dan lupa password tidak membocorkan email mana yang terdaftar.
- Redirect setelah login hanya ke path internal (mencegah open redirect).
- Bucket storage privat; gambar ditampilkan lewat signed URL berumur 1 jam.
