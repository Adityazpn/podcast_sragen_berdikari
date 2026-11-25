import type { TNode } from "./types";

const h = (text: string, level = 2): TNode => ({ type: "heading", attrs: { level }, content: [{ type: "text", text }] });
const d = (role: string, text = ""): TNode => ({ type: "dialogue", attrs: { role }, content: text ? [{ type: "text", text }] : [] });
const ph = (text: string): TNode => ({ type: "paragraph", content: [{ type: "text", text, marks: [{ type: "italic" }] }] });

/** Kerangka naskah 6 PART. Semua teks diisi manual oleh penulis; ini hanya penanda struktur. */
export function fullTemplate(): TNode {
  return {
    type: "doc",
    content: [
      h("PART 1 — OPENING"),
      h("Greeting", 3), d("host"),
      h("Opening Hook", 3), d("host"),
      h("Introduction to Topic", 3), d("host"),
      h("Episode Context", 3), d("host"),
      h("Guest Introduction", 3), d("host"), d("guest"),
      d("transition"),

      h("PART 2 — ICE BREAKING"),
      h("Sapaan kepada narasumber", 3), d("host"), d("guest"),
      h("Pertanyaan ringan", 3), d("host"), d("guest"),
      h("Pembentukan suasana percakapan", 3), d("host_note"),
      d("transition"),

      h("PART 3 — MAIN DISCUSSION"),
      h("Pembahasan tema utama", 3), d("host"),
      h("Pertanyaan utama", 3), d("host"), d("guest"),
      h("Pertanyaan pendalaman", 3), d("host"), d("guest"),
      h("Pengalaman narasumber", 3), d("host"), d("guest"),
      h("Transisi pembahasan", 3), d("transition"),

      h("PART 4 — DEEP CONVERSATION"),
      h("Pertanyaan mendalam", 3), d("host"), d("guest"),
      h("Tantangan dan pengalaman sulit", 3), d("host"), d("guest"),
      h("Perspektif pribadi", 3), d("host"), d("guest"),
      h("Refleksi", 3), d("host"), d("guest"),
      d("transition"),

      h("PART 5 — INSIGHT AND TAKEAWAY"),
      h("Kesimpulan", 3), d("host"),
      h("Insight utama", 3), d("host"), d("guest"),
      h("Pesan untuk pendengar", 3), d("host"), d("guest"),
      d("transition"),

      h("PART 6 — CLOSING"),
      h("Closing Statement", 3), d("host"),
      h("Final Question", 3), d("host"), d("guest"),
      h("Ucapan terima kasih", 3), d("host"),
      h("Call to Action", 3), d("host"),
      h("Farewell", 3), d("host"),
    ],
  };
}

export function interviewTemplate(): TNode {
  return {
    type: "doc",
    content: [
      h("PART 1 — OPENING"), d("host"), d("guest"),
      h("PART 3 — MAIN DISCUSSION"), d("host"), d("guest"), d("host_note"),
      h("PART 6 — CLOSING"), d("host"),
    ],
  };
}

export function blankTemplate(): TNode {
  return { type: "doc", content: [ph("Mulai menulis naskah di sini...")] };
}

export const SCRIPT_TEMPLATES = {
  full: { label: "Struktur lengkap 6 PART", build: fullTemplate },
  interview: { label: "Wawancara ringkas", build: interviewTemplate },
  blank: { label: "Kosong", build: blankTemplate },
} as const;
export type ScriptTemplateKey = keyof typeof SCRIPT_TEMPLATES;
