"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { DEFAULT_RUNDOWN } from "@/lib/constants";
import { getStudioContext } from "@/lib/session";
import type { ActionState } from "@/lib/types";

const uuid = z.string().uuid();

export async function addSegments(episodeId: string, useTemplate: boolean): Promise<ActionState> {
  if (!uuid.safeParse(episodeId).success) return { error: "Episode tidak valid." };
  const ctx = await getStudioContext();
  const { data: ep } = await ctx.supabase.from("episodes").select("workspace_id, title").eq("id", episodeId).maybeSingle();
  if (!ep) return { error: "Episode tidak ditemukan." };
  const { data: last } = await ctx.supabase
    .from("rundown_segments")
    .select("position")
    .eq("episode_id", episodeId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const start = (last?.position ?? -1) + 1;
  const rows = (useTemplate ? DEFAULT_RUNDOWN : [{ title: "Segmen baru", duration_minutes: 5 }]).map((s, i) => ({
    ...s,
    workspace_id: ep.workspace_id,
    episode_id: episodeId,
    position: start + i,
  }));
  const { error } = await ctx.supabase.from("rundown_segments").insert(rows);
  if (error) return { error: `Gagal menambah segmen: ${error.message}` };
  if (useTemplate) await logActivity(ctx, "created", "rundown", episodeId, ep.title);
  revalidatePath(`/rundown/${episodeId}`);
  return { ok: true };
}

const patchSchema = z.object({
  title: z.string().trim().min(1, "Nama segmen wajib diisi").max(200).optional(),
  duration_minutes: z.number().min(0, "Durasi tidak boleh negatif").max(1440, "Durasi terlalu besar").optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export async function updateSegment(
  id: string,
  patch: { title?: string; duration_minutes?: number; notes?: string | null },
): Promise<ActionState> {
  const parsed = patchSchema.safeParse(patch);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  if (!uuid.safeParse(id).success) return { error: "Data tidak valid." };
  const data = { ...parsed.data };
  if (data.duration_minutes !== undefined) data.duration_minutes = Math.round(data.duration_minutes * 100) / 100;
  const ctx = await getStudioContext();
  const { error } = await ctx.supabase.from("rundown_segments").update(data).eq("id", id);
  if (error) return { error: "Gagal menyimpan segmen." };
  return { ok: true };
}

export async function deleteSegment(id: string): Promise<ActionState> {
  const ctx = await getStudioContext();
  const { data } = await ctx.supabase.from("rundown_segments").select("episode_id").eq("id", id).maybeSingle();
  const { error } = await ctx.supabase.from("rundown_segments").delete().eq("id", id);
  if (error) return { error: "Gagal menghapus segmen." };
  if (data) revalidatePath(`/rundown/${data.episode_id}`);
  return { ok: true };
}

export async function reorderSegments(episodeId: string, ids: string[]): Promise<ActionState> {
  if (!uuid.safeParse(episodeId).success || !ids.every((i) => uuid.safeParse(i).success)) return { error: "Data tidak valid." };
  const ctx = await getStudioContext();
  const res = await Promise.all(ids.map((id, i) => ctx.supabase.from("rundown_segments").update({ position: i }).eq("id", id).eq("episode_id", episodeId)));
  if (res.some((r) => r.error)) return { error: "Gagal menyimpan urutan." };
  revalidatePath(`/rundown/${episodeId}`);
  return { ok: true };
}
