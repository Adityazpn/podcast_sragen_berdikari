"use client";

import { useEffect, useState } from "react";
import { History, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getScriptVersion, listScriptVersions, restoreScriptVersion, type VersionItem } from "@/app/(app)/scripts/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { blocksToText, docToBlocks } from "@/lib/script/blocks";
import type { TNode } from "@/lib/script/types";
import { cn } from "@/lib/utils";

export function VersionHistory({
  scriptId,
  open,
  onOpenChange,
  beforeRestore,
  onRestored,
}: {
  scriptId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  beforeRestore: () => Promise<boolean>;
  onRestored: (content: TNode, savedAt: string) => void;
}) {
  const [versions, setVersions] = useState<VersionItem[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!open) return;
    setVersions(null);
    setSelected(null);
    setPreview(null);
    void listScriptVersions(scriptId).then((res) => {
      if (res.error) toast.error(res.error);
      setVersions(res.versions ?? []);
    });
  }, [open, scriptId]);

  const pick = async (id: string) => {
    setSelected(id);
    setLoadingPreview(true);
    const res = await getScriptVersion(id);
    setLoadingPreview(false);
    if (res.error) return toast.error(res.error);
    setPreview(blocksToText(docToBlocks(res.content as TNode)));
  };

  const restore = async () => {
    if (!selected) return;
    setRestoring(true);
    const ok = await beforeRestore();
    if (!ok) {
      setRestoring(false);
      return;
    }
    const res = await restoreScriptVersion(selected);
    setRestoring(false);
    if (res.error) return toast.error(res.error);
    onRestored(res.content as TNode, res.savedAt!);
    toast.success("Versi dipulihkan. Isi sebelumnya tersimpan di riwayat.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Riwayat versi" description="Versi tersimpan setiap simpan manual dan otomatis tiap 10 menit saat menulis." className="max-w-4xl">
        <div className="grid h-[60vh] gap-4 md:grid-cols-[260px_1fr]">
          <div className="overflow-y-auto rounded-lg border border-border">
            {versions === null ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="size-5 animate-spin text-secondary" />
              </div>
            ) : versions.length === 0 ? (
              <p className="p-4 text-sm text-secondary">Belum ada versi tersimpan. Tekan Simpan untuk membuat versi pertama.</p>
            ) : (
              <ul>
                {versions.map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => pick(v.id)}
                      className={cn("w-full border-b border-border px-3 py-2 text-left text-sm hover:bg-muted", selected === v.id && "bg-accent-soft")}
                    >
                      <span className="block font-medium">
                        {new Date(v.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="block text-xs text-secondary">
                        {v.note ?? "Versi"} · {v.word_count.toLocaleString("id-ID")} kata · {v.author ?? "—"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex min-h-0 flex-col rounded-lg border border-border">
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {!selected ? (
                <div className="flex h-full flex-col items-center justify-center text-sm text-secondary">
                  <History className="mb-2 size-6" /> Pilih versi untuk melihat isinya.
                </div>
              ) : loadingPreview ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="size-5 animate-spin text-secondary" />
                </div>
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{preview}</pre>
              )}
            </div>
            <div className="flex justify-end border-t border-border p-3">
              <Button onClick={restore} disabled={!selected || loadingPreview} loading={restoring}>
                <RotateCcw /> Pulihkan versi ini
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
