"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronsUp,
  Eye,
  EyeOff,
  Maximize,
  Minimize,
  Minus,
  Pause,
  Play,
  Plus,
  Settings2,
} from "lucide-react";
import { roleLabel, runsText } from "@/lib/script/blocks";
import type { Block, Run } from "@/lib/script/types";
import { cn } from "@/lib/utils";

type Focus = "all" | "host" | "host_only";
interface Settings {
  fontSize: number;
  width: number;
  speed: number;
  focus: Focus;
  guide: boolean;
}
const DEFAULTS: Settings = { fontSize: 44, width: 75, speed: 40, focus: "all", guide: true };
const STORAGE_KEY = "teleprompter-settings";
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

interface Section {
  id: string;
  title: string;
  level: number;
  blocks: Block[];
}

function toSections(blocks: Block[]): Section[] {
  const out: Section[] = [];
  let cur: Section = { id: "s-0", title: "Pembuka", level: 2, blocks: [] };
  for (const b of blocks) {
    if (b.kind === "heading") {
      if (cur.blocks.length || out.length) out.push(cur);
      cur = { id: `s-${out.length + 1}`, title: runsText(b.runs) || "(tanpa judul)", level: b.level, blocks: [] };
    } else {
      cur.blocks.push(b);
    }
  }
  out.push(cur);
  return out.filter((s, i) => s.blocks.length || i > 0 || s.title !== "Pembuka");
}

function RunsView({ runs }: { runs: Run[] }) {
  return (
    <>
      {runs.map((r, i) => (
        <span
          key={i}
          className={cn(r.bold && "font-bold", r.italic && "italic", r.underline && "underline", r.highlight && "rounded bg-yellow-300/30 px-1")}
        >
          {r.text}
        </span>
      ))}
    </>
  );
}

const ROLE_STYLE: Record<string, { label: string; text: string }> = {
  host: { label: "text-indigo-300", text: "text-white" },
  guest: { label: "text-emerald-300", text: "text-emerald-100/90" },
  host_note: { label: "text-amber-300", text: "text-amber-100/90 italic" },
  transition: { label: "text-slate-400", text: "text-slate-200" },
};

function BlockView({ b, focus }: { b: Block; focus: Focus }) {
  if (b.kind === "dialogue") {
    if (focus === "host_only" && (b.role === "guest" || b.role === "host_note")) return null;
    const st = ROLE_STYLE[b.role] ?? ROLE_STYLE.host!;
    const dim = focus === "host" && (b.role === "guest" || b.role === "host_note");
    const empty = !runsText(b.runs).trim();
    if (empty && b.role === "guest") {
      return (
        <p className={cn("my-[0.6em] text-[0.45em] font-bold tracking-widest", st.label, dim && "opacity-40")}>
          {roleLabel(b.role)} — (jawaban narasumber)
        </p>
      );
    }
    if (empty) return null;
    return (
      <div className={cn("my-[0.6em]", dim && "text-[0.6em] opacity-40")}>
        <p className={cn("mb-[0.15em] text-[0.4em] font-bold tracking-widest", st.label)}>{roleLabel(b.role)}</p>
        <p className={cn("whitespace-pre-line", st.text)}>
          <RunsView runs={b.runs} />
        </p>
      </div>
    );
  }
  if (b.kind === "list")
    return (
      <ul className="my-[0.4em] list-disc pl-[1.2em]">
        {b.items.map((it, i) => (
          <li key={i}>
            <RunsView runs={it} />
          </li>
        ))}
      </ul>
    );
  if (b.kind === "rule") return <hr className="my-[0.8em] border-white/20" />;
  if (b.kind === "paragraph" || b.kind === "quote") {
    if (!runsText(b.runs).trim()) return null;
    return (
      <p className={cn("my-[0.4em] whitespace-pre-line", b.kind === "quote" && "text-white/70")}>
        <RunsView runs={b.runs} />
      </p>
    );
  }
  return null;
}

export function Teleprompter({ title, blocks, backHref }: { title: string; blocks: Block[]; backHref: string }) {
  const sections = useMemo(() => toSections(blocks), [blocks]);
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(sections[0]?.id ?? "");
  const [showControls, setShowControls] = useState(true);
  const [isFull, setIsFull] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const acc = useRef(0);

  // Muat & simpan preferensi tampilan.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (saved) setS({ ...DEFAULTS, ...saved });
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }, [s]);
  const update = (patch: Partial<Settings>) => setS((prev) => ({ ...prev, ...patch }));

  // Auto scroll dengan requestAnimationFrame (piksel per detik).
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const el = scrollRef.current;
      if (el) {
        acc.current += (s.speed * (now - last)) / 1000;
        const whole = Math.floor(acc.current);
        if (whole) {
          el.scrollTop += whole;
          acc.current -= whole;
        }
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) setPlaying(false);
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, s.speed]);

  // Tentukan bagian yang sedang dibaca (di garis baca 35% dari atas).
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const line = el.getBoundingClientRect().top + el.clientHeight * 0.35;
    let active = sections[0]?.id ?? "";
    for (const sec of sections) {
      const node = document.getElementById(sec.id);
      if (node && node.getBoundingClientRect().top <= line) active = sec.id;
    }
    setCurrent(active);
  }, [sections]);

  const jump = (id: string) => {
    const el = scrollRef.current;
    const node = document.getElementById(id);
    if (!el || !node) return;
    el.scrollTo({ top: el.scrollTop + node.getBoundingClientRect().top - el.getBoundingClientRect().top - el.clientHeight * 0.3, behavior: "smooth" });
  };

  const toggleFull = async () => {
    if (!document.fullscreenElement) await rootRef.current?.requestFullscreen().catch(() => {});
    else await document.exitFullscreen().catch(() => {});
  };
  useEffect(() => {
    const onChange = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Pintasan keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      const el = scrollRef.current;
      switch (e.key) {
        case " ":
          e.preventDefault();
          setPlaying((p) => !p);
          break;
        case "ArrowUp":
          e.preventDefault();
          el?.scrollBy({ top: -s.fontSize * 1.5 });
          break;
        case "ArrowDown":
          e.preventDefault();
          el?.scrollBy({ top: s.fontSize * 1.5 });
          break;
        case "PageUp":
          e.preventDefault();
          el?.scrollBy({ top: -(el.clientHeight * 0.8), behavior: "smooth" });
          break;
        case "PageDown":
          e.preventDefault();
          el?.scrollBy({ top: el.clientHeight * 0.8, behavior: "smooth" });
          break;
        case "+":
        case "=":
          update({ speed: clamp(s.speed + 5, 5, 300) });
          break;
        case "-":
          update({ speed: clamp(s.speed - 5, 5, 300) });
          break;
        case "]":
          update({ fontSize: clamp(s.fontSize + 4, 20, 120) });
          break;
        case "[":
          update({ fontSize: clamp(s.fontSize - 4, 20, 120) });
          break;
        case "f":
        case "F":
          void toggleFull();
          break;
        case "h":
        case "H":
          setShowControls((v) => !v);
          break;
        case "Home":
          el?.scrollTo({ top: 0 });
          break;
        case "n":
        case "N": {
          const i = sections.findIndex((x) => x.id === current);
          if (sections[i + 1]) jump(sections[i + 1]!.id);
          break;
        }
        case "p":
        case "P": {
          const i = sections.findIndex((x) => x.id === current);
          if (i > 0) jump(sections[i - 1]!.id);
          break;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div ref={rootRef} className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      {showControls && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/10 bg-neutral-950 px-4 py-2 text-sm">
          <Link href={backHref} className="flex items-center gap-1 text-white/70 hover:text-white">
            <ArrowLeft className="size-4" /> Keluar
          </Link>
          <span className="hidden max-w-60 truncate font-medium md:inline">{title}</span>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold", playing ? "bg-amber-500 text-black" : "bg-indigo-500")}
            aria-label={playing ? "Jeda (Spasi)" : "Mulai (Spasi)"}
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />} {playing ? "Jeda" : "Mulai"}
          </button>
          <button type="button" onClick={() => scrollRef.current?.scrollTo({ top: 0 })} className="rounded-md p-1.5 text-white/70 hover:bg-white/10" aria-label="Kembali ke awal" title="Kembali ke awal (Home)">
            <ChevronsUp className="size-4" />
          </button>

          <label className="flex items-center gap-2">
            <span className="text-white/60">Kecepatan</span>
            <button type="button" className="rounded p-1 hover:bg-white/10" onClick={() => update({ speed: clamp(s.speed - 5, 5, 300) })} aria-label="Kurangi kecepatan">
              <Minus className="size-3.5" />
            </button>
            <input type="range" min={5} max={300} step={5} value={s.speed} onChange={(e) => update({ speed: Number(e.target.value) })} className="w-24 accent-indigo-500" aria-label="Kecepatan scroll" />
            <button type="button" className="rounded p-1 hover:bg-white/10" onClick={() => update({ speed: clamp(s.speed + 5, 5, 300) })} aria-label="Tambah kecepatan">
              <Plus className="size-3.5" />
            </button>
            <span className="w-14 tabular-nums text-white/60">{s.speed} px/d</span>
          </label>

          <label className="flex items-center gap-2">
            <span className="text-white/60">Huruf</span>
            <input type="range" min={20} max={120} step={2} value={s.fontSize} onChange={(e) => update({ fontSize: Number(e.target.value) })} className="w-20 accent-indigo-500" aria-label="Ukuran huruf" />
            <span className="w-9 tabular-nums text-white/60">{s.fontSize}</span>
          </label>

          <label className="flex items-center gap-2">
            <span className="text-white/60">Lebar</span>
            <input type="range" min={35} max={100} step={5} value={s.width} onChange={(e) => update({ width: Number(e.target.value) })} className="w-20 accent-indigo-500" aria-label="Lebar teks" />
            <span className="w-10 tabular-nums text-white/60">{s.width}%</span>
          </label>

          <select
            value={s.focus}
            onChange={(e) => update({ focus: e.target.value as Focus })}
            className="rounded-md border border-white/20 bg-neutral-900 px-2 py-1"
            aria-label="Mode fokus"
          >
            <option value="all">Tampilkan semua</option>
            <option value="host">Fokus dialog host</option>
            <option value="host_only">Hanya host</option>
          </select>

          <select
            value={current}
            onChange={(e) => jump(e.target.value)}
            className="max-w-56 rounded-md border border-white/20 bg-neutral-900 px-2 py-1"
            aria-label="Lompat ke bagian"
          >
            {sections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.level === 3 ? "  — " : ""}
                {sec.title}
              </option>
            ))}
          </select>

          <button type="button" onClick={() => update({ guide: !s.guide })} className="rounded-md p-1.5 text-white/70 hover:bg-white/10" aria-label="Garis baca" title="Garis baca">
            {s.guide ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          </button>
          <button type="button" onClick={toggleFull} className="rounded-md p-1.5 text-white/70 hover:bg-white/10" aria-label="Layar penuh (F)" title="Layar penuh (F)">
            {isFull ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </button>
          <button type="button" onClick={() => setShowControls(false)} className="ml-auto rounded-md p-1.5 text-white/70 hover:bg-white/10" aria-label="Sembunyikan kontrol (H)" title="Sembunyikan kontrol (H)">
            <Settings2 className="size-4" />
          </button>
        </div>
      )}
      {!showControls && (
        <button
          type="button"
          onClick={() => setShowControls(true)}
          className="absolute right-3 top-3 z-10 rounded-md bg-white/10 p-2 text-white/60 hover:text-white"
          aria-label="Tampilkan kontrol (H)"
        >
          <Settings2 className="size-4" />
        </button>
      )}

      <div className="relative min-h-0 flex-1">
        {s.guide && (
          <div className="pointer-events-none absolute inset-x-0 top-[35%] z-10 h-0.5 bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" aria-hidden />
        )}
        <div ref={scrollRef} onScroll={onScroll} onWheel={() => (acc.current = 0)} className="h-full overflow-y-auto">
          <div className="mx-auto pb-[70vh] pt-[30vh] leading-[1.45]" style={{ width: `${s.width}%`, fontSize: `${s.fontSize}px` }}>
            {sections.length === 0 || blocks.length === 0 ? (
              <p className="text-center text-white/50">Naskah masih kosong.</p>
            ) : (
              sections.map((sec) => (
                <section
                  key={sec.id}
                  id={sec.id}
                  className={cn("transition-opacity duration-300", current === sec.id ? "opacity-100" : "opacity-40")}
                >
                  {!(sec.id === "s-0" && sec.title === "Pembuka") && (
                    <h2
                      className={cn(
                        "mb-[0.3em] mt-[1.2em] font-bold uppercase tracking-wide",
                        sec.level <= 2 ? "text-[0.55em] text-indigo-300" : "text-[0.45em] text-white/60",
                        current === sec.id && "border-l-4 border-indigo-400 pl-3",
                      )}
                    >
                      {sec.title}
                    </h2>
                  )}
                  {sec.blocks.map((b, i) => (
                    <BlockView key={i} b={b} focus={s.focus} />
                  ))}
                </section>
              ))
            )}
          </div>
        </div>
      </div>
      {showControls && (
        <div className="border-t border-white/10 bg-neutral-950 px-4 py-1.5 text-xs text-white/40">
          Spasi: mulai/jeda · ↑↓ / PageUp PageDown: scroll manual · + −: kecepatan · [ ]: ukuran huruf · N/P: bagian berikut/sebelum · F: layar penuh · H: sembunyikan kontrol
        </div>
      )}
    </div>
  );
}
