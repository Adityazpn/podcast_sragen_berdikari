import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { roleLabel } from "@/lib/script/blocks";
import type { Run } from "@/lib/script/types";
import type { ExportDoc } from "./model";

const ROLE_COLOR: Record<string, { bar: string; fill: string }> = {
  host: { bar: "6366F1", fill: "EEF2FF" },
  guest: { bar: "16A34A", fill: "F0FDF4" },
  host_note: { bar: "D97706", fill: "FFFBEB" },
  transition: { bar: "64748B", fill: "F1F5F9" },
};

function runs(rs: Run[], extra: { italics?: boolean; size?: number; color?: string } = {}) {
  return rs.flatMap((r) =>
    r.text.split("\n").map(
      (t, i) =>
        new TextRun({
          text: t,
          break: i > 0 ? 1 : undefined,
          bold: r.bold,
          italics: r.italic || extra.italics,
          underline: r.underline ? {} : undefined,
          highlight: r.highlight ? "yellow" : undefined,
          size: extra.size,
          color: extra.color,
        }),
    ),
  );
}

const plain = (text: string, opts: { bold?: boolean; color?: string; size?: number; italics?: boolean } = {}) => new TextRun({ text, ...opts });

export async function toDocx(doc: ExportDoc): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [plain(doc.title)] }),
  ];
  if (doc.subtitle) children.push(new Paragraph({ children: [plain(doc.subtitle, { color: "64748B" })], spacing: { after: 120 } }));
  doc.meta.forEach(([k, v]) =>
    children.push(new Paragraph({ children: [plain(`${k}: `, { bold: true, size: 20 }), plain(v, { size: 20 })], spacing: { after: 40 } })),
  );
  children.push(
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "E2E8F0", space: 4 } },
      spacing: { after: 240 },
      children: [],
    }),
  );

  let listInstance = 0;
  for (const b of doc.blocks) {
    switch (b.kind) {
      case "heading":
        children.push(new Paragraph({ heading: b.level <= 2 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2, children: runs(b.runs), spacing: { before: 240, after: 120 } }));
        break;
      case "paragraph":
        children.push(new Paragraph({ children: runs(b.runs), spacing: { after: 120 } }));
        break;
      case "quote":
        children.push(new Paragraph({ children: runs(b.runs, { italics: true, color: "64748B" }), indent: { left: 400 } }));
        break;
      case "rule":
        children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "E2E8F0", space: 4 } }, children: [] }));
        break;
      case "list": {
        const instance = ++listInstance;
        b.items.forEach((it) =>
          children.push(new Paragraph({ children: runs(it), numbering: { reference: b.ordered ? "num" : "bullet", level: 0, instance } })),
        );
        break;
      }
      case "dialogue": {
        const c = ROLE_COLOR[b.role] ?? ROLE_COLOR.host!;
        children.push(
          new Paragraph({
            children: [plain(roleLabel(b.role), { bold: true, color: c.bar, size: 18 })],
            spacing: { before: 160, after: 0 },
            indent: { left: 200 },
          }),
          new Paragraph({
            children: b.runs.length ? runs(b.runs, { italics: b.role === "host_note" }) : [plain("…", { color: "94A3B8" })],
            shading: { type: ShadingType.CLEAR, color: "auto", fill: c.fill },
            border: { left: { style: BorderStyle.SINGLE, size: 24, color: c.bar, space: 8 } },
            indent: { left: 200 },
            spacing: { after: 120 },
          }),
        );
        break;
      }
      case "field":
        children.push(
          new Paragraph({ children: [plain(b.label, { bold: true, size: 20, color: "64748B" })], spacing: { before: 160, after: 40 } }),
          ...b.text.split("\n").map((line) => new Paragraph({ children: [plain(line)], spacing: { after: 40 } })),
        );
        break;
      case "question":
        children.push(
          new Paragraph({
            children: [plain(`${b.number}. `, { bold: true }), plain(b.text, { bold: true })],
            spacing: { before: 200, after: 40 },
          }),
          new Paragraph({ children: [plain([b.category, ...b.badges].join("  ·  "), { size: 18, color: "64748B" })], indent: { left: 360 } }),
        );
        if (b.purpose) children.push(new Paragraph({ children: [plain("Tujuan: ", { bold: true, size: 20 }), plain(b.purpose, { size: 20 })], indent: { left: 360 } }));
        if (b.notes) children.push(new Paragraph({ children: [plain("Host note: ", { bold: true, size: 20, color: "B45309" }), plain(b.notes, { size: 20, italics: true })], indent: { left: 360 } }));
        b.followUps.forEach((f) => children.push(new Paragraph({ children: [plain(`↳ ${f}`, { size: 20 })], indent: { left: 720 } })));
        break;
      case "table": {
        const cell = (t: string, header = false) =>
          new TableCell({
            children: [new Paragraph({ children: [plain(t, { bold: header, size: 20 })] })],
            shading: header ? { type: ShadingType.CLEAR, color: "auto", fill: "F1F5F9" } : undefined,
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
          });
        const rows = [
          new TableRow({ tableHeader: true, children: b.header.map((t) => cell(t, true)) }),
          ...b.rows.map((row) => new TableRow({ children: row.map((t) => cell(t)) })),
          ...(b.footer ? [new TableRow({ children: b.footer.map((t) => cell(t, true)) })] : []),
        ];
        children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }), new Paragraph({ children: [] }));
        break;
      }
    }
  }

  const document = new Document({
    creator: "Sukowati Berdikari",
    title: doc.title,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    numbering: {
      config: [
        { reference: "bullet", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 260 } } } }] },
        { reference: "num", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 260 } } } }] },
      ],
    },
    sections: [{ properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children }],
  });
  return Packer.toBuffer(document);
}
