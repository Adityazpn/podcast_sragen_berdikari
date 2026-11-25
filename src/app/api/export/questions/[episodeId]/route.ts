import type { NextRequest } from "next/server";
import { buildQuestionsDoc } from "@/lib/export/builders";
import { badRequest, exportResponse, notFoundJson, parseFormat } from "@/lib/export/respond";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ episodeId: string }> }) {
  const { episodeId } = await params;
  const format = parseFormat(req.nextUrl.searchParams.get("format"), ["pdf", "docx", "txt"]);
  if (!format) return badRequest("Format tidak didukung");
  if (!/^[0-9a-f-]{36}$/i.test(episodeId)) return notFoundJson();
  const supabase = await createClient();
  const doc = await buildQuestionsDoc(supabase, episodeId);
  if (!doc) return notFoundJson();
  return exportResponse(doc, format, doc.title);
}
