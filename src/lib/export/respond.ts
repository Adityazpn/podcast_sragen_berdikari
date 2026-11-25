import "server-only";
import { NextResponse } from "next/server";
import { toDocx } from "./docx";
import { fileSlug, type ExportDoc } from "./model";
import { toPdf } from "./pdf";
import { toTxt } from "./txt";

export type ExportFormat = "pdf" | "docx" | "txt";

export function parseFormat(v: string | null, allowed: ExportFormat[]): ExportFormat | null {
  return allowed.includes(v as ExportFormat) ? (v as ExportFormat) : null;
}

const MIME: Record<ExportFormat, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain; charset=utf-8",
};

export async function exportResponse(doc: ExportDoc, format: ExportFormat, baseName: string) {
  const body: Buffer | string =
    format === "pdf" ? await toPdf(doc) : format === "docx" ? await toDocx(doc) : toTxt(doc);
  const filename = `${fileSlug(baseName)}.${format}`;
  return new NextResponse(typeof body === "string" ? body : new Uint8Array(body), {
    headers: {
      "Content-Type": MIME[format],
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export const badRequest = (msg: string) => NextResponse.json({ error: msg }, { status: 400 });
export const notFoundJson = () => NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
