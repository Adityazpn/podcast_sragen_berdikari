/** Struktur JSON dokumen Tiptap (subset yang dipakai aplikasi). */
export interface TNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  highlight?: boolean;
}

export type Block =
  | { kind: "heading"; level: number; runs: Run[] }
  | { kind: "paragraph"; runs: Run[] }
  | { kind: "dialogue"; role: string; runs: Run[] }
  | { kind: "list"; ordered: boolean; items: Run[][] }
  | { kind: "quote"; runs: Run[] }
  | { kind: "rule" };
