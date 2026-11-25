"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { SCRIPT_TEMPLATES, type ScriptTemplateKey } from "@/lib/script/template";
import { getStudioContext } from "@/lib/session";
import type { ActionState } from "@/lib/types";

const uuid = z.string().uuid();
const MAX_CONTENT_BYTES = 2_000_000;

export async function createScript(_: ActionState, formData: FormData): Promise<ActionState> {
  const episodeId = uuid.safeParse(formData.get("episode_id"));
  if (!episodeId.success) return { fieldErrors: { episode_id: ["Pilih episode"] } };
  const key = String(formData.get("template") ?? "full") as ScriptTemplateKey;
  const template = SCRIPT_TEMPLATES[key] ?? SCRIPT_TEMPLATES.full;
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);

  const ctx = await getStudioContext();
  const { data: ep } = await ctx.supabase.from("episodes").select("id, title, workspace_id").eq("id", episodeId.data).maybeSingle();
  if (!ep) return { error: "Episode tidak ditemukan." };

  const { data, error } = await ctx.supabase
    .from("scripts")
    .insert({
      workspace_id: ep.workspace_id,
      episode_id: ep.id,
      title: title || `Script — ${ep.title}`.slice(0, 200),
      content: template.build(),
      created_by: ctx.userId,
    })
    .select("id, title")
    .single();
  if (error || !data) return { error: `Gagal membuat script: ${error?.message}` };
  await logActivity(ctx, "created", "script", data.id, data.title);
  revalidatePath("/scripts");
  revalidatePath("/dashboard");
  redirect(`/scripts/${data.id}`);
}

/** Dipakai auto save dan tombol Simpan. Mengembalikan waktu simpan dari server. */
export async function saveScriptContent(
  scriptId: string,
  content: unknown,
  wordCount: number,
  mode: "auto" | "manual" = "auto",
): Promise<{ ok?: boolean; error?: string; savedAt?: string }> {
  if (!uuid.safeParse(scriptId).success) return { error: "Script tidak valid." };
  if (!content || typeof content !== "object" || (content as { type?: string }).type !== "doc") return { error: "Format naskah tidak valid." };
  if (JSON.stringify(content).length > MAX_CONTENT_BYTES) return { error: "Naskah terlalu besar (maks ±2 MB)." };
  const words = Number.isFinite(wordCount) ? Math.max(0, Math.min(1_000_000, Math.round(wordCount))) : 0;

  const ctx = await getStudioContext();
  const { data, error } = await ctx.supabase
    .from("scripts")
    .update({ content, word_count: words })
    .eq("id", scriptId)
    .select("updated_at, title, workspace_id")
    .single();
  if (error || !data) return { error: "Gagal menyimpan. Periksa koneksi Anda." };

  // Version history: setiap simpan manual, dan otomatis paling sering tiap 10 menit saat auto save.
  const { data: lastVersion } = await ctx.supabase
    .from("script_versions")
    .select("created_at")
    .eq("script_id", scriptId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const stale = !lastVersion || Date.now() - new Date(lastVersion.created_at).getTime() > VERSION_INTERVAL_MS;
  if (mode === "manual" || stale) {
    await snapshot(ctx, { id: scriptId, workspace_id: data.workspace_id, title: data.title, content, word_count: words }, mode === "manual" ? "Simpan manual" : "Auto save");
  }
  return { ok: true, savedAt: data.updated_at };
}

const VERSION_INTERVAL_MS = 10 * 60 * 1000;
const MAX_VERSIONS = 100;

async function snapshot(
  ctx: Awaited<ReturnType<typeof getStudioContext>>,
  s: { id: string; workspace_id: string; title: string; content: unknown; word_count: number },
  note: string,
) {
  const { error } = await ctx.supabase.from("script_versions").insert({
    workspace_id: s.workspace_id,
    script_id: s.id,
    title: s.title,
    content: s.content,
    word_count: s.word_count,
    note,
    created_by: ctx.userId,
  });
  if (error) {
    console.error("snapshot failed", error.message);
    return;
  }
  // Simpan maksimal 100 versi terakhir per script.
  const { data: old } = await ctx.supabase
    .from("script_versions")
    .select("id")
    .eq("script_id", s.id)
    .order("created_at", { ascending: false })
    .range(MAX_VERSIONS, MAX_VERSIONS + 50);
  if (old?.length) await ctx.supabase.from("script_versions").delete().in("id", old.map((o) => o.id));
}

export interface VersionItem {
  id: string;
  created_at: string;
  word_count: number;
  note: string | null;
  author: string | null;
}

export async function listScriptVersions(scriptId: string): Promise<{ versions?: VersionItem[]; error?: string }> {
  if (!uuid.safeParse(scriptId).success) return { error: "Script tidak valid." };
  const ctx = await getStudioContext();
  const { data, error } = await ctx.supabase
    .from("script_versions")
    .select("id, created_at, word_count, note, author:profiles(full_name)")
    .eq("script_id", scriptId)
    .order("created_at", { ascending: false })
    .limit(MAX_VERSIONS);
  if (error) return { error: "Gagal memuat riwayat versi." };
  return {
    versions: (data ?? []).map((v) => ({
      id: v.id,
      created_at: v.created_at,
      word_count: v.word_count,
      note: v.note,
      author: (v.author as unknown as { full_name: string } | null)?.full_name ?? null,
    })),
  };
}

export async function getScriptVersion(versionId: string): Promise<{ content?: unknown; error?: string }> {
  if (!uuid.safeParse(versionId).success) return { error: "Versi tidak valid." };
  const ctx = await getStudioContext();
  const { data } = await ctx.supabase.from("script_versions").select("content").eq("id", versionId).maybeSingle();
  if (!data) return { error: "Versi tidak ditemukan." };
  return { content: data.content };
}

/** Pulihkan versi lama. Isi saat ini disimpan dulu sebagai versi agar bisa dibatalkan. */
export async function restoreScriptVersion(versionId: string): Promise<{ content?: unknown; savedAt?: string; error?: string }> {
  if (!uuid.safeParse(versionId).success) return { error: "Versi tidak valid." };
  const ctx = await getStudioContext();
  const { data: v } = await ctx.supabase.from("script_versions").select("script_id, content, word_count, created_at").eq("id", versionId).maybeSingle();
  if (!v) return { error: "Versi tidak ditemukan." };
  const { data: cur } = await ctx.supabase.from("scripts").select("id, workspace_id, title, content, word_count").eq("id", v.script_id).single();
  if (!cur) return { error: "Script tidak ditemukan." };
  await snapshot(ctx, cur, "Sebelum pemulihan versi");
  const { data, error } = await ctx.supabase
    .from("scripts")
    .update({ content: v.content, word_count: v.word_count })
    .eq("id", v.script_id)
    .select("updated_at")
    .single();
  if (error || !data) return { error: "Gagal memulihkan versi." };
  await logActivity(ctx, "restored", "script", v.script_id, cur.title);
  revalidatePath(`/scripts/${v.script_id}`);
  return { content: v.content, savedAt: data.updated_at };
}

const metaSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi").max(200),
  status: z.enum(["draft", "final"]),
});

export async function updateScriptMeta(scriptId: string, title: string, status: "draft" | "final"): Promise<ActionState> {
  const parsed = metaSchema.safeParse({ title, status });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  const ctx = await getStudioContext();
  const { error } = await ctx.supabase.from("scripts").update(parsed.data).eq("id", scriptId);
  if (error) return { error: "Gagal menyimpan." };
  await logActivity(ctx, "updated", "script", scriptId, parsed.data.title);
  revalidatePath("/scripts");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function duplicateScript(scriptId: string): Promise<ActionState & { id?: string }> {
  const ctx = await getStudioContext();
  const { data: src } = await ctx.supabase.from("scripts").select("*").eq("id", scriptId).single();
  if (!src) return { error: "Script tidak ditemukan." };
  const title = `${src.title} (Salinan)`.slice(0, 200);
  const { data, error } = await ctx.supabase
    .from("scripts")
    .insert({
      workspace_id: src.workspace_id,
      episode_id: src.episode_id,
      title,
      content: src.content,
      word_count: src.word_count,
      status: "draft",
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Gagal menduplikasi script." };
  await logActivity(ctx, "duplicated", "script", data.id, title);
  revalidatePath("/scripts");
  return { ok: true, id: data.id };
}

export async function deleteScript(scriptId: string): Promise<ActionState> {
  const ctx = await getStudioContext();
  const { data: s } = await ctx.supabase.from("scripts").select("title").eq("id", scriptId).single();
  if (!s) return { error: "Script tidak ditemukan." };
  const { error, count } = await ctx.supabase.from("scripts").delete({ count: "exact" }).eq("id", scriptId);
  if (error || !count) return { error: "Gagal menghapus script." };
  await logActivity(ctx, "deleted", "script", scriptId, s.title);
  revalidatePath("/scripts");
  revalidatePath("/dashboard");
  return { ok: true };
}
