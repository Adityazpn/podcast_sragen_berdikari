import { blocksToText, roleLabel, runsText } from "@/lib/script/blocks";
import type { ExportDoc } from "./model";

export function toTxt(doc: ExportDoc): string {
  const out: string[] = [doc.title.toUpperCase()];
  if (doc.subtitle) out.push(doc.subtitle);
  out.push("=".repeat(Math.min(60, Math.max(doc.title.length, 20))));
  doc.meta.forEach(([k, v]) => out.push(`${k}: ${v}`));
  out.push("");
  for (const b of doc.blocks) {
    switch (b.kind) {
      case "field":
        out.push(`${b.label}:`, b.text, "");
        break;
      case "table": {
        const all = [b.header, ...b.rows, ...(b.footer ? [b.footer] : [])];
        const w = b.header.map((_, i) => Math.min(50, Math.max(...all.map((row) => (row[i] ?? "").length))));
        const line = (row: string[]) => row.map((c, i) => (c ?? "").padEnd(w[i]!)).join("  ").trimEnd();
        out.push(line(b.header), w.map((n) => "-".repeat(n)).join("  "));
        b.rows.forEach((row) => out.push(line(row)));
        if (b.footer) out.push(w.map((n) => "-".repeat(n)).join("  "), line(b.footer));
        out.push("");
        break;
      }
      case "question":
        out.push(`${b.number}. ${b.text}`);
        out.push(`   [${[b.category, ...b.badges].join(" | ")}]`);
        if (b.purpose) out.push(`   Tujuan: ${b.purpose}`);
        if (b.notes) out.push(`   Host note: ${b.notes}`);
        b.followUps.forEach((f) => out.push(`   -> ${f}`));
        out.push("");
        break;
      case "dialogue":
        out.push(`${roleLabel(b.role)}:`, runsText(b.runs), "");
        break;
      case "heading":
        out.push("", b.level <= 2 ? runsText(b.runs).toUpperCase() : `## ${runsText(b.runs)}`, "");
        break;
      default:
        out.push(blocksToText([b]).trimEnd());
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
