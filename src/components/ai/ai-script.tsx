"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { toast } from "sonner";
import { generateScriptText, type ScriptBlock } from "@/app/(app)/ai/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, NativeSelect, Textarea } from "@/components/ui/input";
import { DIALOGUE_ROLES } from "@/lib/constants";
import { AiBadge, AiDisabledNote } from "./ai-common";

/** Ambil teks di sekitar kursor (±1.500 karakter) sebagai konteks. */
function surrounding(editor: Editor) {
  const { from } = editor.state.selection;
  const size = editor.state.doc.content.size;
  const before = editor.state.doc.textBetween(Math.max(0, from - 1500), from, "\n");
  const after = editor.state.doc.textBetween(from, Math.min(size, from + 1500), "\n");
  return `${before}\n[POSISI KURSOR]\n${after}`;
}

export function AiScriptDialog({
  scriptId,
  editor,
  enabled,
  open,
  onOpenChange,
}: {
  scriptId: string;
  editor: Editor | null;
  enabled: boolean;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [instruction, setInstruction] = useState("");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [loading, setLoading] = useState(false);
  const [blocks, setBlocks] = useState<ScriptBlock[] | null>(null);

  const run = async () => {
    if (!editor) return;
    setLoading(true);
    const res = await generateScriptText(scriptId, { instruction, surrounding: surrounding(editor), length });
    setLoading(false);
    if (res.error) return toast.error(res.error);
    setBlocks(res.blocks ?? []);
  };

  const insert = () => {
    if (!editor || !blocks?.length) return;
    editor
      .chain()
      .focus()
      .insertContent(blocks.map((b) => ({ type: "dialogue", attrs: { role: b.role }, content: b.text ? [{ type: "text", text: b.text }] : [] })))
      .run();
    toast.success("Teks disisipkan di posisi kursor");
    setBlocks(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Susun teks dengan AI" description="Teks akan disisipkan di posisi kursor sebagai blok HOST / GUEST / HOST NOTE / TRANSITION." className="max-w-3xl">
        {!enabled ? (
          <AiDisabledNote />
        ) : !blocks ? (
          <div className="space-y-4">
            <Field label="Apa yang ingin ditulis?" htmlFor="ai-script-ins">
              <Textarea
                id="ai-script-ins"
                rows={4}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Contoh: tulis opening hangat yang memperkenalkan narasumber dan topik batik Sragen, lalu transisi ke ice breaking"
              />
            </Field>
            <Field label="Panjang" htmlFor="ai-script-len">
              <NativeSelect id="ai-script-len" value={length} onChange={(e) => setLength(e.target.value as typeof length)} className="w-48">
                <option value="short">Pendek (2–4 blok)</option>
                <option value="medium">Sedang (5–8 blok)</option>
                <option value="long">Panjang (9–14 blok)</option>
              </NativeSelect>
            </Field>
            <div className="flex items-center justify-between gap-3">
              <AiBadge />
              <Button onClick={run} loading={loading} disabled={instruction.trim().length < 5}>
                {loading ? "Menyusun…" : "Susun teks"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
              {blocks.length === 0 && <p className="text-sm text-secondary">AI tidak menghasilkan teks. Coba ubah instruksi.</p>}
              {blocks.map((b, i) => (
                <div key={i} className="dialogue rounded-md border border-border p-2" data-role={b.role}>
                  <div className="mb-1 flex items-center gap-2">
                    <NativeSelect
                      aria-label="Peran"
                      value={b.role}
                      onChange={(e) => setBlocks(blocks.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}
                      className="h-7 w-36 text-xs"
                    >
                      {DIALOGUE_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </NativeSelect>
                    <button type="button" className="ml-auto text-xs text-danger hover:underline" onClick={() => setBlocks(blocks.filter((_, j) => j !== i))}>
                      Buang
                    </button>
                  </div>
                  <Textarea rows={2} value={b.text} onChange={(e) => setBlocks(blocks.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
                </div>
              ))}
            </div>
            <AiBadge />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setBlocks(null)}>
                Ubah instruksi
              </Button>
              <Button variant="outline" onClick={run} loading={loading}>
                Susun ulang
              </Button>
              <Button onClick={insert} disabled={!blocks.length}>
                Sisipkan ke naskah
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
