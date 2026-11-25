import type { Block, Run } from "@/lib/script/types";

export type ExportBlock =
  | Block
  | { kind: "field"; label: string; text: string }
  | { kind: "table"; header: string[]; rows: string[][]; footer?: string[]; widths?: number[] }
  | { kind: "question"; number: number; text: string; category: string; badges: string[]; purpose?: string | null; notes?: string | null; followUps: string[] };

export interface ExportDoc {
  title: string;
  subtitle?: string;
  meta: [string, string][];
  blocks: ExportBlock[];
}

export const r = (text: string): Run[] => [{ text }];
export const h = (text: string, level = 2): ExportBlock => ({ kind: "heading", level, runs: r(text) });
export const p = (text: string): ExportBlock => ({ kind: "paragraph", runs: r(text) });
export const field = (label: string, text: string | null | undefined): ExportBlock[] => (text && text.trim() ? [{ kind: "field", label, text: text.trim() }] : []);

export function fileSlug(s: string) {
  return (
    s
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 60) || "dokumen"
  );
}
