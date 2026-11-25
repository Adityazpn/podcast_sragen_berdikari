"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { QUESTION_CATEGORIES, QUESTION_PRIORITIES, QUESTION_STATUSES } from "@/lib/constants";
import { getStudioContext } from "@/lib/session";
import type { ActionState } from "@/lib/types";
import { formToObject, optionalText } from "@/lib/validation";

const uuid = z.string().uuid();
const cats = QUESTION_CATEGORIES.map((c) => c.value) as [string, ...string[]];
const prios = QUESTION_PRIORITIES.map((c) => c.value) as [string, ...string[]];
const stats = QUESTION_STATUSES.map((c) => c.value) as [string, ...string[]];

const questionSchema = z.object({
  question: z.string().trim().min(3, "Pertanyaan minimal 3 karakter").max(2000),
  category: z.enum(cats, { message: "Pilih kategori" }),
  purpose: optionalText(1000),
  host_notes: optionalText(2000),
  priority: z.enum(prios),
  status: z.enum(stats),
});

const refresh = (episodeId: string) => revalidatePath(`/questions/${episodeId}`);

export async function saveQuestion(
  episodeId: string,
  questionId: string | null,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!uuid.safeParse(episodeId).success) return { error: "Episode tidak valid." };
  const parsed = questionSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const ctx = await getStudioContext();

  if (questionId) {
    const { error } = await ctx.supabase.from("questions").update(parsed.data).eq("id", questionId).eq("episode_id", episodeId);
    if (error) return { error: "Gagal menyimpan pertanyaan." };
  } else {
    const { data: ep } = await ctx.supabase.from("episodes").select("workspace_id").eq("id", episodeId).maybeSingle();
    if (!ep) return { error: "Episode tidak ditemukan." };
    const { data: last } = await ctx.supabase
      .from("questions")
      .select("position")
      .eq("episode_id", episodeId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data, error } = await ctx.supabase
      .from("questions")
      .insert({ ...parsed.data, episode_id: episodeId, workspace_id: ep.workspace_id, position: (last?.position ?? -1) + 1, created_by: ctx.userId })
      .select("id")
      .single();
    if (error || !data) return { error: "Gagal menambah pertanyaan." };
    await logActivity(ctx, "created", "question", data.id, parsed.data.question.slice(0, 80));
  }
  refresh(episodeId);
  return { ok: true };
}

export async function updateQuestionFlags(
  questionId: string,
  patch: { priority?: string; status?: string },
): Promise<ActionState> {
  const clean: Record<string, string> = {};
  if (patch.priority && prios.includes(patch.priority)) clean.priority = patch.priority;
  if (patch.status && stats.includes(patch.status)) clean.status = patch.status;
  if (!Object.keys(clean).length) return { error: "Data tidak valid." };
  const ctx = await getStudioContext();
  const { data, error } = await ctx.supabase.from("questions").update(clean).eq("id", questionId).select("episode_id").single();
  if (error || !data) return { error: "Gagal memperbarui pertanyaan." };
  refresh(data.episode_id);
  return { ok: true };
}

export async function duplicateQuestion(questionId: string): Promise<ActionState> {
  const ctx = await getStudioContext();
  const { data: q } = await ctx.supabase.from("questions").select("*, follow_up_questions(question, position)").eq("id", questionId).single();
  if (!q) return { error: "Pertanyaan tidak ditemukan." };
  // Geser posisi pertanyaan setelahnya agar salinan tepat di bawah aslinya.
  const { data: after } = await ctx.supabase
    .from("questions")
    .select("id, position")
    .eq("episode_id", q.episode_id)
    .gt("position", q.position)
    .order("position", { ascending: false });
  for (const a of after ?? []) await ctx.supabase.from("questions").update({ position: a.position + 1 }).eq("id", a.id);

  const { data: copy, error } = await ctx.supabase
    .from("questions")
    .insert({
      workspace_id: q.workspace_id,
      episode_id: q.episode_id,
      question: q.question,
      category: q.category,
      purpose: q.purpose,
      host_notes: q.host_notes,
      priority: q.priority,
      status: "not_asked",
      position: q.position + 1,
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (error || !copy) return { error: "Gagal menduplikasi." };
  const fus = (q.follow_up_questions as { question: string; position: number }[]) ?? [];
  if (fus.length) {
    await ctx.supabase.from("follow_up_questions").insert(
      fus.map((f) => ({ workspace_id: q.workspace_id, question_id: copy.id, question: f.question, position: f.position })),
    );
  }
  await logActivity(ctx, "duplicated", "question", copy.id, q.question.slice(0, 80));
  refresh(q.episode_id);
  return { ok: true };
}

export async function deleteQuestion(questionId: string): Promise<ActionState> {
  const ctx = await getStudioContext();
  const { data: q } = await ctx.supabase.from("questions").select("episode_id, question").eq("id", questionId).single();
  if (!q) return { error: "Pertanyaan tidak ditemukan." };
  const { error, count } = await ctx.supabase.from("questions").delete({ count: "exact" }).eq("id", questionId);
  if (error || !count) return { error: "Gagal menghapus." };
  await logActivity(ctx, "deleted", "question", questionId, q.question.slice(0, 80));
  refresh(q.episode_id);
  return { ok: true };
}

/** Simpan urutan baru (hasil drag & drop). */
export async function reorderQuestions(episodeId: string, orderedIds: string[]): Promise<ActionState> {
  if (!uuid.safeParse(episodeId).success || !orderedIds.every((id) => uuid.safeParse(id).success)) return { error: "Data tidak valid." };
  const ctx = await getStudioContext();
  const results = await Promise.all(
    orderedIds.map((id, i) => ctx.supabase.from("questions").update({ position: i }).eq("id", id).eq("episode_id", episodeId)),
  );
  if (results.some((r) => r.error)) return { error: "Gagal menyimpan urutan." };
  refresh(episodeId);
  return { ok: true };
}

export async function addFollowUp(questionId: string, text: string): Promise<ActionState> {
  const parsed = z.string().trim().min(2, "Minimal 2 karakter").max(1000).safeParse(text);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const ctx = await getStudioContext();
  const { data: q } = await ctx.supabase.from("questions").select("workspace_id, episode_id").eq("id", questionId).single();
  if (!q) return { error: "Pertanyaan tidak ditemukan." };
  const { data: last } = await ctx.supabase
    .from("follow_up_questions")
    .select("position")
    .eq("question_id", questionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await ctx.supabase
    .from("follow_up_questions")
    .insert({ workspace_id: q.workspace_id, question_id: questionId, question: parsed.data, position: (last?.position ?? -1) + 1 });
  if (error) return { error: "Gagal menambah pertanyaan lanjutan." };
  refresh(q.episode_id);
  return { ok: true };
}

export async function updateFollowUp(id: string, patch: { status?: string; question?: string }): Promise<ActionState> {
  const clean: Record<string, string> = {};
  if (patch.status && stats.includes(patch.status)) clean.status = patch.status;
  if (patch.question !== undefined) {
    const t = patch.question.trim();
    if (t.length < 2 || t.length > 1000) return { error: "Teks 2–1000 karakter." };
    clean.question = t;
  }
  const ctx = await getStudioContext();
  const { data, error } = await ctx.supabase.from("follow_up_questions").update(clean).eq("id", id).select("question:questions(episode_id)").single();
  if (error || !data) return { error: "Gagal memperbarui." };
  refresh((data.question as unknown as { episode_id: string }).episode_id);
  return { ok: true };
}

export async function deleteFollowUp(id: string): Promise<ActionState> {
  const ctx = await getStudioContext();
  const { data } = await ctx.supabase.from("follow_up_questions").select("question:questions(episode_id)").eq("id", id).single();
  const { error } = await ctx.supabase.from("follow_up_questions").delete().eq("id", id);
  if (error) return { error: "Gagal menghapus." };
  if (data) refresh((data.question as unknown as { episode_id: string }).episode_id);
  return { ok: true };
}
