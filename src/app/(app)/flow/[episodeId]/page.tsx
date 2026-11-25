import type { Metadata } from "next";
import { EpisodeHeading } from "@/components/episodes/episode-tabs";
import { FlowEditor, type FlowItem } from "@/components/flow/flow-editor";
import { getEpisodeRef } from "@/lib/episodes";
import { getStudioContext } from "@/lib/session";

export const metadata: Metadata = { title: "Conversation Flow" };

export default async function FlowPage({ params }: { params: Promise<{ episodeId: string }> }) {
  const { episodeId } = await params;
  const ctx = await getStudioContext();
  const episode = await getEpisodeRef(ctx, episodeId);
  const { data, error } = await ctx.supabase
    .from("conversation_flow_items")
    .select("id, type, title, content")
    .eq("episode_id", episodeId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (
    <>
      <EpisodeHeading episode={episode} section="Conversation Flow" />
      <FlowEditor episodeId={episodeId} items={(data ?? []) as FlowItem[]} />
    </>
  );
}
