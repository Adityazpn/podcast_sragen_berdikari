import Link from "next/link";
import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { NewScriptForm } from "@/components/script/new-script-form";
import { ScriptRowActions } from "@/components/script/script-row-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { NativeSelect } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { listEpisodeOptions } from "@/lib/episodes";
import { formatReading } from "@/lib/script/blocks";
import { getStudioContext } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Script Studio" };

export default async function ScriptsPage({ searchParams }: { searchParams: Promise<{ episode?: string; status?: string }> }) {
  const { episode = "", status = "" } = await searchParams;
  const ctx = await getStudioContext();
  let q = ctx.supabase
    .from("scripts")
    .select("id, title, status, word_count, updated_at, episode:episodes(id, title, project_id, project:podcast_projects(name))")
    .eq("workspace_id", ctx.workspace.id)
    .order("updated_at", { ascending: false });
  if (/^[0-9a-f-]{36}$/i.test(episode)) q = q.eq("episode_id", episode);
  if (status === "draft" || status === "final") q = q.eq("status", status);
  const [{ data: scripts, error }, episodes] = await Promise.all([q, listEpisodeOptions(ctx)]);
  if (error) throw new Error(error.message);

  return (
    <>
      <PageHeader title="Script Studio" description="Tulis naskah podcast secara manual dengan format dialog HOST, GUEST, HOST NOTE, dan TRANSITION." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Script baru</CardTitle>
        </CardHeader>
        <CardContent>
          {episodes.length === 0 ? (
            <p className="text-sm text-secondary">
              Buat episode terlebih dahulu di{" "}
              <Link href="/projects" className="text-accent hover:underline">
                Podcast Projects
              </Link>
              .
            </p>
          ) : (
            <NewScriptForm episodes={episodes} defaultEpisode={episode || undefined} />
          )}
        </CardContent>
      </Card>

      <form className="mb-4 flex flex-wrap gap-2">
        <NativeSelect name="episode" defaultValue={episode} className="max-w-sm" aria-label="Filter episode">
          <option value="">Semua episode</option>
          {episodes.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="status" defaultValue={status} className="w-36" aria-label="Filter status">
          <option value="">Semua status</option>
          <option value="draft">Draft</option>
          <option value="final">Final</option>
        </NativeSelect>
        <Button type="submit" variant="outline">
          Terapkan
        </Button>
      </form>

      {scripts.length === 0 ? (
        <EmptyState icon={FileText} title="Belum ada script" description="Pilih episode dan template di atas untuk mulai menulis." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-secondary">
                <th className="px-4 py-2 font-medium">Judul</th>
                <th className="px-3 py-2 font-medium">Episode</th>
                <th className="px-3 py-2 font-medium">Kata</th>
                <th className="px-3 py-2 font-medium">Durasi baca</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Diperbarui</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {scripts.map((s) => {
                const ep = s.episode as unknown as { id: string; title: string; project: { name: string } } | null;
                return (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/scripts/${s.id}`} className="font-medium hover:text-accent">
                        {s.title}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-secondary">
                      {ep ? `${ep.project?.name ?? ""} · ${ep.title}` : "-"}
                    </td>
                    <td className="px-3 py-3 tabular-nums">{s.word_count.toLocaleString("id-ID")}</td>
                    <td className="px-3 py-3 text-secondary">{formatReading(s.word_count)}</td>
                    <td className="px-3 py-3">
                      <Badge tone={s.status === "final" ? "success" : "warning"}>{s.status === "final" ? "Final" : "Draft"}</Badge>
                    </td>
                    <td className="px-3 py-3 text-secondary">{formatDate(s.updated_at, true)}</td>
                    <td className="px-4 py-3 text-right">
                      <ScriptRowActions id={s.id} title={s.title} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
