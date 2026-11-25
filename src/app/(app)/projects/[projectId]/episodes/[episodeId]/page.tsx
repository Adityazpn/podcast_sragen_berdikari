import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Archive, BookOpen, ExternalLink, FileText, ListChecks, ListOrdered, Pencil, Route } from "lucide-react";
import { EpisodeActions } from "@/components/episodes/episode-actions";
import { EpisodeTabs } from "@/components/episodes/episode-tabs";
import { StatusSelect } from "@/components/episodes/status-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SavedToast } from "@/components/ui/saved-toast";
import { getStudioContext } from "@/lib/session";
import type { EpisodeStatus } from "@/lib/types";
import { clock, sumMinutes } from "@/lib/duration";
import { formatDate, formatDuration } from "@/lib/utils";

export const metadata: Metadata = { title: "Episode" };

export default async function EpisodePage({ params }: { params: Promise<{ projectId: string; episodeId: string }> }) {
  const { projectId, episodeId } = await params;
  const ctx = await getStudioContext();
  const { data: ep } = await ctx.supabase
    .from("episodes")
    .select("*, project:podcast_projects(id, name), guest:guests(id, name, position, company)")
    .eq("id", episodeId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!ep) notFound();
  const head = { count: "exact" as const, head: true };
  const [scripts, questions, asked, flow, research, rundown] = await Promise.all([
    ctx.supabase.from("scripts").select("id, title, word_count, status").eq("episode_id", episodeId).order("updated_at", { ascending: false }),
    ctx.supabase.from("questions").select("id", head).eq("episode_id", episodeId),
    ctx.supabase.from("questions").select("id", head).eq("episode_id", episodeId).eq("status", "asked"),
    ctx.supabase.from("conversation_flow_items").select("id", head).eq("episode_id", episodeId),
    ctx.supabase.from("research_notes").select("id", head).eq("episode_id", episodeId),
    ctx.supabase.from("rundown_segments").select("duration_minutes").eq("episode_id", episodeId),
  ]);
  const rundownTotal = sumMinutes((rundown.data ?? []).map((r) => r.duration_minutes));
  const latestScript = scripts.data?.[0];
  const workspace = [
    {
      icon: FileText,
      label: "Script",
      value: scripts.data?.length ? `${scripts.data.length} script · ${latestScript!.word_count.toLocaleString("id-ID")} kata` : "Belum ada",
      href: latestScript ? `/scripts/${latestScript.id}` : `/scripts?episode=${episodeId}`,
      cta: latestScript ? "Buka script" : "Buat script",
    },
    { icon: ListChecks, label: "Pertanyaan", value: `${asked.count ?? 0}/${questions.count ?? 0} ditanyakan`, href: `/questions/${episodeId}`, cta: "Kelola" },
    { icon: Route, label: "Alur percakapan", value: `${flow.count ?? 0} bagian`, href: `/flow/${episodeId}`, cta: "Kelola" },
    { icon: ListOrdered, label: "Rundown", value: rundown.data?.length ? `${rundown.data.length} segmen · ${clock(rundownTotal)}` : "Belum ada", href: `/rundown/${episodeId}`, cta: "Kelola" },
    { icon: BookOpen, label: "Riset", value: `${research.count ?? 0} catatan`, href: `/research?episode=${episodeId}`, cta: "Kelola" },
  ];
  const project = ep.project as unknown as { id: string; name: string };
  const guest = ep.guest as unknown as { id: string; name: string; position: string | null; company: string | null } | null;

  const rows = [
    ["Main Topic", ep.main_topic],
    ["Host", ep.host],
    ["Recording Date", formatDate(ep.recording_date, true)],
    ["Recording Location", ep.recording_location],
    ["Duration", formatDuration(ep.duration_minutes)],
    ["Target Audience", ep.target_audience],
  ] as const;

  return (
    <>
      <SavedToast />
      <div className="mb-2 text-sm text-secondary">
        <Link href="/projects" className="hover:text-primary">
          Podcast Projects
        </Link>{" "}
        /{" "}
        <Link href={`/projects/${project.id}`} className="hover:text-primary">
          {project.name}
        </Link>
      </div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {ep.episode_number != null && <span className="text-secondary">#{ep.episode_number} </span>}
            {ep.title}
          </h1>
          {ep.archived_at && (
            <Badge className="mt-2">
              <Archive className="size-3" /> Diarsipkan {formatDate(ep.archived_at)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusSelect key={ep.status} episodeId={ep.id} status={ep.status as EpisodeStatus} />
          <Button asChild variant="outline">
            <Link href={`/projects/${projectId}/episodes/${ep.id}/edit`}>
              <Pencil /> Edit
            </Link>
          </Button>
          <EpisodeActions episodeId={ep.id} projectId={projectId} title={ep.title} archived={!!ep.archived_at} redirectAfterDelete />
        </div>
      </div>

      <EpisodeTabs episodeId={ep.id} projectId={projectId} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {workspace.map((w) => (
              <Link key={w.label} href={w.href} className="rounded-xl border border-border bg-surface p-4 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <w.icon className="size-4 text-accent" /> {w.label}
                </div>
                <p className="mt-1 text-sm text-secondary">{w.value}</p>
                <p className="mt-2 text-xs font-medium text-accent">{w.cta} →</p>
              </Link>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Deskripsi</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-line text-sm text-secondary">{ep.description || "Belum ada deskripsi."}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Episode Objective</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-line text-sm text-secondary">{ep.objective || "Belum ada tujuan episode."}</CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detail</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                {rows.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-secondary">{k}</dt>
                    <dd>{v || "-"}</dd>
                  </div>
                ))}
                <div>
                  <dt className="text-xs text-secondary">Publication Link</dt>
                  <dd>
                    {ep.publication_link ? (
                      <a href={ep.publication_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                        Buka <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      "-"
                    )}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Guest</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {guest ? (
                <Link href={`/guests/${guest.id}`} className="block rounded-lg border border-border p-3 hover:border-accent">
                  <p className="font-medium">{guest.name}</p>
                  <p className="text-secondary">{[guest.position, guest.company].filter(Boolean).join(" · ") || "-"}</p>
                </Link>
              ) : (
                <p className="text-secondary">Belum ada narasumber.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
