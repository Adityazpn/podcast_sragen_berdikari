"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { getStudioContext, requireAdmin, WORKSPACE_COOKIE } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState, Role } from "@/lib/types";
import { emailSchema, passwordSchema, usernameSchema } from "@/lib/validation";

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

const roleSchema = z.enum(["admin", "member"]);

async function adminOrError() {
  try {
    return { ctx: await requireAdmin() };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

async function addMembership(
  ctx: Awaited<ReturnType<typeof requireAdmin>>,
  userId: string,
  role: Role,
  label: string,
): Promise<ActionState> {
  const { error } = await ctx.supabase.from("workspace_members").insert({ workspace_id: ctx.workspace.id, user_id: userId, role });
  if (error) {
    if (error.code === "23505") return { error: `${label} sudah menjadi anggota workspace ini.` };
    return { error: `Gagal menambahkan anggota: ${error.message}` };
  }
  await logActivity(ctx, "created", "member", userId, label);
  revalidatePath("/team");
  return { ok: true, message: `${label} ditambahkan ke workspace.` };
}

/** Tambahkan akun yang sudah ada (email/username), atau kirim undangan email bila belum terdaftar. */
export async function inviteMember(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z
    .object({ identifier: z.string().trim().min(3, "Isi email atau username").max(254), role: roleSchema })
    .safeParse({ identifier: formData.get("identifier"), role: formData.get("role") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const a = await adminOrError();
  if (!a.ctx) return { error: a.error };
  const admin = createAdminClient();
  if (!admin) return { error: "SUPABASE_SERVICE_ROLE_KEY belum diatur di server, undangan tidak bisa diproses." };

  const { identifier, role } = parsed.data;
  const isEmail = identifier.includes("@");
  if (isEmail && !emailSchema.safeParse(identifier).success) return { fieldErrors: { identifier: ["Format email tidak valid"] } };

  const pattern = identifier.replace(/[\\%_]/g, "\\$&");
  const { data: existing, error: lookupError } = await admin
    .from("profiles")
    .select("id, full_name, username")
    .ilike(isEmail ? "email" : "username", pattern)
    .limit(1);
  if (lookupError) return { error: `Gagal mencari akun: ${lookupError.message}` };

  const found = existing?.[0];
  if (found) return addMembership(a.ctx, found.id, role, found.full_name || found.username || identifier);
  if (!isEmail) return { fieldErrors: { identifier: ["Username tidak ditemukan. Gunakan email untuk mengundang orang baru."] } };

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(identifier, {
    redirectTo: `${await siteUrl()}/auth/callback?next=/auth/reset-password`,
  });
  if (inviteError || !invited.user) return { error: `Gagal mengirim undangan: ${inviteError?.message ?? "tidak diketahui"}` };
  const res = await addMembership(a.ctx, invited.user.id, role, identifier);
  return res?.ok ? { ok: true, message: `Undangan dikirim ke ${identifier}. Mereka akan diminta membuat password.` } : res;
}

const createSchema = z.object({
  full_name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: roleSchema,
});

/** Buat akun baru langsung dengan password sementara (tanpa perlu email undangan). */
export async function createMemberAccount(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const a = await adminOrError();
  if (!a.ctx) return { error: a.error };
  const admin = createAdminClient();
  if (!admin) return { error: "SUPABASE_SERVICE_ROLE_KEY belum diatur di server." };

  const d = parsed.data;
  const { data: available } = await admin.rpc("username_available", { p_username: d.username });
  if (available === false) return { fieldErrors: { username: ["Username sudah dipakai"] } };

  const { data, error } = await admin.auth.admin.createUser({
    email: d.email,
    password: d.password,
    email_confirm: true,
    user_metadata: { full_name: d.full_name, username: d.username },
  });
  if (error || !data.user) {
    const msg = error?.message ?? "";
    if (/already|registered|exists/i.test(msg)) return { fieldErrors: { email: ["Email sudah terdaftar. Gunakan Undang anggota."] } };
    return { error: `Gagal membuat akun: ${msg}` };
  }
  return addMembership(a.ctx, data.user.id, d.role, d.full_name);
}

export async function changeMemberRole(memberId: string, role: Role): Promise<ActionState> {
  if (!roleSchema.safeParse(role).success) return { error: "Role tidak valid." };
  const a = await adminOrError();
  if (!a.ctx) return { error: a.error };
  const ctx = a.ctx;
  const { data: m } = await ctx.supabase
    .from("workspace_members")
    .select("user_id, profile:profiles(full_name)")
    .eq("id", memberId)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  if (!m) return { error: "Anggota tidak ditemukan." };
  if (m.user_id === ctx.userId) return { error: "Anda tidak dapat mengubah role Anda sendiri." };
  if (m.user_id === ctx.workspace.owner_id) return { error: "Role pemilik workspace tidak dapat diubah." };
  const { error } = await ctx.supabase.from("workspace_members").update({ role }).eq("id", memberId);
  if (error) return { error: `Gagal mengubah role: ${error.message}` };
  const name = (m.profile as unknown as { full_name: string } | null)?.full_name ?? "anggota";
  await logActivity(ctx, "updated", "member", m.user_id, `${name} → ${role}`);
  revalidatePath("/team");
  return { ok: true };
}

export async function removeMember(memberId: string): Promise<ActionState> {
  const a = await adminOrError();
  if (!a.ctx) return { error: a.error };
  const ctx = a.ctx;
  const { data: m } = await ctx.supabase
    .from("workspace_members")
    .select("user_id, profile:profiles(full_name)")
    .eq("id", memberId)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  if (!m) return { error: "Anggota tidak ditemukan." };
  if (m.user_id === ctx.userId) return { error: "Anda tidak dapat mengeluarkan diri sendiri." };
  if (m.user_id === ctx.workspace.owner_id) return { error: "Pemilik workspace tidak dapat dikeluarkan." };
  const { error } = await ctx.supabase.from("workspace_members").delete().eq("id", memberId);
  if (error) return { error: `Gagal mengeluarkan anggota: ${error.message}` };
  await logActivity(ctx, "deleted", "member", m.user_id, (m.profile as unknown as { full_name: string } | null)?.full_name ?? "anggota");
  revalidatePath("/team");
  return { ok: true };
}

export async function setProjectRestricted(projectId: string, restricted: boolean): Promise<ActionState> {
  const a = await adminOrError();
  if (!a.ctx) return { error: a.error };
  const { data, error } = await a.ctx.supabase
    .from("podcast_projects")
    .update({ restricted })
    .eq("id", projectId)
    .eq("workspace_id", a.ctx.workspace.id)
    .select("name")
    .maybeSingle();
  if (error) return { error: `Gagal mengubah akses: ${error.message}` };
  if (!data) return { error: "Project tidak ditemukan." };
  await logActivity(a.ctx, "updated", "project", projectId, `${data.name} (akses ${restricted ? "terbatas" : "semua anggota"})`);
  revalidatePath("/team");
  revalidatePath("/projects");
  return { ok: true };
}

export async function setProjectAccess(projectId: string, userId: string, granted: boolean): Promise<ActionState> {
  const a = await adminOrError();
  if (!a.ctx) return { error: a.error };
  const ctx = a.ctx;
  const { error } = granted
    ? await ctx.supabase.from("project_members").insert({ workspace_id: ctx.workspace.id, project_id: projectId, user_id: userId })
    : await ctx.supabase.from("project_members").delete().eq("project_id", projectId).eq("user_id", userId);
  if (error && error.code !== "23505") return { error: `Gagal mengubah akses: ${error.message}` };
  revalidatePath("/team");
  return { ok: true };
}

/** Pindah workspace aktif (hanya ke workspace tempat pengguna menjadi anggota). */
export async function switchWorkspace(workspaceId: string): Promise<ActionState> {
  const ctx = await getStudioContext();
  if (!ctx.workspaces.some((w) => w.workspace.id === workspaceId)) return { error: "Workspace tidak ditemukan." };
  (await cookies()).set(WORKSPACE_COOKIE, workspaceId, { path: "/", sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
  return { ok: true };
}
