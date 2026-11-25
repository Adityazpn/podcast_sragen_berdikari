import Link from "next/link";
import type { Metadata } from "next";
import { Activity, CalendarClock, CheckCircle2, FileText, Mic2, Podcast, UserSquare2 } from "lucide-react";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { StatusBadge } from "@/components/episodes/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ACTION_LABEL, ENTITY_LABEL } from "@/lib/activity";
import { getStudioContext } from "@/lib/session";
import type { EpisodeStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const ctx = await getStudioContext();
  const ws = ctx.workspace.id;
  const sb = ctx.supabase;
  const head = { count: "exact" as const, head: true };
  const nowIso = new Date().toISOString();

  const [projects, episodes, guests, drafts, ready, upcoming, recentProjects, activity, allProjects] = await Promise.all([
    sb.from("podcast_projects").select("id", head).eq("workspace_id", ws),
    sb.from("episodes").select("id", head).eq("workspace_id", ws).is("archived_at", null),
    sb.from("guests").select("id", head).eq("workspace_id", ws),
    sb.from("scripts").select("id", head).eq("workspace_id", ws).eq("status", "draft"),
    sb.from("episodes").select("id", head).eq("workspace_id", ws).eq("status", "ready_to_record").is("archived_at", null),
    sb
      .from("episodes")
      .select("id, title, status, recording_date, project_id, project:podcast_projects(name), guest:guests(name)")
      .eq("workspace_id", ws)
      .is("archived_at", null)
      .gte("recording_date", nowIso)
      .order("recording_date", { ascending: true })
      .limit(5),
    sb.from("podcast_projects").select("id, name, category, updated_at, episodes(count)").eq("workspace_id", ws).order("updated_at", { ascending: false }).limit(5),
    sb
      .from("activity_logs")
      .select("id, action, entity_type, entity_label, created_at, user:profiles(full_name)")
      .eq("workspace_id", ws)
      .order("created_at", { ascending: false })
      .limit(8),
    sb.from("podcast_projects").select("id, name").eq("workspace_id", ws).order("name"),
  ]);

  const firstError = [projects, episodes, guests, drafts, ready, upcoming, recentProjects, activity].find((r) => r.error)?.error;
  if (firstError) throw new Error(firstError.message);

  const stats = [
    { label: "Total Podcast Projects", value: projects.count ?? 0, icon: Podcast, href: "/projects" },
    { label: "Total Episodes", value: episodes.count ?? 0, icon: Mic2, href: "/projects" },
    { label: "Total Guests", value: guests.count ?? 0, icon: UserSquare2, href: "/guests" },
    { label: "Draft Scripts", value: drafts.count ?? 0, icon: FileText },
    { label: "Ready to Record", value: ready.count ?? 0, icon: CheckCircle2 },
    { label: "Upcoming Recording", value: upcoming.data?.length ?? 0, icon: CalendarClock },
  ];

  const firstName = ctx.profile.full_name.split(" ")[0] || "";

  return (
    <>
      <PageHeader title={`Halo${firstName ? `, ${firstName}` : ""}`} description="Ringkasan produksi podcast di workspace Anda." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => {
          const inner = (
            <Card className="h-full p-4 transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between text-secondary">
                <span className="text-xs font-medium">{s.label}</span>
                <s.icon className="size-4" />
              </div>
              <p className="mt-3 text-3xl font-semibold tabular-nums">{s.value}</p>
            </Card>
          );
          return s.href ? (
            <Link key={s.label} href={s.href}>
              {inner}
            </Link>
          ) : (
            <div key={s.label}>{inner}</div>
          );
        })}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-secondary">Quick Actions</h2>
      <QuickActions projects={allProjects.data ?? []} />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Upcoming Recording</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.data && upcoming.data.length > 0 ? (
              <ul className="divide-y divide-border">
                {upcoming.data.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link href={`/projects/${e.project_id}/episodes/${e.id}`} className="font-medium hover:text-accent">
                        {e.title}
                      </Link>
                      <p className="truncate text-xs text-secondary">
                        {(e.project as unknown as { name: string })?.name}
                        {e.guest ? ` · ${(e.guest as unknown as { name: string }).name}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm tabular-nums">{formatDate(e.recording_date, true)}</span>
                      <StatusBadge status={e.status as EpisodeStatus} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={CalendarClock} title="Belum ada jadwal rekaman" description="Atur Recording Date pada episode agar muncul di sini." className="border-0 py-8" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.data && activity.data.length > 0 ? (
              <ol className="space-y-3 text-sm">
                {activity.data.map((a) => (
                  <li key={a.id} className="flex gap-2">
                    <Activity className="mt-0.5 size-4 shrink-0 text-secondary" />
                    <div>
                      <span className="font-medium">{(a.user as unknown as { full_name: string } | null)?.full_name ?? "Seseorang"}</span>{" "}
                      <span className="text-secondary">
                        {ACTION_LABEL[a.action] ?? a.action} {ENTITY_LABEL[a.entity_type] ?? a.entity_type}
                      </span>{" "}
                      <span className="font-medium">{a.entity_label}</span>
                      <p className="text-xs text-secondary">{formatDate(a.created_at, true)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-secondary">Belum ada aktivitas.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {recentProjects.data && recentProjects.data.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {recentProjects.data.map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}`} className="rounded-lg border border-border p-3 hover:border-accent">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-xs text-secondary">
                      {(p.episodes as unknown as { count: number }[])[0]?.count ?? 0} episode · {formatDate(p.updated_at)}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState icon={Podcast} title="Belum ada project" description="Mulai dengan membuat project podcast." className="border-0 py-8" />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
