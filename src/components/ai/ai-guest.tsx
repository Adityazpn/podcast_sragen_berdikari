"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { analyzeGuest, saveGuestAnalysis, type GuestAnalysis } from "@/app/(app)/ai/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/input";
import { AiBadge, AiButton, AiDisabledNote } from "./ai-common";

const LISTS: [keyof GuestAnalysis, string][] = [
  ["expertise", "Keahlian"],
  ["interesting_angles", "Sudut cerita menarik"],
  ["topics_to_explore", "Topik untuk digali"],
  ["sensitive_topics", "Topik sensitif"],
  ["facts_to_verify", "Perlu dicek ulang"],
  ["suggested_questions", "Usulan pertanyaan"],
];

export function AiGuestAnalysis({ guestId, enabled }: { guestId: string; enabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<GuestAnalysis | null>(null);

  const run = async () => {
    setLoading(true);
    const res = await analyzeGuest(guestId, instruction);
    setLoading(false);
    if (res.error) return toast.error(res.error);
    if (res.note) toast.info(res.note);
    setResult(res.analysis ?? null);
  };

  const save = async () => {
    if (!result) return;
    setSaving(true);
    const res = await saveGuestAnalysis(guestId, result);
    setSaving(false);
    if (res.error) return toast.error(res.error);
    toast.success("Analisa disimpan ke Research Notes");
    setOpen(false);
    setResult(null);
    router.refresh();
  };

  return (
    <>
      <AiButton label="Analisa AI" onClick={() => setOpen(true)} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Analisa narasumber dengan AI" description="AI membaca profil, episode, dan catatan riset narasumber ini." className="max-w-3xl">
          {!enabled ? (
            <AiDisabledNote />
          ) : !result ? (
            <div className="space-y-4">
              <Field label="Fokus analisa (opsional)" htmlFor="ai-guest-ins">
                <Textarea
                  id="ai-guest-ins"
                  rows={3}
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="Contoh: siapkan untuk episode tentang ekonomi kreatif anak muda Sragen"
                />
              </Field>
              <div className="flex items-center justify-between gap-3">
                <AiBadge />
                <Button onClick={run} loading={loading}>
                  {loading ? "Menganalisa…" : "Mulai analisa"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1 text-sm">
                <p className="leading-relaxed">{result.summary}</p>
                {LISTS.map(([k, label]) => {
                  const items = result[k] as string[];
                  if (!items.length) return null;
                  return (
                    <div key={k}>
                      <p className="mb-1 font-medium">{label}</p>
                      <ul className="list-disc space-y-0.5 pl-5 text-secondary">
                        {items.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
              <AiBadge />
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" onClick={() => setResult(null)}>
                  Ubah fokus
                </Button>
                <Button variant="outline" onClick={run} loading={loading}>
                  Analisa ulang
                </Button>
                <Button onClick={save} loading={saving}>
                  Simpan ke Research Notes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
