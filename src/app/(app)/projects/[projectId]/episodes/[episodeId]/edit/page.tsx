import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { EpisodeForm } from "@/components/episodes/episode-form";
import { PageHeader } from "@/components/ui/page-header";
import { getStudioContext } from "@/lib/session";
import type { Episode } from "@/lib/types";

export const metadata: Metadata = { title: "Edit episode" };

export default async function EditEpisodePage({ params }: { params: Promise<{ projectId: string; episodeId: string }> }) {
  const { projectId, episodeId } = await params;
  const ctx = await getStudioContext();
  const [{ data: episode }, { data: guests }] = await Promise.all([
    ctx.supabase.from("episodes").select("*").eq("id", episodeId).eq("project_id", projectId).maybeSingle(),
    ctx.supabase.from("guests").select("id, name").eq("workspace_id", ctx.workspace.id).order("name"),
  ]);
  if (!episode) notFound();
  return (
    <>
      <PageHeader title="Edit episode" description={episode.title} />
      <EpisodeForm projectId={projectId} episode={episode as Episode} guests={guests ?? []} />
    </>
  );
}
