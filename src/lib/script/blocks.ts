import { DIALOGUE_ROLES, SPEAKING_WPM } from "@/lib/constants";
import type { Block, Run, TNode } from "./types";

function runsOf(node: TNode | undefined): Run[] {
  const out: Run[] = [];
  const walk = (n: TNode) => {
    if (n.type === "text" && n.text) {
      const marks = new Set((n.marks ?? []).map((m) => m.type));
      out.push({
        text: n.text,
        bold: marks.has("bold") || undefined,
        italic: marks.has("italic") || undefined,
        underline: marks.has("underline") || undefined,
        highlight: marks.has("highlight") || undefined,
      });
    } else if (n.type === "hardBreak") {
      out.push({ text: "\n" });
    }
    n.content?.forEach(walk);
  };
  if (node) walk(node);
  return out;
}

export const runsText = (runs: Run[]) => runs.map((r) => r.text).join("");

/** Mengubah dokumen Tiptap menjadi blok sederhana untuk export & teleprompter. */
export function docToBlocks(doc: TNode | null | undefined): Block[] {
  const blocks: Block[] = [];
  for (const n of doc?.content ?? []) {
    switch (n.type) {
      case "heading":
        blocks.push({ kind: "heading", level: Number(n.attrs?.level ?? 2), runs: runsOf(n) });
        break;
      case "dialogue":
        blocks.push({ kind: "dialogue", role: String(n.attrs?.role ?? "host"), runs: runsOf(n) });
        break;
      case "bulletList":
      case "orderedList":
        blocks.push({
          kind: "list",
          ordered: n.type === "orderedList",
          items: (n.content ?? []).map((li) => runsOf(li)),
        });
        break;
      case "blockquote":
        blocks.push({ kind: "quote", runs: runsOf(n) });
        break;
      case "horizontalRule":
        blocks.push({ kind: "rule" });
        break;
      default:
        blocks.push({ kind: "paragraph", runs: runsOf(n) });
    }
  }
  return blocks;
}

export const roleLabel = (role: string) => DIALOGUE_ROLES.find((r) => r.value === role)?.label ?? role.toUpperCase();

export function blocksToText(blocks: Block[]): string {
  const lines: string[] = [];
  for (const b of blocks) {
    if (b.kind === "heading") lines.push("", runsText(b.runs).toUpperCase(), "");
    else if (b.kind === "dialogue") lines.push(`${roleLabel(b.role)}:`, runsText(b.runs), "");
    else if (b.kind === "list") b.items.forEach((it, i) => lines.push(`${b.ordered ? `${i + 1}.` : "-"} ${runsText(it)}`));
    else if (b.kind === "quote") lines.push(`> ${runsText(b.runs)}`);
    else if (b.kind === "rule") lines.push("----------");
    else lines.push(runsText(b.runs));
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

export function countWords(text: string) {
  const m = text.trim().match(/\S+/g);
  return m ? m.length : 0;
}

/** Estimasi durasi baca: jumlah kata ÷ kecepatan bicara (rumus biasa). */
export function readingMinutes(words: number) {
  return words / SPEAKING_WPM;
}

export function formatReading(words: number) {
  const totalSec = Math.round(readingMinutes(words) * 60);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m === 0 ? `${s} detik` : `${m} menit ${s.toString().padStart(2, "0")} detik`;
}
