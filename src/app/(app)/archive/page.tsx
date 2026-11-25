import Link from "next/link";
import type { Metadata } from "next";
import { Archive, BookOpen, ExternalLink, FileText, LayoutGrid, List, ListChecks, UserRound } from "lucide-react";
import { EpisodeActions } from "@/components/episodes/episode-actions";
import { StatusBadge } from "@/components/episodes/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, NativeSelect } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { EPISODE_STATUSES } from "@/lib/constants";
import { getStudioContext } from "@/lib/session";
import type { EpisodeStatus } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Episode Archive" };

const SORTS = {
  recording_desc: { col: "recording_date", asc: false, label: "Tanggal rekaman (terbaru)" },
  recording_asc: { col: "recording_date", asc: true, label: "Tanggal rekaman (terlama)" },
  updated: { col: "updated_at", asc: false, label: "Terakhir diperbarui" },
  title: { col: "title", asc: true, label: "Judul (A–Z)" },
  number: { col: "episode_number", asc: true, label: "Nomor episode" },
} as const;

type Row = {
  id: string;
  title: string;
  episode_number: number | null;
  status: EpisodeStatus;
  recording_date: string | null;
  publication_link: string | null;
  archived_at: string | null;
  project: { id: string; name: string };
  guest: { id: string; name: string } | null;
  scripts: { count: number }[];
  questions: { count: number }[];
  research_notes: { count: number }[];
};

const isUuid = (v?: string) => !!v && /^[0-9a-f-]{36}$/i.test(v);

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; project?: string; status?: string; guest?: string; sort?: string; view?: string; show?: string }>;
}) {
  const sp = await searchParams;
  const view = sp.view === "list" ? "list" : "grid";
  const show = sp.show === "archived" || sp.show === "active" ? sp.show : "all";
  const sort = SORTS[sp.sort as keyof typeof SORTS] ? (sp.sort as keyof typeof SORTS) : "recording_desc";
  const ctx = await getStudioContext();

  let query = ctx.supabase
    .from("episodes")
    .select(
      "id, title, episode_number, status, recording_date, publication_link, archived_at, project:podcast_projects(id, name), guest:guests(id, name), scripts(count), questions(count), research_notes(count)",
    )
    .eq("workspace_id", ctx.workspace.id)
    .order(SORTS[sort].col, { ascending: SORTS[sort].asc, nullsFirst: false })
    .order("created_at", { ascending: false });
  const q = (sp.q ?? "").trim().replace(/[%,()]/g, " ");
  if (q) query = query.or(`title.ilike.%${q}%,main_topic.ilike.%${q}%`);
  if (isUuid(sp.project)) query = query.eq("project_id", sp.project!);
  if (isUuid(sp.guest)) query = query.eq("guest_id", sp.guest!);
  if (EPISODE_STATUSES.some((s) => s.value === sp.status)) query = query.eq("status", sp.status!);
  if (show === "archived") query = query.not("archived_at", "is", null);
  if (show === "active") query = query.is("archived_at", null);

  const [{ data, error }, { data: projects }, { data: guests }] = await Promise.all([
    query,
    ctx.supabase.from("podcast_projects").select("id, name").eq("workspace_id", ctx.workspace.id).order("name"),
    ctx.supabase.from("guests").select("id, name").eq("workspace_id", ctx.workspace.id).order("name"),
  ]);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];

  const params = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    Object.entries({ ...sp, ...patch }).forEach(([k, v]) => v && p.set(k, v));
    return `/archive?${p}`;
  };
  const count = (c: { count: number }[]) => c?.[0]?.count ?? 0;

  return (
    <>
      <PageHeader
        title="Episode Archive"
        description="Arsip seluruh episode beserta script, pertanyaan, dan riset."
        actions={
          <div className="flex rounded-lg border border-border bg-surface p-0.5">
            <Link href={params({ view: "grid" })} aria-label="Tampilan grid" className={cn("rounded-md p-1.5", view === "grid" ? "bg-muted" : "text-secondary")}>
              <LayoutGrid className="size-4" />
            </Link>
            <Link href={params({ view: "list" })} aria-label="Tampilan list" className={cn("rounded-md p-1.5", view === "list" ? "bg-muted" : "text-secondary")}>
              <List className="size-4" />
            </Link>
          </div>
        }
      />

      <form className="mb-6 grid gap-2 md:grid-cols-3 xl:grid-cols-[1fr_180px_170px_170px_150px_200px_auto]">
        <input type="hidden" name="view" value={view} />
        <Input name="q" defaultValue={sp.q ?? ""} placeholder="Cari judul atau topik..." aria-label="Cari episode" />
        <NativeSelect name="project" defaultValue={sp.project ?? ""} aria-label="Filter project">
          <option value="">Semua project</option>
          {(projects ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="guest" defaultValue={sp.guest ?? ""} aria-label="Filter narasumber">
          <option value="">Semua narasumber</option>
          {(guests ?? []).map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="status" defaultValue={sp.status ?? ""} aria-label="Filter status">
          <option value="">Semua status</option>
          {EPISODE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="show" defaultValue={show} aria-label="Tampilkan">
          <option value="all">Aktif & arsip</option>
          <option value="active">Hanya aktif</option>
          <option value="archived">Hanya diarsipkan</option>
        </NativeSelect>
        <NativeSelect name="sort" defaultValue={sort} aria-label="Urutkan">
          {Object.entries(SORTS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </NativeSelect>
        <div className="flex gap-2">
          <Button type="submit" variant="outline">
            Terapkan
          </Button>
          <Button asChild variant="ghost">
            <Link href={`/archive?view=${view}`}>Reset</Link>
          </Button>
        </div>
      </form>

      <p className="mb-3 text-sm text-secondary">{rows.length} episode</p>

      {rows.length === 0 ? (
        <EmptyState icon={Archive} title="Tidak ada episode" description="Ubah filter atau buat episode baru di Podcast Projects." />
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((e) => (
            <Card key={e.id} className={cn("flex flex-col p-4", e.archived_at && "bg-muted/40")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs text-secondary">{e.project.name}</p>
                  <Link href={`/projects/${e.project.id}/episodes/${e.id}`} className="font-semibold hover:text-accent">
                    {e.episode_number != null && <span className="text-secondary">#{e.episode_number} </span>}
                    {e.title}
                  </Link>
                </div>
                <EpisodeActions episodeId={e.id} projectId={e.project.id} title={e.title} archived={!!e.archived_at} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <StatusBadge status={e.status} />
                {e.archived_at && <Badge>Diarsipkan</Badge>}
              </div>
              <dl className="mt-3 space-y-1 text-sm text-secondary">
                <div className="flex items-center gap-2">
                  <UserRound className="size-4" /> {e.guest?.name ?? "Tanpa narasumber"}
                </div>
                <div>Rekaman: {formatDate(e.recording_date)}</div>
              </dl>
              <div className="mt-auto flex flex-wrap gap-3 border-t border-border pt-3 text-xs">
                <Link href={`/scripts?episode=${e.id}`} className="flex items-center gap-1 hover:text-accent">
                  <FileText className="size-3.5" /> {count(e.scripts)} script
                </Link>
                <Link href={`/questions/${e.id}`} className="flex items-center gap-1 hover:text-accent">
                  <ListChecks className="size-3.5" /> {count(e.questions)} pertanyaan
                </Link>
                <Link href={`/research?episode=${e.id}`} className="flex items-center gap-1 hover:text-accent">
                  <BookOpen className="size-3.5" /> {count(e.research_notes)} riset
                </Link>
                {e.publication_link && (
                  <a href={e.publication_link} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 text-accent">
                    Publikasi <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-secondary">
                <th className="px-4 py-2 font-medium">Episode</th>
                <th className="px-3 py-2 font-medium">Project</th>
                <th className="px-3 py-2 font-medium">Narasumber</th>
                <th className="px-3 py-2 font-medium">Rekaman</th>
                <th className="px-3 py-2 font-medium">Script / Pertanyaan / Riset</th>
                <th className="px-3 py-2 font-medium">Publikasi</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className={cn("border-b border-border last:border-0 hover:bg-muted/30", e.archived_at && "bg-muted/40")}>
                  <td className="px-4 py-3">
                    <Link href={`/projects/${e.project.id}/episodes/${e.id}`} className="font-medium hover:text-accent">
                      {e.episode_number != null && <span className="text-secondary">#{e.episode_number} </span>}
                      {e.title}
                    </Link>
                    {e.archived_at && <Badge className="ml-2">Arsip</Badge>}
                  </td>
                  <td className="px-3 py-3 text-secondary">{e.project.name}</td>
                  <td className="px-3 py-3 text-secondary">{e.guest?.name ?? "-"}</td>
                  <td className="px-3 py-3 text-secondary">{formatDate(e.recording_date)}</td>
                  <td className="px-3 py-3 tabular-nums">
                    <Link href={`/scripts?episode=${e.id}`} className="hover:text-accent">{count(e.scripts)}</Link> /{" "}
                    <Link href={`/questions/${e.id}`} className="hover:text-accent">{count(e.questions)}</Link> /{" "}
                    <Link href={`/research?episode=${e.id}`} className="hover:text-accent">{count(e.research_notes)}</Link>
                  </td>
                  <td className="px-3 py-3">
                    {e.publication_link ? (
                      <a href={e.publication_link} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                        Buka
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={e.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <EpisodeActions episodeId={e.id} projectId={e.project.id} title={e.title} archived={!!e.archived_at} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
