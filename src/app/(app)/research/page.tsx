import type { Metadata } from "next";
import { ResearchBoard, type NoteRow, type SourceData } from "@/components/research/research-board";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { RESEARCH_CATEGORIES } from "@/lib/constants";
import { listEpisodeOptions } from "@/lib/episodes";
import { getStudioContext } from "@/lib/session";
import Link from "next/link";

export const metadata: Metadata = { title: "Research Notes" };

const isUuid = (v?: string) => !!v && /^[0-9a-f-]{36}$/i.test(v);

export default async function ResearchPage({ searchParams }: { searchParams: Promise<{ guest?: string; episode?: string; category?: string; q?: string }> }) {
  const sp = await searchParams;
  const guest = isUuid(sp.guest) ? sp.guest : undefined;
  const episode = isUuid(sp.episode) ? sp.episode : undefined;
  const category = RESEARCH_CATEGORIES.some((c) => c.value === sp.category) ? sp.category : undefined;
  const q = (sp.q ?? "").trim().replace(/[%,()]/g, " ");
  const ctx = await getStudioContext();

  let notesQ = ctx.supabase
    .from("research_notes")
    .select("id, category, title, content, guest_id, episode_id, updated_at, guest:guests(name), episode:episodes(title)")
    .eq("workspace_id", ctx.workspace.id)
    .order("position")
    .order("updated_at", { ascending: false });
  let sourcesQ = ctx.supabase
    .from("research_sources")
    .select("id, type, title, url, file_path, notes, created_at, guest:guests(name), episode:episodes(title)")
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false });
  if (guest) {
    notesQ = notesQ.eq("guest_id", guest);
    sourcesQ = sourcesQ.eq("guest_id", guest);
  }
  if (episode) {
    notesQ = notesQ.eq("episode_id", episode);
    sourcesQ = sourcesQ.eq("episode_id", episode);
  }
  if (category) notesQ = notesQ.eq("category", category);
  if (q) {
    notesQ = notesQ.or(`title.ilike.%${q}%,content.ilike.%${q}%`);
    sourcesQ = sourcesQ.or(`title.ilike.%${q}%,notes.ilike.%${q}%`);
  }

  const [notes, sources, { data: guests }, episodes] = await Promise.all([
    notesQ,
    sourcesQ,
    ctx.supabase.from("guests").select("id, name").eq("workspace_id", ctx.workspace.id).order("name"),
    listEpisodeOptions(ctx),
  ]);
  if (notes.error) throw new Error(notes.error.message);
  if (sources.error) throw new Error(sources.error.message);

  const guestOptions = (guests ?? []).map((g) => ({ id: g.id, label: g.name }));
  const exportParams = new URLSearchParams();
  if (guest) exportParams.set("guest", guest);
  if (episode) exportParams.set("episode", episode);
  const filtered = guest || episode || category || q;

  return (
    <>
      <PageHeader title="Research Notes" description="Simpan hasil riset narasumber secara manual. Tidak ada pencarian otomatis." />
      <form className="mb-6 grid gap-2 sm:grid-cols-[1fr_200px_240px_200px_auto]">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Cari judul atau isi..." className="h-9 rounded-lg border border-border bg-surface px-3 text-sm" aria-label="Cari" />
        <NativeSelect name="guest" defaultValue={guest ?? ""} aria-label="Filter narasumber">
          <option value="">Semua narasumber</option>
          {guestOptions.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="episode" defaultValue={episode ?? ""} aria-label="Filter episode">
          <option value="">Semua episode</option>
          {episodes.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="category" defaultValue={category ?? ""} aria-label="Filter kategori">
          <option value="">Semua kategori</option>
          {RESEARCH_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </NativeSelect>
        <div className="flex gap-2">
          <Button type="submit" variant="outline">
            Terapkan
          </Button>
          {filtered && (
            <Button asChild variant="ghost">
              <Link href="/research">Reset</Link>
            </Button>
          )}
        </div>
      </form>
      <ResearchBoard
        workspaceId={ctx.workspace.id}
        notes={(notes.data ?? []) as unknown as NoteRow[]}
        sources={(sources.data ?? []) as unknown as SourceData[]}
        guests={guestOptions}
        episodes={episodes}
        filters={{ guest, episode, category }}
        exportHref={guest || episode ? `/api/export/research?${exportParams}` : null}
      />
    </>
  );
}
