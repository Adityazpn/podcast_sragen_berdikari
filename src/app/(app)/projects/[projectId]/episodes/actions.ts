"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { EPISODE_STATUSES } from "@/lib/constants";
import { getStudioContext } from "@/lib/session";
import type { ActionState, EpisodeStatus } from "@/lib/types";
import { formToObject, optionalInt, optionalText, optionalUrl } from "@/lib/validation";

const statusValues = EPISODE_STATUSES.map((s) => s.value) as [EpisodeStatus, ...EpisodeStatus[]];

const episodeSchema = z.object({
  title: z.string().trim().min(2, "Judul minimal 2 karakter").max(200),
  episode_number: optionalInt(0, 100000),
  main_topic: optionalText(200),
  description: optionalText(3000),
  guest_id: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || z.string().uuid().safeParse(v).success, "Narasumber tidak valid"),
  host: optionalText(120),
  recording_date: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : null))
    .refine((v) => v === null || !Number.isNaN(v.getTime()), "Tanggal tidak valid")
    .transform((v) => (v ? v.toISOString() : null)),
  recording_location: optionalText(200),
  duration_minutes: optionalInt(1, 1440),
  target_audience: optionalText(300),
  objective: optionalText(2000),
  status: z.enum(statusValues, { message: "Status tidak valid" }),
  publication_link: optionalUrl,
});

function paths(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
}

export async function saveEpisode(
  projectId: string,
  episodeId: string | null,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = formToObject(formData);
  // datetime-local dikirim tanpa zona waktu; browser mengirim offset pengguna di field terpisah.
  if (raw.recording_date && raw.tz_offset) {
    const offset = Number(raw.tz_offset);
    if (Number.isFinite(offset)) {
      const d = new Date(`${raw.recording_date}:00Z`);
      if (!Number.isNaN(d.getTime())) raw.recording_date = new Date(d.getTime() + offset * 60000).toISOString();
    }
  }
  const parsed = episodeSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const ctx = await getStudioContext();
  const { data: project } = await ctx.supabase.from("podcast_projects").select("id").eq("id", projectId).maybeSingle();
  if (!project) return { error: "Project tidak ditemukan." };

  let id = episodeId;
  if (episodeId) {
    const { error } = await ctx.supabase.from("episodes").update(parsed.data).eq("id", episodeId).eq("project_id", projectId);
    if (error) return { error: `Gagal menyimpan: ${error.message}` };
    await logActivity(ctx, "updated", "episode", episodeId, parsed.data.title);
  } else {
    const { data, error } = await ctx.supabase
      .from("episodes")
      .insert({ ...parsed.data, project_id: projectId, workspace_id: ctx.workspace.id, created_by: ctx.userId })
      .select("id")
      .single();
    if (error || !data) return { error: `Gagal membuat episode: ${error?.message}` };
    id = data.id;
    await logActivity(ctx, "created", "episode", id, parsed.data.title);
  }
  paths(projectId);
  redirect(`/projects/${projectId}/episodes/${id}?saved=1`);
}

export async function updateEpisodeStatus(episodeId: string, status: EpisodeStatus): Promise<ActionState> {
  if (!statusValues.includes(status)) return { error: "Status tidak valid." };
  const ctx = await getStudioContext();
  const { data, error } = await ctx.supabase
    .from("episodes")
    .update({ status })
    .eq("id", episodeId)
    .select("project_id, title")
    .single();
  if (error || !data) return { error: "Gagal mengubah status." };
  await logActivity(ctx, "updated", "episode", episodeId, data.title);
  paths(data.project_id);
  return { ok: true };
}

export async function setEpisodeArchived(episodeId: string, archived: boolean): Promise<ActionState> {
  const ctx = await getStudioContext();
  const { data, error } = await ctx.supabase
    .from("episodes")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", episodeId)
    .select("project_id, title")
    .single();
  if (error || !data) return { error: "Gagal memperbarui arsip." };
  await logActivity(ctx, archived ? "archived" : "restored", "episode", episodeId, data.title);
  paths(data.project_id);
  return { ok: true };
}

export async function duplicateEpisode(episodeId: string): Promise<ActionState & { id?: string; projectId?: string }> {
  const ctx = await getStudioContext();
  const { data: src } = await ctx.supabase.from("episodes").select("*").eq("id", episodeId).single();
  if (!src) return { error: "Episode tidak ditemukan." };
  const { id: _i, created_at: _c, updated_at: _u, ...rest } = src;
  void _i; void _c; void _u;
  const title = `${src.title} (Salinan)`.slice(0, 200);
  const { data, error } = await ctx.supabase
    .from("episodes")
    .insert({ ...rest, title, status: "idea", archived_at: null, publication_link: null, created_by: ctx.userId })
    .select("id")
    .single();
  if (error || !data) return { error: `Gagal menduplikasi: ${error?.message}` };
  await logActivity(ctx, "duplicated", "episode", data.id, title);
  paths(src.project_id);
  return { ok: true, id: data.id, projectId: src.project_id };
}

export async function deleteEpisode(episodeId: string): Promise<ActionState> {
  const ctx = await getStudioContext();
  const { data: ep } = await ctx.supabase.from("episodes").select("project_id, title").eq("id", episodeId).single();
  if (!ep) return { error: "Episode tidak ditemukan." };
  const { error, count } = await ctx.supabase.from("episodes").delete({ count: "exact" }).eq("id", episodeId);
  if (error || !count) return { error: "Gagal menghapus episode." };
  await logActivity(ctx, "deleted", "episode", episodeId, ep.title);
  paths(ep.project_id);
  return { ok: true };
}
