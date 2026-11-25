import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { REMEMBER_COOKIE, SUPABASE_ANON_KEY, SUPABASE_URL, applyRememberPreference } from "./config";

export async function createClient() {
  const cookieStore = await cookies();
  const remember = cookieStore.get(REMEMBER_COOKIE)?.value !== "0";

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, applyRememberPreference(options, remember)),
          );
        } catch {
          // Dipanggil dari Server Component: middleware yang akan memperbarui sesi.
        }
      },
    },
  });
}
