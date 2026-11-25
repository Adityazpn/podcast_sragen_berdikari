import "server-only";
import { notFound } from "next/navigation";
import type { StudioContext } from "./session";

export interface EpisodeRef {
  id: string;
  title: string;
  episode_number: number | null;
  duration_minutes: number | null;
  status: string;
  host: string | null;
  recording_date: string | null;
  project: { id: string; name: string };
  guest: { id: string; name: string } | null;
}

/** Ambil episode (dengan project & guest) atau tampilkan 404. RLS memastikan hanya workspace sendiri. */
export async function getEpisodeRef(ctx: StudioContext, episodeId: string): Promise<EpisodeRef> {
  if (!/^[0-9a-f-]{36}$/i.test(episodeId)) notFound();
  const { data } = await ctx.supabase
    .from("episodes")
    .select("id, title, episode_number, duration_minutes, status, host, recording_date, project:podcast_projects(id, name), guest:guests(id, name)")
    .eq("id", episodeId)
    .maybeSingle();
  if (!data) notFound();
  return data as unknown as EpisodeRef;
}

/** Daftar episode untuk pemilih episode. */
export async function listEpisodeOptions(ctx: StudioContext) {
  const { data } = await ctx.supabase
    .from("episodes")
    .select("id, title, episode_number, project:podcast_projects(name)")
    .eq("workspace_id", ctx.workspace.id)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });
  return (data ?? []).map((e) => ({
    id: e.id as string,
    label: `${(e.project as unknown as { name: string })?.name ?? ""} · ${e.episode_number != null ? `#${e.episode_number} ` : ""}${e.title}`,
  }));
}
