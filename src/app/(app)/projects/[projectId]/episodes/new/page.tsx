import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { EpisodeForm } from "@/components/episodes/episode-form";
import { PageHeader } from "@/components/ui/page-header";
import { getStudioContext } from "@/lib/session";

export const metadata: Metadata = { title: "Episode baru" };

export default async function NewEpisodePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const ctx = await getStudioContext();
  const [{ data: project }, { data: guests }, { data: last }] = await Promise.all([
    ctx.supabase.from("podcast_projects").select("id, name, host_name, default_episode_duration, target_audience").eq("id", projectId).maybeSingle(),
    ctx.supabase.from("guests").select("id, name").eq("workspace_id", ctx.workspace.id).order("name"),
    ctx.supabase
      .from("episodes")
      .select("episode_number")
      .eq("project_id", projectId)
      .not("episode_number", "is", null)
      .order("episode_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!project) notFound();
  return (
    <>
      <PageHeader title="Episode baru" description={project.name} />
      <EpisodeForm
        projectId={projectId}
        guests={guests ?? []}
        defaults={{
          host: project.host_name,
          duration: project.default_episode_duration,
          audience: project.target_audience,
          nextNumber: (last?.episode_number ?? 0) + 1,
        }}
      />
    </>
  );
}
