import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProjectForm } from "@/components/projects/project-form";
import { PageHeader } from "@/components/ui/page-header";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { getStudioContext } from "@/lib/session";
import { signedUrls } from "@/lib/storage";
import type { PodcastProject } from "@/lib/types";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const ctx = await getStudioContext();
  const { data: project } = await ctx.supabase.from("podcast_projects").select("*").eq("id", projectId).maybeSingle();
  if (!project) notFound();
  const urls = await signedUrls(ctx, STORAGE_BUCKETS.covers, [project.cover_path]);
  return (
    <>
      <PageHeader title="Edit project" description={project.name} />
      <ProjectForm project={project as PodcastProject} coverUrl={project.cover_path ? urls[project.cover_path] : null} />
    </>
  );
}
