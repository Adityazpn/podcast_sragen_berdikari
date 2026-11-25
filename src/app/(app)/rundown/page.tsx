import Link from "next/link";
import type { Metadata } from "next";
import { ListOrdered } from "lucide-react";
import { EpisodePicker } from "@/components/episodes/episode-picker";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { clock, sumMinutes } from "@/lib/duration";
import { listEpisodeOptions } from "@/lib/episodes";
import { getStudioContext } from "@/lib/session";

export const metadata: Metadata = { title: "Episode Rundown" };

export default async function RundownIndex() {
  const ctx = await getStudioContext();
  const [episodes, { data: rows }] = await Promise.all([
    listEpisodeOptions(ctx),
    ctx.supabase.from("rundown_segments").select("episode_id, duration_minutes").eq("workspace_id", ctx.workspace.id),
  ]);
  const totals = new Map<string, number[]>();
  (rows ?? []).forEach((r) => totals.set(r.episode_id, [...(totals.get(r.episode_id) ?? []), Number(r.duration_minutes)]));
  return (
    <>
      <PageHeader title="Episode Rundown" description="Atur jadwal dan durasi setiap segmen episode." />
      <div className="mb-6">
        <EpisodePicker options={episodes} base="/rundown" />
      </div>
      {episodes.length === 0 ? (
        <EmptyState icon={ListOrdered} title="Belum ada episode" description="Buat episode di Podcast Projects terlebih dahulu." />
      ) : (
        <Card className="divide-y divide-border">
          {episodes.map((e) => {
            const t = totals.get(e.id);
            return (
              <Link key={e.id} href={`/rundown/${e.id}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/40">
                <span className="font-medium">{e.label}</span>
                <span className="tabular-nums text-secondary">{t ? `${t.length} segmen · ${clock(sumMinutes(t))}` : "Belum ada rundown"}</span>
              </Link>
            );
          })}
        </Card>
      )}
    </>
  );
}
