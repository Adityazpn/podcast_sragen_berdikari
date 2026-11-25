"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, Route, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addFlowItems, deleteFlowItem, reorderFlowItems, updateFlowItem } from "@/app/(app)/flow/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { SortableItem, SortableList } from "@/components/ui/sortable";
import { FLOW_TYPES } from "@/lib/constants";

export interface FlowItem {
  id: string;
  type: string;
  title: string;
  content: string;
}

const TYPE_COLOR: Record<string, string> = {
  opening_transition: "border-l-indigo-500",
  question_transition: "border-l-sky-500",
  topic_bridge: "border-l-violet-500",
  follow_up_prompt: "border-l-green-500",
  natural_prompt: "border-l-teal-500",
  backup_question: "border-l-amber-500",
  closing_transition: "border-l-rose-500",
};

export function FlowEditor({ episodeId, items: initial }: { episodeId: string; items: FlowItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [deleting, setDeleting] = useState<FlowItem | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => setItems(initial), [initial]);

  const add = (types: string[]) =>
    start(async () => {
      const res = await addFlowItems(episodeId, types);
      if (res?.error) toast.error(res.error);
      router.refresh();
    });

  const addMenu = (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button loading={pending}>
          <Plus /> Tambah bagian
        </Button>
      </DropdownTrigger>
      <DropdownContent>
        {FLOW_TYPES.map((t) => (
          <DropdownItem key={t.value} onSelect={() => add([t.value])}>
            {t.label}
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-secondary">Tulis transisi dan prompt percakapan, lalu seret untuk mengatur urutannya. Perubahan tersimpan otomatis.</p>
        {addMenu}
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={Route}
          title="Alur percakapan masih kosong"
          description="Mulai dari kerangka lengkap 7 bagian, atau tambahkan bagian satu per satu."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="accent" loading={pending} onClick={() => add(FLOW_TYPES.map((t) => t.value))}>
                Buat kerangka lengkap
              </Button>
              {addMenu}
            </div>
          }
        />
      ) : (
        <div className="space-y-3">
          <SortableList
            items={items}
            onReorder={(next) => {
              setItems(next);
              start(async () => {
                const res = await reorderFlowItems(episodeId, next.map((i) => i.id));
                if (res?.error) toast.error(res.error);
                router.refresh();
              });
            }}
          >
            {(item, i) => (
              <SortableItem key={item.id} id={item.id}>
                {(handle) => <FlowCard item={item} index={i} handle={handle} onDelete={() => setDeleting(item)} />}
              </SortableItem>
            )}
          </SortableList>
        </div>
      )}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Hapus bagian?"
        description={`Bagian "${deleting?.title || "tanpa judul"}" akan dihapus permanen.`}
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteFlowItem(deleting.id);
          if (res?.error) toast.error(res.error);
          router.refresh();
        }}
      />
    </>
  );
}

function FlowCard({ item, index, handle, onDelete }: { item: FlowItem; index: number; handle: React.ReactNode; onDelete: () => void }) {
  const [title, setTitle] = useState(item.title);
  const [content, setContent] = useState(item.content);
  const [type, setType] = useState(item.type);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ title, content, type });
  latest.current = { title, content, type };

  const save = async () => {
    setState("saving");
    const res = await updateFlowItem(item.id, latest.current);
    setState(res?.error ? "error" : "saved");
    if (res?.error) toast.error(res.error);
  };
  const schedule = () => {
    setState("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), 1200);
  };
  useEffect(() => () => {
    if (timer.current) {
      clearTimeout(timer.current);
      void updateFlowItem(item.id, latest.current);
    }
  }, [item.id]);

  return (
    <div className={`rounded-xl border border-l-4 border-border bg-surface p-4 shadow-sm ${TYPE_COLOR[type] ?? ""}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {handle}
        <span className="text-xs font-semibold text-secondary">{index + 1}</span>
        <NativeSelect
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            schedule();
          }}
          className="h-8 w-56 text-xs"
          aria-label="Jenis bagian"
        >
          {FLOW_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </NativeSelect>
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            schedule();
          }}
          placeholder="Judul bagian"
          className="h-8 min-w-40 flex-1"
          maxLength={200}
          aria-label="Judul bagian"
        />
        <span className="w-24 text-right text-xs">
          {state === "saving" && <Loader2 className="ml-auto size-3.5 animate-spin text-secondary" />}
          {state === "saved" && (
            <span className="inline-flex items-center gap-1 text-success">
              <Check className="size-3.5" /> Tersimpan
            </span>
          )}
          {state === "error" && <span className="text-danger">Gagal</span>}
        </span>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Hapus bagian">
          <Trash2 />
        </Button>
      </div>
      <Textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          schedule();
        }}
        onBlur={() => {
          if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
            void save();
          }
        }}
        rows={4}
        placeholder="Tulis kalimat atau prompt di sini..."
        maxLength={20000}
      />
    </div>
  );
}
