export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Cookie penanda pilihan "Ingat saya". Nilai "0" = sesi berakhir saat browser ditutup. */
export const REMEMBER_COOKIE = "ps-remember";

type CookieOptions = Record<string, unknown> & { maxAge?: number; expires?: Date };

/** Bila pengguna tidak memilih "Ingat saya", ubah cookie auth menjadi session cookie. */
export function applyRememberPreference<T extends CookieOptions>(options: T, remember: boolean): T {
  if (remember) return options;
  // Cookie penghapusan (maxAge 0) tetap dipertahankan agar logout bekerja.
  if (options.maxAge === 0) return options;
  const rest = { ...options };
  delete rest.maxAge;
  delete rest.expires;
  return rest;
}
