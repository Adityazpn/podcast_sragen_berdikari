"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckSquare, Clock, ListChecks, MonitorPlay, Pause, Play, Plus, RotateCcw, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addDefaultChecklist, addRecordingNote, deleteRecordingNote, updateRecordingNote } from "@/app/(app)/recording/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { RECORDING_NOTE_TYPES } from "@/lib/constants";
import { clock } from "@/lib/duration";
import { cn } from "@/lib/utils";

export interface RecNote {
  id: string;
  type: string;
  content: string;
  timestamp_label: string | null;
  is_done: boolean;
  created_at: string;
  author: string | null;
}

const LIVE_TYPES = ["live", "important_moment", "additional_question", "revisit_topic", "timestamp"] as const;

/** Stopwatch sesi rekaman; disimpan di localStorage agar tetap jalan saat halaman dimuat ulang. */
function useStopwatch(key: string) {
  const [state, setState] = useState<{ startedAt: number | null; acc: number }>({ startedAt: null, acc: 0 });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? "null");
      if (saved) setState(saved);
    } catch {}
  }, [key]);
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);
  useEffect(() => {
    if (!state.startedAt) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [state.startedAt]);
  const elapsedMs = state.acc + (state.startedAt ? now - state.startedAt : 0);
  return {
    running: !!state.startedAt,
    minutes: elapsedMs / 60000,
    start: () => setState((s) => (s.startedAt ? s : { ...s, startedAt: Date.now() })),
    pause: () => setState((s) => (s.startedAt ? { startedAt: null, acc: s.acc + Date.now() - s.startedAt } : s)),
    reset: () => setState({ startedAt: null, acc: 0 }),
  };
}

export function RecordingNotes({ episodeId, notes, scriptId }: { episodeId: string; notes: RecNote[]; scriptId: string | null }) {
  const router = useRouter();
  const sw = useStopwatch(`rec-timer-${episodeId}`);
  const [type, setType] = useState<string>("live");
  const [text, setText] = useState("");
  const [withTime, setWithTime] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [checkText, setCheckText] = useState("");
  const [postText, setPostText] = useState("");
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const run = (fn: () => Promise<{ error?: string } | null>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (res?.error) toast.error(res.error);
      else after?.();
      router.refresh();
    });

  const submitLive = () => {
    const content = text.trim();
    if (!content) return;
    const ts = withTime && sw.minutes > 0 ? clock(sw.minutes) : undefined;
    run(() => addRecordingNote(episodeId, { type, content, timestamp_label: ts }), () => {
      setText("");
      inputRef.current?.focus();
    });
  };

  const live = notes.filter((n) => (LIVE_TYPES as readonly string[]).includes(n.type)).filter((n) => filter === "all" || n.type === filter);
  const checklist = notes.filter((n) => n.type === "checklist");
  const post = notes.filter((n) => n.type === "post_recording");
  const done = checklist.filter((c) => c.is_done).length;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-secondary" />
              <span className={cn("text-3xl font-semibold tabular-nums", sw.running && "text-danger")}>{clock(sw.minutes)}</span>
              {sw.running && <span className="size-2.5 animate-pulse rounded-full bg-danger" aria-label="Sedang merekam" />}
            </div>
            <div className="flex gap-2">
              {sw.running ? (
                <Button variant="outline" onClick={sw.pause}>
                  <Pause /> Jeda
                </Button>
              ) : (
                <Button variant="danger" onClick={sw.start}>
                  <Play /> {sw.minutes > 0 ? "Lanjutkan" : "Mulai sesi"}
                </Button>
              )}
              <Button variant="ghost" onClick={sw.reset} disabled={sw.running || sw.minutes === 0}>
                <RotateCcw /> Reset
              </Button>
            </div>
            {scriptId && (
              <Button asChild variant="outline" className="ml-auto">
                <Link href={`/teleprompter/${scriptId}`} target="_blank">
                  <MonitorPlay /> Buka teleprompter
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Jenis catatan">
              {RECORDING_NOTE_TYPES.filter((t) => (LIVE_TYPES as readonly string[]).includes(t.value)).map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={type === t.value}
                  onClick={() => setType(t.value)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium",
                    type === t.value ? "border-accent bg-accent-soft text-accent" : "border-border text-secondary hover:bg-muted",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <Textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitLive();
                }
              }}
              rows={2}
              placeholder="Ketik catatan lalu tekan Enter (Shift+Enter untuk baris baru)..."
              maxLength={10000}
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-secondary">
                <input type="checkbox" checked={withTime} onChange={(e) => setWithTime(e.target.checked)} className="size-4 accent-accent" />
                Sertakan timestamp sesi ({clock(sw.minutes)})
              </label>
              <Button onClick={submitLive} loading={pending} disabled={!text.trim()}>
                <Plus /> Simpan catatan
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-sm font-semibold">Catatan rekaman</span>
          {[{ value: "all", label: "Semua" }, ...RECORDING_NOTE_TYPES.filter((t) => (LIVE_TYPES as readonly string[]).includes(t.value))].map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setFilter(t.value)}
              className={cn("rounded-md px-2 py-1 text-xs", filter === t.value ? "bg-primary text-white" : "text-secondary hover:bg-muted")}
            >
              {t.label}
            </button>
          ))}
        </div>
        {live.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-secondary">Belum ada catatan. Mulai sesi lalu catat hal penting selama rekaman.</p>
        ) : (
          <ol className="space-y-2">
            {[...live].reverse().map((n) => {
              const meta = RECORDING_NOTE_TYPES.find((t) => t.value === n.type);
              return (
                <li key={n.id} className={cn("group flex gap-3 rounded-xl border bg-surface p-3", n.type === "important_moment" ? "border-danger/30" : "border-border")}>
                  <span className="w-16 shrink-0 pt-0.5 font-mono text-sm tabular-nums text-secondary">{n.timestamp_label ?? "—"}</span>
                  <div className="min-w-0 flex-1">
                    <Badge tone={meta?.tone ?? "neutral"}>{meta?.label ?? n.type}</Badge>
                    <p className="mt-1 whitespace-pre-line text-sm">{n.content}</p>
                    <p className="mt-1 text-xs text-secondary">
                      {n.author ?? "—"} · {new Date(n.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" aria-label="Hapus catatan" className="opacity-0 focus:opacity-100 group-hover:opacity-100" onClick={() => run(() => deleteRecordingNote(n.id))}>
                    <Trash2 />
                  </Button>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recording Checklist</CardTitle>
            {checklist.length > 0 && (
              <span className="text-xs text-secondary">
                {done}/{checklist.length} selesai
              </span>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {checklist.length === 0 && (
              <Button variant="outline" size="sm" onClick={() => run(() => addDefaultChecklist(episodeId))} loading={pending}>
                <ListChecks /> Pakai checklist standar
              </Button>
            )}
            <ul className="space-y-1">
              {checklist.map((c) => (
                <li key={c.id} className="group flex items-start gap-2 text-sm">
                  <button type="button" onClick={() => run(() => updateRecordingNote(c.id, { is_done: !c.is_done }))} aria-label={c.is_done ? "Tandai belum" : "Tandai selesai"} className="mt-0.5">
                    {c.is_done ? <CheckSquare className="size-4 text-success" /> : <Square className="size-4 text-secondary" />}
                  </button>
                  <span className={cn("flex-1", c.is_done && "text-secondary line-through")}>{c.content}</span>
                  <button type="button" onClick={() => run(() => deleteRecordingNote(c.id))} aria-label="Hapus item" className="text-secondary opacity-0 hover:text-danger focus:opacity-100 group-hover:opacity-100">
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!checkText.trim()) return;
                run(() => addRecordingNote(episodeId, { type: "checklist", content: checkText }), () => setCheckText(""));
              }}
            >
              <Input value={checkText} onChange={(e) => setCheckText(e.target.value)} placeholder="Tambah item checklist..." className="h-8" maxLength={500} />
              <Button type="submit" size="sm" variant="outline" disabled={!checkText.trim()}>
                <Plus />
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Post-Recording Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {post.map((n) => (
              <div key={n.id} className="group relative rounded-lg bg-muted/60 p-3 text-sm">
                <p className="whitespace-pre-line">{n.content}</p>
                <p className="mt-1 text-xs text-secondary">{n.author ?? "—"}</p>
                <button type="button" onClick={() => run(() => deleteRecordingNote(n.id))} aria-label="Hapus catatan" className="absolute right-2 top-2 text-secondary opacity-0 hover:text-danger focus:opacity-100 group-hover:opacity-100">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
            <Textarea value={postText} onChange={(e) => setPostText(e.target.value)} rows={3} placeholder="Evaluasi, bagian yang perlu dipotong saat editing, tindak lanjut..." maxLength={10000} />
            <Button
              size="sm"
              variant="outline"
              disabled={!postText.trim()}
              onClick={() => run(() => addRecordingNote(episodeId, { type: "post_recording", content: postText }), () => setPostText(""))}
            >
              <Plus /> Simpan catatan pasca-rekaman
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

