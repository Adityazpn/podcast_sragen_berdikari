"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { getStudioContext } from "@/lib/session";
import { removeFile, uploadImage } from "@/lib/storage";
import type { ActionState } from "@/lib/types";
import { formToObject, optionalInt, optionalText } from "@/lib/validation";

const projectSchema = z.object({
  name: z.string().trim().min(2, "Nama podcast minimal 2 karakter").max(120),
  description: optionalText(2000),
  category: optionalText(60),
  main_topic: optionalText(200),
  target_audience: optionalText(300),
  language: optionalText(60),
  communication_style: optionalText(60),
  default_episode_duration: optionalInt(1, 1440),
  host_name: optionalText(120),
});

export async function saveProject(projectId: string | null, _: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = projectSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const ctx = await getStudioContext();
  const cover = formData.get("cover");
  const upload = await uploadImage(ctx, STORAGE_BUCKETS.covers, cover instanceof File ? cover : null);
  if (upload.error) return { fieldErrors: { cover: [upload.error] } };

  const removeCover = formData.get("remove_cover") === "1";
  let id = projectId;

  if (projectId) {
    const { data: existing } = await ctx.supabase.from("podcast_projects").select("cover_path").eq("id", projectId).single();
    if (!existing) return { error: "Project tidak ditemukan." };
    const patch: Record<string, unknown> = { ...parsed.data };
    if (upload.path) patch.cover_path = upload.path;
    else if (removeCover) patch.cover_path = null;

    const { error } = await ctx.supabase.from("podcast_projects").update(patch).eq("id", projectId);
    if (error) return { error: `Gagal menyimpan: ${error.message}` };
    if (upload.path || removeCover) await removeFile(ctx, STORAGE_BUCKETS.covers, existing.cover_path);
    await logActivity(ctx, "updated", "project", projectId, parsed.data.name);
  } else {
    const { data, error } = await ctx.supabase
      .from("podcast_projects")
      .insert({ ...parsed.data, cover_path: upload.path ?? null, workspace_id: ctx.workspace.id, created_by: ctx.userId })
      .select("id")
      .single();
    if (error || !data) return { error: `Gagal membuat project: ${error?.message}` };
    id = data.id;
    await logActivity(ctx, "created", "project", id, parsed.data.name);
  }

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect(`/projects/${id}?saved=1`);
}

export async function deleteProject(projectId: string): Promise<ActionState> {
  const ctx = await getStudioContext();
  if (ctx.role !== "admin") return { error: "Hanya admin yang dapat menghapus project." };

  const { data: project } = await ctx.supabase.from("podcast_projects").select("name, cover_path").eq("id", projectId).single();
  if (!project) return { error: "Project tidak ditemukan." };

  const { error, count } = await ctx.supabase.from("podcast_projects").delete({ count: "exact" }).eq("id", projectId);
  if (error) return { error: `Gagal menghapus: ${error.message}` };
  if (!count) return { error: "Project tidak terhapus. Periksa hak akses Anda." };
  await removeFile(ctx, STORAGE_BUCKETS.covers, project.cover_path);
  await logActivity(ctx, "deleted", "project", projectId, project.name);

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Menduplikasi data project (tanpa episode). Cover disalin sebagai file baru. */
export async function duplicateProject(projectId: string): Promise<ActionState & { id?: string }> {
  const ctx = await getStudioContext();
  const { data: src } = await ctx.supabase.from("podcast_projects").select("*").eq("id", projectId).single();
  if (!src) return { error: "Project tidak ditemukan." };

  let coverPath: string | null = null;
  if (src.cover_path) {
    const ext = src.cover_path.split(".").pop();
    const target = `${ctx.workspace.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await ctx.supabase.storage.from(STORAGE_BUCKETS.covers).copy(src.cover_path, target);
    if (!error) coverPath = target;
  }

  const { id: _id, created_at: _c, updated_at: _u, ...rest } = src;
  void _id; void _c; void _u;
  const name = `${src.name} (Salinan)`.slice(0, 120);
  const { data, error } = await ctx.supabase
    .from("podcast_projects")
    .insert({ ...rest, name, cover_path: coverPath, created_by: ctx.userId })
    .select("id")
    .single();
  if (error || !data) return { error: `Gagal menduplikasi: ${error?.message}` };

  await logActivity(ctx, "duplicated", "project", data.id, name);
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return { ok: true, id: data.id };
}
