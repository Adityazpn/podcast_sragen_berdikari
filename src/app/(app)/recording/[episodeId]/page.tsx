import type { Metadata } from "next";
import { EpisodeHeading } from "@/components/episodes/episode-tabs";
import { RecordingNotes, type RecNote } from "@/components/recording/recording-notes";
import { getEpisodeRef } from "@/lib/episodes";
import { getStudioContext } from "@/lib/session";

export const metadata: Metadata = { title: "Recording Notes" };

export default async function RecordingPage({ params }: { params: Promise<{ episodeId: string }> }) {
  const { episodeId } = await params;
  const ctx = await getStudioContext();
  const episode = await getEpisodeRef(ctx, episodeId);
  const [{ data, error }, { data: script }] = await Promise.all([
    ctx.supabase
      .from("recording_notes")
      .select("id, type, content, timestamp_label, is_done, created_at, author:profiles(full_name)")
      .eq("episode_id", episodeId)
      .order("position", { ascending: true }),
    ctx.supabase.from("scripts").select("id").eq("episode_id", episodeId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (error) throw new Error(error.message);
  const notes: RecNote[] = (data ?? []).map((n) => ({
    id: n.id,
    type: n.type,
    content: n.content,
    timestamp_label: n.timestamp_label,
    is_done: n.is_done,
    created_at: n.created_at,
    author: (n.author as unknown as { full_name: string } | null)?.full_name ?? null,
  }));
  return (
    <>
      <EpisodeHeading episode={episode} section="Recording Notes" />
      <RecordingNotes episodeId={episodeId} notes={notes} scriptId={script?.id ?? null} />
    </>
  );
}
