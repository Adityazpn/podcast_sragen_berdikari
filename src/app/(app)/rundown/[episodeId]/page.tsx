import type { Metadata } from "next";
import { EpisodeHeading } from "@/components/episodes/episode-tabs";
import { RundownEditor, type Segment } from "@/components/rundown/rundown-editor";
import { getEpisodeRef } from "@/lib/episodes";
import { getStudioContext } from "@/lib/session";

export const metadata: Metadata = { title: "Episode Rundown" };

export default async function RundownPage({ params }: { params: Promise<{ episodeId: string }> }) {
  const { episodeId } = await params;
  const ctx = await getStudioContext();
  const episode = await getEpisodeRef(ctx, episodeId);
  const { data, error } = await ctx.supabase
    .from("rundown_segments")
    .select("id, title, duration_minutes, notes")
    .eq("episode_id", episodeId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const segments = (data ?? []).map((s) => ({ ...s, duration_minutes: Number(s.duration_minutes) })) as Segment[];
  return (
    <>
      <EpisodeHeading episode={episode} section="Episode Rundown" />
      <RundownEditor episodeId={episodeId} segments={segments} target={episode.duration_minutes} />
    </>
  );
}
