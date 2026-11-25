"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { RESEARCH_CATEGORIES, SOURCE_TYPES, STORAGE_BUCKETS } from "@/lib/constants";
import { getStudioContext } from "@/lib/session";
import type { ActionState } from "@/lib/types";
import { formToObject, optionalUrl } from "@/lib/validation";

const cats = RESEARCH_CATEGORIES.map((c) => c.value) as [string, ...string[]];
const srcTypes = SOURCE_TYPES.map((c) => c.value) as [string, ...string[]];
const optUuid = z
  .string()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || z.string().uuid().safeParse(v).success, "Tidak valid");

const links = z
  .object({ guest_id: optUuid, episode_id: optUuid })
  .refine((v) => v.guest_id || v.episode_id, { message: "Hubungkan ke narasumber atau episode", path: ["guest_id"] });

/** Pastikan guest/episode milik workspace aktif. */
async function checkLinks(ctx: Awaited<ReturnType<typeof getStudioContext>>, guestId: string | null, episodeId: string | null) {
  if (guestId) {
    const { data } = await ctx.supabase.from("guests").select("id").eq("id", guestId).eq("workspace_id", ctx.workspace.id).maybeSingle();
    if (!data) return false;
  }
  if (episodeId) {
    const { data } = await ctx.supabase.from("episodes").select("id").eq("id", episodeId).eq("workspace_id", ctx.workspace.id).maybeSingle();
    if (!data) return false;
  }
  return true;
}

const noteSchema = z
  .object({
    category: z.enum(cats, { message: "Pilih kategori" }),
    title: z.string().trim().min(2, "Judul minimal 2 karakter").max(200),
    content: z.string().max(50000, "Catatan terlalu panjang"),
  })
  .and(links);

export async function saveNote(noteId: string | null, _: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = noteSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const ctx = await getStudioContext();
  if (!(await checkLinks(ctx, parsed.data.guest_id, parsed.data.episode_id))) return { error: "Narasumber/episode tidak ditemukan." };

  if (noteId) {
    const { error } = await ctx.supabase.from("research_notes").update(parsed.data).eq("id", noteId);
    if (error) return { error: "Gagal menyimpan catatan." };
    await logActivity(ctx, "updated", "research", noteId, parsed.data.title);
  } else {
    const { data, error } = await ctx.supabase
      .from("research_notes")
      .insert({ ...parsed.data, workspace_id: ctx.workspace.id, created_by: ctx.userId })
      .select("id")
      .single();
    if (error || !data) return { error: "Gagal menambah catatan." };
    await logActivity(ctx, "created", "research", data.id, parsed.data.title);
  }
  revalidatePath("/research");
  return { ok: true };
}

export async function deleteNote(id: string): Promise<ActionState> {
  const ctx = await getStudioContext();
  const { data } = await ctx.supabase.from("research_notes").select("title").eq("id", id).maybeSingle();
  const { error, count } = await ctx.supabase.from("research_notes").delete({ count: "exact" }).eq("id", id);
  if (error || !count) return { error: "Gagal menghapus catatan." };
  await logActivity(ctx, "deleted", "research", id, data?.title ?? "catatan");
  revalidatePath("/research");
  return { ok: true };
}

const sourceSchema = z
  .object({
    type: z.enum(srcTypes, { message: "Pilih jenis sumber" }),
    title: z.string().trim().min(2, "Judul minimal 2 karakter").max(200),
    url: optionalUrl,
    file_path: z
      .string()
      .optional()
      .transform((v) => (v ? v : null)),
    notes: z
      .string()
      .max(5000)
      .optional()
      .transform((v) => (v?.trim() ? v.trim() : null)),
  })
  .and(links)
  .refine((v) => v.url || v.file_path, { message: "Isi URL atau unggah file", path: ["url"] });

/**
 * Menyimpan sumber riset. File sudah diunggah langsung dari browser ke Supabase Storage
 * (agar tidak terkena batas ukuran request), di sini hanya path-nya yang dicatat.
 */
export async function saveSource(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = sourceSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const ctx = await getStudioContext();
  const d = parsed.data;
  if (d.file_path && !d.file_path.startsWith(`${ctx.workspace.id}/`)) return { error: "Lokasi file tidak valid." };
  if (!(await checkLinks(ctx, d.guest_id, d.episode_id))) return { error: "Narasumber/episode tidak ditemukan." };

  const { data, error } = await ctx.supabase
    .from("research_sources")
    .insert({ ...d, workspace_id: ctx.workspace.id, created_by: ctx.userId })
    .select("id")
    .single();
  if (error || !data) {
    if (d.file_path) await ctx.supabase.storage.from(STORAGE_BUCKETS.research).remove([d.file_path]);
    return { error: "Gagal menyimpan sumber." };
  }
  await logActivity(ctx, "created", "research", data.id, d.title);
  revalidatePath("/research");
  return { ok: true };
}

export async function deleteSource(id: string): Promise<ActionState> {
  const ctx = await getStudioContext();
  const { data } = await ctx.supabase.from("research_sources").select("title, file_path").eq("id", id).maybeSingle();
  if (!data) return { error: "Sumber tidak ditemukan." };
  const { error } = await ctx.supabase.from("research_sources").delete().eq("id", id);
  if (error) return { error: "Gagal menghapus sumber." };
  if (data.file_path) await ctx.supabase.storage.from(STORAGE_BUCKETS.research).remove([data.file_path]);
  await logActivity(ctx, "deleted", "research", id, data.title);
  revalidatePath("/research");
  return { ok: true };
}
