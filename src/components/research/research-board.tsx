"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Download, ExternalLink, FileText, Link2, MoreHorizontal, Pencil, Plus, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { deleteNote, deleteSource } from "@/app/(app)/research/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, Dialog, DialogContent } from "@/components/ui/dialog";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { labelOf, RESEARCH_CATEGORIES, SOURCE_TYPES } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import { NoteForm, SourceForm, type NoteData, type Option } from "./research-forms";

export interface SourceData {
  id: string;
  type: string;
  title: string;
  url: string | null;
  file_path: string | null;
  notes: string | null;
  created_at: string;
  guest: { name: string } | null;
  episode: { title: string } | null;
}

export type NoteRow = NoteData & { updated_at: string; guest: { name: string } | null; episode: { title: string } | null };

const SOURCE_ICON: Record<string, typeof Link2> = { pdf: FileText, document: FileText, youtube: Video, website: Link2, article: BookOpen, other: Link2 };

export function ResearchBoard({
  workspaceId,
  notes,
  sources,
  guests,
  episodes,
  filters,
  exportHref,
}: {
  workspaceId: string;
  notes: NoteRow[];
  sources: SourceData[];
  guests: Option[];
  episodes: Option[];
  filters: { guest?: string; episode?: string; category?: string };
  exportHref: string | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"notes" | "sources">("notes");
  const [editing, setEditing] = useState<NoteData | "new" | null>(null);
  const [addingSource, setAddingSource] = useState(false);
  const [del, setDel] = useState<{ kind: "note" | "source"; id: string; title: string } | null>(null);

  const grouped = RESEARCH_CATEGORIES.map((c) => ({ ...c, items: notes.filter((n) => n.category === c.value) })).filter((g) => g.items.length);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-lg bg-muted p-0.5 text-sm" role="tablist">
          {(["notes", "sources"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn("rounded-md px-3 py-1.5", tab === t ? "bg-surface font-medium shadow-sm" : "text-secondary")}
            >
              {t === "notes" ? `Catatan (${notes.length})` : `Sumber & file (${sources.length})`}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {exportHref && (
            <Button variant="outline" asChild>
              <a href={exportHref}>
                <Download /> Export PDF
              </a>
            </Button>
          )}
          {tab === "notes" ? (
            <Button onClick={() => setEditing("new")}>
              <Plus /> Tambah catatan
            </Button>
          ) : (
            <Button onClick={() => setAddingSource(true)}>
              <Plus /> Tambah sumber
            </Button>
          )}
        </div>
      </div>

      {tab === "notes" ? (
        grouped.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Belum ada catatan riset"
            description="Catat hasil riset narasumber secara manual per kategori."
            action={
              <Button onClick={() => setEditing("new")}>
                <Plus /> Tambah catatan
              </Button>
            }
          />
        ) : (
          <div className="space-y-6">
            {grouped.map((g) => (
              <section key={g.value}>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-secondary">
                  {g.label} <span className="font-normal">({g.items.length})</span>
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {g.items.map((n) => (
                    <Card key={n.id} className={cn("p-4", n.category === "sensitive_topics" && "border-danger/30")}>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold">{n.title}</h3>
                        <Dropdown>
                          <DropdownTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Aksi catatan">
                              <MoreHorizontal />
                            </Button>
                          </DropdownTrigger>
                          <DropdownContent>
                            <DropdownItem onSelect={() => setEditing(n)}>
                              <Pencil /> Edit
                            </DropdownItem>
                            <DropdownItem danger onSelect={() => setDel({ kind: "note", id: n.id, title: n.title })}>
                              <Trash2 /> Hapus
                            </DropdownItem>
                          </DropdownContent>
                        </Dropdown>
                      </div>
                      <p className="mt-1 line-clamp-[8] whitespace-pre-line text-sm leading-relaxed text-secondary">{n.content || "—"}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                        {n.guest && <Badge tone="accent">{n.guest.name}</Badge>}
                        {n.episode && <Badge>{n.episode.title}</Badge>}
                        <span className="text-secondary">· {formatDate(n.updated_at)}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )
      ) : sources.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="Belum ada sumber"
          description="Tambahkan link website, YouTube, artikel, atau unggah PDF dan dokumen."
          action={
            <Button onClick={() => setAddingSource(true)}>
              <Plus /> Tambah sumber
            </Button>
          }
        />
      ) : (
        <Card className="divide-y divide-border">
          {sources.map((s) => {
            const Icon = SOURCE_ICON[s.type] ?? Link2;
            const href = s.file_path ? `/api/files/research/${s.id}` : s.url!;
            return (
              <div key={s.id} className="flex items-start gap-3 px-4 py-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-secondary" />
                <div className="min-w-0 flex-1">
                  <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium hover:text-accent">
                    {s.title} <ExternalLink className="size-3" />
                  </a>
                  {s.url && <p className="truncate text-xs text-secondary">{s.url}</p>}
                  {s.notes && <p className="mt-1 text-sm text-secondary">{s.notes}</p>}
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                    <Badge>{labelOf(SOURCE_TYPES, s.type)}</Badge>
                    {s.guest && <Badge tone="accent">{s.guest.name}</Badge>}
                    {s.episode && <Badge>{s.episode.title}</Badge>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" aria-label="Hapus sumber" onClick={() => setDel({ kind: "source", id: s.id, title: s.title })}>
                  <Trash2 />
                </Button>
              </div>
            );
          })}
        </Card>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing !== null && (
          <DialogContent title={editing === "new" ? "Tambah catatan riset" : "Edit catatan riset"} className="max-w-2xl">
            <NoteForm
              note={editing === "new" ? undefined : editing}
              guests={guests}
              episodes={episodes}
              defaults={filters}
              onDone={() => {
                setEditing(null);
                router.refresh();
              }}
            />
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={addingSource} onOpenChange={setAddingSource}>
        {addingSource && (
          <DialogContent title="Tambah sumber riset" className="max-w-2xl">
            <SourceForm
              workspaceId={workspaceId}
              guests={guests}
              episodes={episodes}
              defaults={filters}
              onDone={() => {
                setAddingSource(false);
                router.refresh();
              }}
            />
          </DialogContent>
        )}
      </Dialog>

      <ConfirmDialog
        open={del !== null}
        onOpenChange={(o) => !o && setDel(null)}
        title={del?.kind === "source" ? "Hapus sumber?" : "Hapus catatan?"}
        description={`"${del?.title}" akan dihapus permanen${del?.kind === "source" ? ", termasuk file yang diunggah" : ""}.`}
        onConfirm={async () => {
          if (!del) return;
          const res = del.kind === "note" ? await deleteNote(del.id) : await deleteSource(del.id);
          if (res?.error) toast.error(res.error);
          else toast.success("Dihapus");
          router.refresh();
        }}
      />
    </>
  );
}
