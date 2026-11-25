"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { DEFAULT_RECORDING_CHECKLIST, RECORDING_NOTE_TYPES } from "@/lib/constants";
import { getStudioContext } from "@/lib/session";
import type { ActionState } from "@/lib/types";

const uuid = z.string().uuid();
const types = RECORDING_NOTE_TYPES.map((t) => t.value) as [string, ...string[]];
const noteSchema = z.object({
  type: z.enum(types),
  content: z.string().trim().min(1, "Catatan tidak boleh kosong").max(10000),
  timestamp_label: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^\d{1,2}(:\d{2}){1,2}$/.test(v), "Format timestamp mm:ss atau h:mm:ss"),
});

async function episodeWs(ctx: Awaited<ReturnType<typeof getStudioContext>>, episodeId: string) {
  if (!uuid.safeParse(episodeId).success) return null;
  const { data } = await ctx.supabase.from("episodes").select("workspace_id").eq("id", episodeId).maybeSingle();
  return data?.workspace_id ?? null;
}

export async function addRecordingNote(
  episodeId: string,
  input: { type: string; content: string; timestamp_label?: string },
): Promise<ActionState> {
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const ctx = await getStudioContext();
  const ws = await episodeWs(ctx, episodeId);
  if (!ws) return { error: "Episode tidak ditemukan." };
  const { data: last } = await ctx.supabase
    .from("recording_notes")
    .select("position")
    .eq("episode_id", episodeId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await ctx.supabase.from("recording_notes").insert({
    ...parsed.data,
    workspace_id: ws,
    episode_id: episodeId,
    position: (last?.position ?? -1) + 1,
    created_by: ctx.userId,
  });
  if (error) return { error: "Gagal menyimpan catatan." };
  revalidatePath(`/recording/${episodeId}`);
  return { ok: true };
}

export async function addDefaultChecklist(episodeId: string): Promise<ActionState> {
  const ctx = await getStudioContext();
  const ws = await episodeWs(ctx, episodeId);
  if (!ws) return { error: "Episode tidak ditemukan." };
  const { data: last } = await ctx.supabase
    .from("recording_notes")
    .select("position")
    .eq("episode_id", episodeId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const start = (last?.position ?? -1) + 1;
  const { error } = await ctx.supabase.from("recording_notes").insert(
    DEFAULT_RECORDING_CHECKLIST.map((content, i) => ({
      workspace_id: ws,
      episode_id: episodeId,
      type: "checklist",
      content,
      position: start + i,
      created_by: ctx.userId,
    })),
  );
  if (error) return { error: "Gagal menambah checklist." };
  await logActivity(ctx, "created", "recording", episodeId, "Checklist rekaman standar");
  revalidatePath(`/recording/${episodeId}`);
  return { ok: true };
}

export async function updateRecordingNote(id: string, patch: { content?: string; is_done?: boolean }): Promise<ActionState> {
  if (!uuid.safeParse(id).success) return { error: "Data tidak valid." };
  const clean: Record<string, unknown> = {};
  if (typeof patch.is_done === "boolean") clean.is_done = patch.is_done;
  if (patch.content !== undefined) {
    const t = patch.content.trim();
    if (!t || t.length > 10000) return { error: "Catatan 1–10.000 karakter." };
    clean.content = t;
  }
  const ctx = await getStudioContext();
  const { data, error } = await ctx.supabase.from("recording_notes").update(clean).eq("id", id).select("episode_id").single();
  if (error || !data) return { error: "Gagal memperbarui catatan." };
  revalidatePath(`/recording/${data.episode_id}`);
  return { ok: true };
}

export async function deleteRecordingNote(id: string): Promise<ActionState> {
  const ctx = await getStudioContext();
  if (!uuid.safeParse(id).success) return { error: "Data tidak valid." };
  const { data } = await ctx.supabase.from("recording_notes").select("episode_id, content").eq("id", id).maybeSingle();
  const { error } = await ctx.supabase.from("recording_notes").delete().eq("id", id);
  if (error) return { error: "Gagal menghapus catatan." };
  if (data) await logActivity(ctx, "deleted", "recording", data.episode_id, data.content.slice(0, 80));
  if (data) revalidatePath(`/recording/${data.episode_id}`);
  return { ok: true };
}
