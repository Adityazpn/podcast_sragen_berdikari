"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, ListOrdered, Plus, StickyNote, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addSegments, deleteSegment, reorderSegments, updateSegment } from "@/app/(app)/rundown/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Textarea } from "@/components/ui/input";
import { SortableItem, SortableList } from "@/components/ui/sortable";
import { clock, humanMinutes, sumMinutes } from "@/lib/duration";
import { cn } from "@/lib/utils";

export interface Segment {
  id: string;
  title: string;
  duration_minutes: number;
  notes: string | null;
}

export function RundownEditor({ episodeId, segments, target }: { episodeId: string; segments: Segment[]; target: number | null }) {
  const router = useRouter();
  const [items, setItems] = useState(segments);
  const [deleting, setDeleting] = useState<Segment | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => setItems(segments), [segments]);

  const total = sumMinutes(items.map((s) => s.duration_minutes));
  const diff = target ? total - target : 0;

  const add = (template: boolean) =>
    start(async () => {
      const res = await addSegments(episodeId, template);
      if (res?.error) toast.error(res.error);
      router.refresh();
    });

  const patchLocal = (id: string, patch: Partial<Segment>) => setItems((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  let elapsed = 0;

  return (
    <>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-secondary">Total durasi</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{clock(total)}</p>
          <p className="text-xs text-secondary">{humanMinutes(total)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-secondary">Target episode</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{target ? clock(target) : "-"}</p>
          <p className="text-xs text-secondary">{target ? humanMinutes(target) : "Atur di detail episode"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-secondary">Selisih</p>
          <p className={cn("mt-1 text-2xl font-semibold tabular-nums", !target ? "" : Math.abs(diff) < 0.01 ? "text-success" : diff > 0 ? "text-danger" : "text-warning")}>
            {target ? `${diff > 0 ? "+" : diff < 0 ? "−" : ""}${clock(Math.abs(diff))}` : "-"}
          </p>
          <p className="text-xs text-secondary">{!target ? "" : Math.abs(diff) < 0.01 ? "Pas dengan target" : diff > 0 ? "Melebihi target" : "Kurang dari target"}</p>
        </Card>
      </div>

      <div className="mb-3 flex flex-wrap justify-end gap-2">
        <Button variant="outline" asChild>
          <a href={`/api/export/rundown/${episodeId}?format=pdf`} aria-disabled={items.length === 0}>
            <Download /> Export PDF
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href={`/api/export/rundown/${episodeId}?format=txt`}>TXT</a>
        </Button>
        <Button onClick={() => add(false)} loading={pending}>
          <Plus /> Tambah segmen
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ListOrdered}
          title="Rundown masih kosong"
          description="Gunakan contoh rundown (Opening, Introduction, Ice Breaking, Main Discussion, Deep Conversation, Closing) lalu sesuaikan."
          action={
            <div className="flex gap-2">
              <Button variant="accent" onClick={() => add(true)} loading={pending}>
                Pakai contoh rundown
              </Button>
              <Button variant="outline" onClick={() => add(false)} loading={pending}>
                Segmen kosong
              </Button>
            </div>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[40px_70px_1fr_130px_44px] gap-2 border-b border-border bg-muted/50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-secondary sm:grid">
            <span />
            <span>Mulai</span>
            <span>Segmen</span>
            <span>Durasi (menit)</span>
            <span />
          </div>
          <SortableList
            items={items}
            onReorder={(next) => {
              setItems(next);
              start(async () => {
                const res = await reorderSegments(episodeId, next.map((s) => s.id));
                if (res?.error) toast.error(res.error);
                router.refresh();
              });
            }}
          >
            {(seg) => {
              const startAt = elapsed;
              elapsed += Number(seg.duration_minutes) || 0;
              return (
                <SortableItem key={seg.id} id={seg.id} className="border-b border-border bg-surface last:border-0">
                  {(handle) => (
                    <SegmentRow seg={seg} startAt={startAt} handle={handle} onLocal={(p) => patchLocal(seg.id, p)} onDelete={() => setDeleting(seg)} />
                  )}
                </SortableItem>
              );
            }}
          </SortableList>
          <div className="flex items-center justify-between bg-muted/50 px-4 py-2.5 text-sm font-semibold">
            <span>Total</span>
            <span className="tabular-nums">
              {clock(total)} <span className="font-normal text-secondary">({humanMinutes(total)})</span>
            </span>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Hapus segmen?"
        description={`Segmen "${deleting?.title}" akan dihapus.`}
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteSegment(deleting.id);
          if (res?.error) toast.error(res.error);
          router.refresh();
        }}
      />
    </>
  );
}

function SegmentRow({
  seg,
  startAt,
  handle,
  onLocal,
  onDelete,
}: {
  seg: Segment;
  startAt: number;
  handle: React.ReactNode;
  onLocal: (p: Partial<Segment>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(seg.title);
  const [duration, setDuration] = useState(String(seg.duration_minutes));
  const [notes, setNotes] = useState(seg.notes ?? "");
  const [showNotes, setShowNotes] = useState(!!seg.notes);
  const saved = useRef({ title: seg.title, duration: String(seg.duration_minutes), notes: seg.notes ?? "" });

  const commit = async (patch: { title?: string; duration_minutes?: number; notes?: string | null }) => {
    const res = await updateSegment(seg.id, patch);
    if (res?.error) toast.error(res.error);
  };

  return (
    <div className="px-3 py-2">
      <div className="grid grid-cols-[40px_1fr_44px] items-center gap-2 sm:grid-cols-[40px_70px_1fr_130px_44px]">
        <div className="flex justify-center">{handle}</div>
        <span className="hidden text-sm tabular-nums text-secondary sm:block">{clock(startAt)}</span>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            const t = title.trim();
            if (!t) return setTitle(saved.current.title);
            if (t !== saved.current.title) {
              saved.current.title = t;
              onLocal({ title: t });
              void commit({ title: t });
            }
          }}
          className="h-9"
          aria-label="Nama segmen"
          maxLength={200}
        />
        <div className="col-span-3 flex items-center gap-2 pl-12 sm:col-span-1 sm:pl-0">
          <Input
            type="number"
            min={0}
            max={1440}
            step={0.5}
            value={duration}
            onChange={(e) => {
              setDuration(e.target.value);
              const n = Number(e.target.value);
              if (Number.isFinite(n) && n >= 0) onLocal({ duration_minutes: n });
            }}
            onBlur={() => {
              const n = Number(duration);
              if (!Number.isFinite(n) || n < 0 || duration.trim() === "") {
                setDuration(saved.current.duration);
                onLocal({ duration_minutes: Number(saved.current.duration) });
                return toast.error("Durasi harus angka 0 atau lebih");
              }
              if (duration !== saved.current.duration) {
                saved.current.duration = duration;
                void commit({ duration_minutes: n });
              }
            }}
            className="h-9 w-24 tabular-nums"
            aria-label="Durasi (menit)"
          />
          <Button variant="ghost" size="icon" onClick={() => setShowNotes((v) => !v)} aria-label="Catatan segmen" className={cn(notes && "text-accent")}>
            <StickyNote />
          </Button>
        </div>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Hapus segmen" className="row-start-1 sm:row-auto">
          <Trash2 />
        </Button>
      </div>
      {showNotes && (
        <div className="mt-2 pl-12 sm:pl-[122px] sm:pr-[52px]">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              if (notes !== saved.current.notes) {
                saved.current.notes = notes;
                void commit({ notes: notes.trim() ? notes : null });
              }
            }}
            rows={2}
            placeholder="Catatan segmen (opsional)"
            maxLength={5000}
          />
        </div>
      )}
    </div>
  );
}
