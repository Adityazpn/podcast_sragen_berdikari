import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Podcast, Search } from "lucide-react";
import { ProjectActions } from "@/components/projects/project-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { getStudioContext } from "@/lib/session";
import { signedUrls } from "@/lib/storage";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Podcast Projects" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const ctx = await getStudioContext();

  let query = ctx.supabase
    .from("podcast_projects")
    .select("id, name, description, category, host_name, cover_path, created_at, episodes(count)")
    .eq("workspace_id", ctx.workspace.id)
    .order("updated_at", { ascending: false });
  const term = q.trim().replace(/[%,()]/g, " ");
  if (term) query = query.or(`name.ilike.%${term}%,main_topic.ilike.%${term}%,category.ilike.%${term}%`);

  const { data: projects, error } = await query;
  if (error) throw new Error(error.message);
  const covers = await signedUrls(ctx, STORAGE_BUCKETS.covers, projects.map((p) => p.cover_path));

  return (
    <>
      <PageHeader
        title="Podcast Projects"
        description="Kelola seluruh program podcast di workspace Anda."
        actions={
          <Button asChild>
            <Link href="/projects/new">
              <Plus /> Project baru
            </Link>
          </Button>
        }
      />

      <form className="relative mb-6 max-w-sm" role="search">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary" />
        <Input name="q" defaultValue={q} placeholder="Cari project..." className="pl-9" aria-label="Cari project" />
      </form>

      {projects.length === 0 ? (
        <EmptyState
          icon={Podcast}
          title={q ? "Tidak ada project yang cocok" : "Belum ada project"}
          description={q ? `Tidak ditemukan project untuk "${q}".` : "Buat project podcast pertama Anda untuk mulai mengelola episode."}
          action={
            !q && (
              <Button asChild>
                <Link href="/projects/new">
                  <Plus /> Buat project
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const count = (p.episodes as unknown as { count: number }[])[0]?.count ?? 0;
            const cover = p.cover_path ? covers[p.cover_path] : null;
            return (
              <Card key={p.id} className="group flex flex-col overflow-hidden transition-shadow hover:shadow-md">
                <Link href={`/projects/${p.id}`} className="flex gap-4 p-4">
                  <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-accent-soft text-accent">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt="" className="size-full object-cover" />
                    ) : (
                      <Podcast className="size-8" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold group-hover:text-accent">{p.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-secondary">{p.description || "Tanpa deskripsi"}</p>
                  </div>
                </Link>
                <div className="mt-auto flex items-center justify-between border-t border-border px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-secondary">
                    {p.category && <Badge>{p.category}</Badge>}
                    <span>{count} episode</span>
                    <span>· {formatDate(p.created_at)}</span>
                  </div>
                  <ProjectActions projectId={p.id} projectName={p.name} isAdmin={ctx.role === "admin"} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
