import Link from "next/link";
import type { Metadata } from "next";
import { ListChecks } from "lucide-react";
import { EpisodePicker } from "@/components/episodes/episode-picker";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { listEpisodeOptions } from "@/lib/episodes";
import { getStudioContext } from "@/lib/session";

export const metadata: Metadata = { title: "Question Builder" };

export default async function QuestionsIndex() {
  const ctx = await getStudioContext();
  const [episodes, { data: rows }] = await Promise.all([
    listEpisodeOptions(ctx),
    ctx.supabase.from("questions").select("episode_id, status").eq("workspace_id", ctx.workspace.id),
  ]);
  const stats = new Map<string, { total: number; asked: number }>();
  (rows ?? []).forEach((r) => {
    const s = stats.get(r.episode_id) ?? { total: 0, asked: 0 };
    s.total++;
    if (r.status === "asked") s.asked++;
    stats.set(r.episode_id, s);
  });
  return (
    <>
      <PageHeader title="Question Builder" description="Pilih episode untuk menyusun daftar pertanyaan wawancara." />
      <div className="mb-6">
        <EpisodePicker options={episodes} base="/questions" />
      </div>
      {episodes.length === 0 ? (
        <EmptyState icon={ListChecks} title="Belum ada episode" description="Buat episode di Podcast Projects terlebih dahulu." />
      ) : (
        <Card className="divide-y divide-border">
          {episodes.map((e) => {
            const s = stats.get(e.id);
            return (
              <Link key={e.id} href={`/questions/${e.id}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/40">
                <span className="font-medium">{e.label}</span>
                <span className="text-secondary">{s ? `${s.asked}/${s.total} ditanyakan` : "Belum ada pertanyaan"}</span>
              </Link>
            );
          })}
        </Card>
      )}
    </>
  );
}
