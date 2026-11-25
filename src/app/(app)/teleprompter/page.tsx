import Link from "next/link";
import type { Metadata } from "next";
import { MonitorPlay } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatReading } from "@/lib/script/blocks";
import { getStudioContext } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Teleprompter" };

export default async function TeleprompterIndex() {
  const ctx = await getStudioContext();
  const { data, error } = await ctx.supabase
    .from("scripts")
    .select("id, title, status, word_count, updated_at, episode:episodes(title, recording_date, project:podcast_projects(name))")
    .eq("workspace_id", ctx.workspace.id)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (
    <>
      <PageHeader title="Teleprompter" description="Pilih naskah untuk ditampilkan saat rekaman. Layar gelap, teks besar, auto scroll." />
      {!data?.length ? (
        <EmptyState
          icon={MonitorPlay}
          title="Belum ada naskah"
          description="Tulis naskah di Script Studio terlebih dahulu."
          action={
            <Button asChild>
              <Link href="/scripts">Buka Script Studio</Link>
            </Button>
          }
        />
      ) : (
        <Card className="divide-y divide-border">
          {data.map((s) => {
            const ep = s.episode as unknown as { title: string; recording_date: string | null; project: { name: string } } | null;
            return (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{s.title}</p>
                  <p className="text-sm text-secondary">
                    {ep ? `${ep.project?.name} · ${ep.title}` : "-"} · {s.word_count.toLocaleString("id-ID")} kata (± {formatReading(s.word_count)})
                    {ep?.recording_date ? ` · Rekaman ${formatDate(ep.recording_date, true)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={s.status === "final" ? "success" : "warning"}>{s.status === "final" ? "Final" : "Draft"}</Badge>
                  <Button asChild size="sm" variant="accent">
                    <Link href={`/teleprompter/${s.id}`}>
                      <MonitorPlay /> Buka teleprompter
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </>
  );
}
