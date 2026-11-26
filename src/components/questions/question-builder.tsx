"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Circle,
  Copy,
  CornerDownRight,
  Download,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  addFollowUp,
  deleteFollowUp,
  deleteQuestion,
  duplicateQuestion,
  reorderQuestions,
  updateFollowUp,
  updateQuestionFlags,
} from "@/app/(app)/questions/actions";
import { Badge } from "@/components/ui/badge";
import { AiQuestions } from "@/components/ai/ai-questions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogContent } from "@/components/ui/dialog";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SortableItem, SortableList } from "@/components/ui/sortable";
import { labelOf, QUESTION_CATEGORIES, QUESTION_PRIORITIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { QuestionForm, type QuestionData } from "./question-form";

type Result = { error?: string } | null | undefined;

export function QuestionBuilder({ episodeId, questions, aiEnabled }: { episodeId: string; questions: QuestionData[]; aiEnabled: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState(questions);
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState<QuestionData | "new" | null>(null);
  const [deleting, setDeleting] = useState<QuestionData | null>(null);
  const [, start] = useTransition();

  useEffect(() => setItems(questions), [questions]);

  const run = useCallback(
    (fn: () => Promise<Result>, success?: string) =>
      start(async () => {
        const res = await fn();
        if (res?.error) toast.error(res.error);
        else if (success) toast.success(success);
        router.refresh();
      }),
    [router],
  );

  const visible = filter === "all" ? items : items.filter((q) => q.category === filter);
  const counts = items.reduce<Record<string, number>>((acc, q) => ({ ...acc, [q.category]: (acc[q.category] ?? 0) + 1 }), {});
  const asked = items.filter((q) => q.status === "asked").length;

  const onReorder = (next: QuestionData[]) => {
    setItems(next);
    run(() => reorderQuestions(episodeId, next.map((q) => q.id)));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="space-y-1 lg:sticky lg:top-20 lg:h-fit">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cn("flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm", filter === "all" ? "bg-accent-soft font-medium text-accent" : "hover:bg-muted")}
        >
          Semua pertanyaan <span className="text-xs">{items.length}</span>
        </button>
        {QUESTION_CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setFilter(c.value)}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm",
              filter === c.value ? "bg-accent-soft font-medium text-accent" : "text-secondary hover:bg-muted hover:text-primary",
            )}
          >
            {c.label} <span className="text-xs">{counts[c.value] ?? 0}</span>
          </button>
        ))}
      </aside>

      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-secondary">
            {asked} dari {items.length} pertanyaan sudah ditanyakan.
            {filter !== "all" && " Urutan hanya bisa diubah pada tampilan Semua pertanyaan."}
          </p>
          <div className="flex gap-2">
            <Dropdown>
              <DropdownTrigger asChild>
                <Button variant="outline" disabled={items.length === 0}>
                  <Download /> Export
                </Button>
              </DropdownTrigger>
              <DropdownContent>
                <DropdownItem asChild>
                  <a href={`/api/export/questions/${episodeId}?format=pdf`}>PDF</a>
                </DropdownItem>
                <DropdownItem asChild>
                  <a href={`/api/export/questions/${episodeId}?format=docx`}>DOCX (Word)</a>
                </DropdownItem>
                <DropdownItem asChild>
                  <a href={`/api/export/questions/${episodeId}?format=txt`}>TXT</a>
                </DropdownItem>
              </DropdownContent>
            </Dropdown>
            <AiQuestions episodeId={episodeId} enabled={aiEnabled} />
            <Button onClick={() => setEditing("new")}>
              <Plus /> Tambah pertanyaan
            </Button>
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title={filter === "all" ? "Belum ada pertanyaan" : `Belum ada ${labelOf(QUESTION_CATEGORIES, filter)}`}
            description="Susun daftar pertanyaan wawancara secara manual."
            action={
              <Button onClick={() => setEditing("new")}>
                <Plus /> Tambah pertanyaan
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            <SortableList items={visible} onReorder={onReorder} disabled={filter !== "all"}>
              {(q) => (
                <SortableItem key={q.id} id={q.id} disabled={filter !== "all"}>
                  {(handle) => (
                    <QuestionCard
                      q={q}
                      number={items.findIndex((x) => x.id === q.id) + 1}
                      handle={handle}
                      onEdit={() => setEditing(q)}
                      onDelete={() => setDeleting(q)}
                      run={run}
                    />
                  )}
                </SortableItem>
              )}
            </SortableList>
          </div>
        )}
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing !== null && (
          <DialogContent title={editing === "new" ? "Tambah pertanyaan" : "Edit pertanyaan"} className="max-w-2xl">
            <QuestionForm
              episodeId={episodeId}
              question={editing === "new" ? undefined : editing}
              defaultCategory={filter !== "all" ? filter : undefined}
              onDone={() => {
                setEditing(null);
                router.refresh();
              }}
            />
          </DialogContent>
        )}
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Hapus pertanyaan?"
        description="Pertanyaan beserta pertanyaan lanjutannya akan dihapus permanen."
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteQuestion(deleting.id);
          if (res?.error) toast.error(res.error);
          else toast.success("Pertanyaan dihapus");
          router.refresh();
        }}
      />
    </div>
  );
}

function QuestionCard({
  q,
  number,
  handle,
  onEdit,
  onDelete,
  run,
}: {
  q: QuestionData;
  number: number;
  handle: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  run: (fn: () => Promise<Result>, success?: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const isAsked = q.status === "asked";
  const prio = QUESTION_PRIORITIES.find((p) => p.value === q.priority);

  return (
    <div
      className={cn(
        "rounded-xl border bg-surface p-4 shadow-sm",
        q.priority === "important" ? "border-danger/30" : "border-border",
        isAsked && "bg-muted/40",
      )}
    >
      <div className="flex gap-2">
        <div className="flex flex-col items-center gap-1 pt-0.5">
          {handle}
          <span className="text-xs font-semibold text-secondary">{number}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <Badge>{labelOf(QUESTION_CATEGORIES, q.category)}</Badge>
            {prio && q.priority !== "normal" && <Badge tone={prio.tone}>{prio.label}</Badge>}
            {q.status === "skipped" && <Badge tone="warning">Dilewati</Badge>}
          </div>
          <p className={cn("whitespace-pre-line font-medium leading-relaxed", isAsked && "text-secondary line-through decoration-secondary/40")}>{q.question}</p>
          {q.purpose && (
            <p className="mt-1.5 text-sm text-secondary">
              <span className="font-medium text-primary">Tujuan:</span> {q.purpose}
            </p>
          )}
          {q.host_notes && (
            <p className="mt-1 rounded-md bg-amber-50 px-2 py-1 text-sm text-amber-800">
              <span className="font-medium">Host note:</span> {q.host_notes}
            </p>
          )}

          {(q.follow_ups.length > 0 || adding) && (
            <ul className="mt-3 space-y-1.5 border-l-2 border-border pl-3">
              {q.follow_ups.map((f) => (
                <li key={f.id} className="group flex items-start gap-2 text-sm">
                  <button
                    type="button"
                    aria-label={f.status === "asked" ? "Tandai belum ditanyakan" : "Tandai sudah ditanyakan"}
                    onClick={() => run(() => updateFollowUp(f.id, { status: f.status === "asked" ? "not_asked" : "asked" }))}
                    className="mt-0.5 text-secondary hover:text-success"
                  >
                    {f.status === "asked" ? <CheckCircle2 className="size-4 text-success" /> : <CornerDownRight className="size-4" />}
                  </button>
                  <span className={cn("flex-1", f.status === "asked" && "text-secondary line-through")}>{f.question}</span>
                  <button
                    type="button"
                    aria-label="Hapus pertanyaan lanjutan"
                    onClick={() => run(() => deleteFollowUp(f.id))}
                    className="text-secondary opacity-0 hover:text-danger focus:opacity-100 group-hover:opacity-100"
                  >
                    <X className="size-4" />
                  </button>
                </li>
              ))}
              {adding && (
                <li>
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!text.trim()) return;
                      const value = text;
                      setText("");
                      run(() => addFollowUp(q.id, value));
                    }}
                  >
                    <Input
                      autoFocus
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Pertanyaan lanjutan..."
                      className="h-8"
                      onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
                    />
                    <Button type="submit" size="sm">
                      <Check />
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
                      Selesai
                    </Button>
                  </form>
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 items-start gap-1">
          <Button
            variant={isAsked ? "outline" : "ghost"}
            size="sm"
            onClick={() => run(() => updateQuestionFlags(q.id, { status: isAsked ? "not_asked" : "asked" }))}
            aria-label={isAsked ? "Tandai belum ditanyakan" : "Tandai sudah ditanyakan"}
            className={cn(isAsked && "text-success")}
          >
            {isAsked ? <CheckCircle2 /> : <Circle />}
            <span className="hidden sm:inline">{isAsked ? "Asked" : "Not asked"}</span>
          </Button>
          <Dropdown>
            <DropdownTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Aksi pertanyaan">
                <MoreHorizontal />
              </Button>
            </DropdownTrigger>
            <DropdownContent>
              <DropdownItem onSelect={onEdit}>
                <Pencil /> Edit
              </DropdownItem>
              <DropdownItem onSelect={() => setAdding(true)}>
                <CornerDownRight /> Tambah follow-up
              </DropdownItem>
              <DropdownItem onSelect={() => run(() => duplicateQuestion(q.id), "Pertanyaan diduplikasi")}>
                <Copy /> Duplikasi
              </DropdownItem>
              <DropdownSeparator />
              <DropdownLabel>Prioritas</DropdownLabel>
              <DropdownItem onSelect={() => run(() => updateQuestionFlags(q.id, { priority: "important" }))}>
                <Star /> Tandai penting
              </DropdownItem>
              <DropdownItem onSelect={() => run(() => updateQuestionFlags(q.id, { priority: "optional" }))}>
                <Circle /> Tandai opsional
              </DropdownItem>
              <DropdownItem onSelect={() => run(() => updateQuestionFlags(q.id, { priority: "normal" }))}>
                <Circle /> Prioritas normal
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem onSelect={() => run(() => updateQuestionFlags(q.id, { status: "skipped" }))}>
                <X /> Tandai dilewati
              </DropdownItem>
              <DropdownItem danger onSelect={onDelete}>
                <Trash2 /> Hapus
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
        </div>
      </div>
    </div>
  );
}
