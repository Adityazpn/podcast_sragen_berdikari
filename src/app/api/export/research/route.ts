import type { NextRequest } from "next/server";
import { buildResearchDoc } from "@/lib/export/builders";
import { badRequest, exportResponse, notFoundJson, parseFormat } from "@/lib/export/respond";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const isUuid = (v: string | null) => !!v && /^[0-9a-f-]{36}$/i.test(v);

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const format = parseFormat(sp.get("format") ?? "pdf", ["pdf", "docx", "txt"]);
  if (!format) return badRequest("Format tidak didukung");
  const guest = sp.get("guest");
  const episode = sp.get("episode");
  if (!isUuid(guest) && !isUuid(episode)) return badRequest("Pilih narasumber atau episode");
  const supabase = await createClient();
  const doc = await buildResearchDoc(supabase, { guest: isUuid(guest) ? guest! : undefined, episode: isUuid(episode) ? episode! : undefined });
  if (!doc) return notFoundJson();
  return exportResponse(doc, format, doc.title);
}
