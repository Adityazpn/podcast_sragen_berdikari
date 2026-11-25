import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role, Workspace } from "@/lib/types";

export const WORKSPACE_COOKIE = "ps-workspace";

/** Pengguna yang sedang login (divalidasi ke Supabase). Redirect ke /login bila tidak ada. */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
});

export interface StudioContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  email: string;
  profile: Profile;
  workspace: Workspace;
  role: Role;
  workspaces: { workspace: Workspace; role: Role }[];
}

/** Konteks lengkap: profile, workspace aktif, dan role pengguna di workspace tersebut. */
export const getStudioContext = cache(async (): Promise<StudioContext> => {
  const { supabase, user } = await requireUser();

  const [{ data: profile }, { data: memberships, error }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("workspace_members")
      .select("role, workspace:workspaces(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  if (error) throw new Error(`Gagal memuat workspace: ${error.message}`);

  const workspaces = (memberships ?? [])
    .filter((m) => m.workspace)
    .map((m) => ({ workspace: m.workspace as unknown as Workspace, role: m.role as Role }));

  if (!profile || workspaces.length === 0) {
    // Seharusnya dibuat oleh trigger handle_new_user. Bila tidak ada, migrasi belum dijalankan.
    throw new Error("Profil atau workspace tidak ditemukan. Pastikan migrasi database sudah dijalankan.");
  }

  const preferred = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  const active = workspaces.find((w) => w.workspace.id === preferred) ?? workspaces[0]!;

  return {
    supabase,
    userId: user.id,
    email: user.email ?? "",
    profile: profile as Profile,
    workspace: active.workspace,
    role: active.role,
    workspaces,
  };
});

export async function requireAdmin() {
  const ctx = await getStudioContext();
  if (ctx.role !== "admin") throw new Error("Hanya admin yang dapat melakukan aksi ini.");
  return ctx;
}
