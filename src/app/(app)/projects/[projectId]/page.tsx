import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CalendarDays, Clock, Globe, Mic2, Pencil, Plus, Podcast, Target, Users } from "lucide-react";
import { EpisodeTable } from "@/components/episodes/episode-table";
import { ProjectActions } from "@/components/projects/project-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SavedToast } from "@/components/ui/saved-toast";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { getStudioContext } from "@/lib/session";
import { signedUrls } from "@/lib/storage";
import type { Episode } from "@/lib/types";
import { formatDate, formatDuration } from "@/lib/utils";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ archived?: string }>;
}) {
  const { projectId } = await params;
  const { archived } = await searchParams;
  const showArchived = archived === "1";
  const ctx = await getStudioContext();

  const { data: project } = await ctx.supabase.from("podcast_projects").select("*").eq("id", projectId).maybeSingle();
  if (!project) notFound();

  let epQuery = ctx.supabase
    .from("episodes")
    .select("*, guest:guests(id, name)")
    .eq("project_id", projectId)
    .order("episode_number", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  epQuery = showArchived ? epQuery.not("archived_at", "is", null) : epQuery.is("archived_at", null);
  const { data: episodes, error } = await epQuery;
  if (error) throw new Error(error.message);

  const urls = await signedUrls(ctx, STORAGE_BUCKETS.covers, [project.cover_path]);
  const cover = project.cover_path ? urls[project.cover_path] : null;

  const info = [
    { icon: Target, label: "Main Topic", value: project.main_topic },
    { icon: Users, label: "Target Audience", value: project.target_audience },
    { icon: Globe, label: "Language", value: project.language },
    { icon: Mic2, label: "Communication Style", value: project.communication_style },
    { icon: Clock, label: "Default Duration", value: formatDuration(project.default_episode_duration) },
    { icon: Mic2, label: "Host", value: project.host_name },
    { icon: CalendarDays, label: "Created", value: formatDate(project.created_at) },
  ];

  return (
    <>
      <SavedToast />
      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent-soft text-accent">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="size-full object-cover" />
          ) : (
            <Podcast className="size-10" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm text-secondary">
            <Link href="/projects" className="hover:text-primary">
              Podcast Projects
            </Link>
            <span>/</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{project.name}</h1>
          {project.category && <Badge className="mt-2">{project.category}</Badge>}
          <p className="mt-2 max-w-2xl whitespace-pre-line text-sm text-secondary">{project.description || "Tanpa deskripsi."}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/projects/${project.id}/edit`}>
              <Pencil /> Edit
            </Link>
          </Button>
          <ProjectActions projectId={project.id} projectName={project.name} isAdmin={ctx.role === "admin"} redirectAfterDelete />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>Episode</CardTitle>
              <div className="flex rounded-lg bg-muted p-0.5 text-xs">
                <Link
                  href={`/projects/${project.id}`}
                  className={`rounded-md px-2.5 py-1 ${!showArchived ? "bg-surface font-medium shadow-sm" : "text-secondary"}`}
                >
                  Aktif
                </Link>
                <Link
                  href={`/projects/${project.id}?archived=1`}
                  className={`rounded-md px-2.5 py-1 ${showArchived ? "bg-surface font-medium shadow-sm" : "text-secondary"}`}
                >
                  Diarsipkan
                </Link>
              </div>
            </div>
            <Button asChild size="sm">
              <Link href={`/projects/${project.id}/episodes/new`}>
                <Plus /> Episode baru
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {episodes.length === 0 ? (
              <EmptyState
                icon={Mic2}
                title={showArchived ? "Tidak ada episode diarsipkan" : "Belum ada episode"}
                description={showArchived ? undefined : "Tambahkan episode pertama untuk project ini."}
                className="border-0 py-10"
              />
            ) : (
              <EpisodeTable episodes={episodes as (Episode & { guest: { id: string; name: string } | null })[]} projectId={project.id} />
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Detail project</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              {info.map((i) => (
                <div key={i.label} className="flex gap-3">
                  <i.icon className="mt-0.5 size-4 shrink-0 text-secondary" />
                  <div>
                    <dt className="text-xs text-secondary">{i.label}</dt>
                    <dd>{i.value || "-"}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
