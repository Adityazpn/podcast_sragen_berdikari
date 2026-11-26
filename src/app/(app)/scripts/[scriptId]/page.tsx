import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { EpisodeHeading } from "@/components/episodes/episode-tabs";
import { ScriptEditor } from "@/components/script/script-editor";
import { aiEnabled } from "@/lib/ai/claude";
import { getEpisodeRef } from "@/lib/episodes";
import { blankTemplate } from "@/lib/script/template";
import type { TNode } from "@/lib/script/types";
import { getStudioContext } from "@/lib/session";

export const metadata: Metadata = { title: "Script Studio" };
export const maxDuration = 120;

export default async function ScriptPage({ params }: { params: Promise<{ scriptId: string }> }) {
  const { scriptId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(scriptId)) notFound();
  const ctx = await getStudioContext();
  const { data: script } = await ctx.supabase
    .from("scripts")
    .select("id, title, status, content, updated_at, episode_id")
    .eq("id", scriptId)
    .maybeSingle();
  if (!script) notFound();
  const episode = await getEpisodeRef(ctx, script.episode_id);
  return (
    <>
      <EpisodeHeading episode={episode} section="Script Studio" />
      <ScriptEditor
        script={{
          id: script.id,
          title: script.title,
          status: script.status as "draft" | "final",
          content: (script.content as TNode)?.type === "doc" ? (script.content as TNode) : blankTemplate(),
          updated_at: script.updated_at,
        }}
        episode={{ id: episode.id, title: episode.title, projectId: episode.project.id }}
        aiEnabled={aiEnabled()}
      />
    </>
  );
}
