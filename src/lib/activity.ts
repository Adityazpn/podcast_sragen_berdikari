import "server-only";
import type { StudioContext } from "./session";

export async function logActivity(
  ctx: Pick<StudioContext, "supabase" | "userId" | "workspace">,
  action: "created" | "updated" | "deleted" | "duplicated" | "archived" | "restored",
  entityType: "project" | "episode" | "guest" | "script" | "question" | "research" | "rundown" | "flow" | "member" | "workspace",
  entityId: string | null,
  entityLabel: string,
) {
  // Log aktivitas bersifat pelengkap: kegagalan mencatat tidak boleh menggagalkan aksi utama.
  const { error } = await ctx.supabase.from("activity_logs").insert({
    workspace_id: ctx.workspace.id,
    user_id: ctx.userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    entity_label: entityLabel,
  });
  if (error) console.error("activity log failed", error.message);
}

export const ACTION_LABEL: Record<string, string> = {
  created: "membuat",
  updated: "memperbarui",
  deleted: "menghapus",
  duplicated: "menduplikasi",
  archived: "mengarsipkan",
  restored: "memulihkan",
};

export const ENTITY_LABEL: Record<string, string> = {
  project: "project",
  episode: "episode",
  guest: "narasumber",
  script: "script",
  question: "pertanyaan",
  research: "catatan riset",
  rundown: "rundown",
  flow: "alur percakapan",
  member: "anggota",
  workspace: "workspace",
};
