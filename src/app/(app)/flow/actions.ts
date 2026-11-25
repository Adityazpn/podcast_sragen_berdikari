"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { FLOW_TYPES, type FlowType } from "@/lib/constants";
import { getStudioContext } from "@/lib/session";
import type { ActionState } from "@/lib/types";

const uuid = z.string().uuid();
const types = FLOW_TYPES.map((t) => t.value) as [FlowType, ...FlowType[]];

export async function addFlowItems(episodeId: string, itemTypes: string[]): Promise<ActionState> {
  if (!uuid.safeParse(episodeId).success) return { error: "Episode tidak valid." };
  const valid = itemTypes.filter((t): t is FlowType => (types as string[]).includes(t));
  if (!valid.length) return { error: "Jenis bagian tidak valid." };
  const ctx = await getStudioContext();
  const { data: ep } = await ctx.supabase.from("episodes").select("workspace_id").eq("id", episodeId).maybeSingle();
  if (!ep) return { error: "Episode tidak ditemukan." };
  const { data: last } = await ctx.supabase
    .from("conversation_flow_items")
    .select("position")
    .eq("episode_id", episodeId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const start = (last?.position ?? -1) + 1;
  const { error } = await ctx.supabase.from("conversation_flow_items").insert(
    valid.map((type, i) => ({
      workspace_id: ep.workspace_id,
      episode_id: episodeId,
      type,
      title: FLOW_TYPES.find((t) => t.value === type)!.label,
      position: start + i,
      created_by: ctx.userId,
    })),
  );
  if (error) return { error: `Gagal menambah bagian: ${error.message}` };
  revalidatePath(`/flow/${episodeId}`);
  return { ok: true };
}

const patchSchema = z.object({
  title: z.string().trim().max(200).optional(),
  content: z.string().max(20000).optional(),
  type: z.enum(types).optional(),
});

export async function updateFlowItem(id: string, patch: { title?: string; content?: string; type?: string }): Promise<ActionState & { savedAt?: string }> {
  const parsed = patchSchema.safeParse(patch);
  if (!parsed.success || !uuid.safeParse(id).success) return { error: "Data tidak valid." };
  const ctx = await getStudioContext();
  const { data, error } = await ctx.supabase.from("conversation_flow_items").update(parsed.data).eq("id", id).select("updated_at").single();
  if (error || !data) return { error: "Gagal menyimpan." };
  return { ok: true, savedAt: data.updated_at };
}

export async function deleteFlowItem(id: string): Promise<ActionState> {
  const ctx = await getStudioContext();
  const { data } = await ctx.supabase.from("conversation_flow_items").select("episode_id").eq("id", id).maybeSingle();
  const { error } = await ctx.supabase.from("conversation_flow_items").delete().eq("id", id);
  if (error) return { error: "Gagal menghapus." };
  if (data) revalidatePath(`/flow/${data.episode_id}`);
  return { ok: true };
}

export async function reorderFlowItems(episodeId: string, ids: string[]): Promise<ActionState> {
  if (!uuid.safeParse(episodeId).success || !ids.every((i) => uuid.safeParse(i).success)) return { error: "Data tidak valid." };
  const ctx = await getStudioContext();
  const res = await Promise.all(
    ids.map((id, i) => ctx.supabase.from("conversation_flow_items").update({ position: i }).eq("id", id).eq("episode_id", episodeId)),
  );
  if (res.some((r) => r.error)) return { error: "Gagal menyimpan urutan." };
  revalidatePath(`/flow/${episodeId}`);
  return { ok: true };
}
