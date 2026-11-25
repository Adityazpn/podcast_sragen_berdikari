import { NextResponse, type NextRequest } from "next/server";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

/** Buka file riset lewat signed URL singkat (bucket privat, dicek RLS). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await params;
  const supabase = await createClient();
  const { data: src } = await supabase.from("research_sources").select("file_path, title").eq("id", sourceId).maybeSingle();
  if (!src?.file_path) return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  const { data } = await supabase.storage.from(STORAGE_BUCKETS.research).createSignedUrl(src.file_path, 300);
  if (!data?.signedUrl) return NextResponse.json({ error: "File tidak dapat dibuka" }, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
