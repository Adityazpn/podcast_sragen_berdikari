"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addGeneratedQuestions, generateQuestions, type GeneratedQuestion } from "@/app/(app)/ai/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { QUESTION_CATEGORIES, labelOf } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { AiBadge, AiButton, AiDisabledNote } from "./ai-common";

type Item = GeneratedQuestion & { keep: boolean };

export function AiQuestions({ episodeId, enabled }: { episodeId: string; enabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(10);
  const [cats, setCats] = useState<string[]>([]);
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);

  const generate = async () => {
    setLoading(true);
    const res = await generateQuestions(episodeId, { count, categories: cats, instruction });
    setLoading(false);
    if (res.error) return toast.error(res.error);
    if (res.note) toast.info(res.note);
    setItems((res.questions ?? []).map((q) => ({ ...q, keep: true })));
  };

  const save = async () => {
    const chosen = (items ?? []).filter((i) => i.keep && i.question.trim());
    if (!chosen.length) return toast.error("Pilih minimal satu pertanyaan.");
    setSaving(true);
    const res = await addGeneratedQuestions(
      episodeId,
      chosen.map((q) => ({ question: q.question, category: q.category, purpose: q.purpose, follow_ups: q.follow_ups })),
    );
    setSaving(false);
    if (res.error) return toast.error(res.error);
    toast.success(`${chosen.length} pertanyaan ditambahkan`);
    setOpen(false);
    setItems(null);
    router.refresh();
  };

  const kept = items?.filter((i) => i.keep).length ?? 0;

  return (
    <>
      <AiButton label="Buat dengan AI" onClick={() => setOpen(true)} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Buat pertanyaan dengan AI" description="AI memakai data episode, narasumber, dan catatan riset." className="max-w-3xl">
          {!enabled ? (
            <AiDisabledNote />
          ) : items === null ? (
            <div className="space-y-4">
              <Field label="Jumlah pertanyaan" htmlFor="ai-count">
                <Input id="ai-count" type="number" min={1} max={30} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-28" />
              </Field>
              <div>
                <p className="mb-1.5 text-sm font-medium">Kategori (kosongkan untuk semua)</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUESTION_CATEGORIES.map((c) => {
                    const on = cats.includes(c.value);
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setCats(on ? cats.filter((x) => x !== c.value) : [...cats, c.value])}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs",
                          on ? "border-accent bg-accent-soft text-accent" : "border-border text-secondary hover:bg-muted",
                        )}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Field label="Instruksi tambahan (opsional)" htmlFor="ai-ins">
                <Textarea
                  id="ai-ins"
                  rows={3}
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="Contoh: fokus pada perjuangan awal usaha dan dampaknya untuk UMKM Sragen"
                />
              </Field>
              <div className="flex items-center justify-between gap-3">
                <AiBadge />
                <Button onClick={generate} loading={loading}>
                  {loading ? "Menyusun…" : "Buat pertanyaan"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
                {items.length === 0 && <p className="text-sm text-secondary">AI tidak menghasilkan pertanyaan. Coba ubah instruksi.</p>}
                {items.map((q, i) => (
                  <div key={i} className={cn("rounded-lg border p-3", q.keep ? "border-accent/40" : "border-border opacity-60")}>
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-1 accent-accent"
                        checked={q.keep}
                        aria-label="Pilih pertanyaan"
                        onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, keep: e.target.checked } : x)))}
                      />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <Textarea
                          rows={2}
                          value={q.question}
                          onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))}
                        />
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-secondary">
                          <Badge tone="accent">{labelOf(QUESTION_CATEGORIES, q.category)}</Badge>
                          {q.purpose}
                        </div>
                        {q.follow_ups.length > 0 && (
                          <ul className="list-disc pl-5 text-xs text-secondary">
                            {q.follow_ups.map((f, k) => (
                              <li key={k}>{f}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <AiBadge />
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" onClick={() => setItems(null)}>
                  Ubah permintaan
                </Button>
                <Button variant="outline" onClick={generate} loading={loading}>
                  Buat ulang
                </Button>
                <Button onClick={save} loading={saving} disabled={kept === 0}>
                  Tambahkan {kept} pertanyaan
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
