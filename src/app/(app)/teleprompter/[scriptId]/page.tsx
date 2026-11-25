import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Teleprompter } from "@/components/teleprompter/teleprompter";
import { docToBlocks } from "@/lib/script/blocks";
import type { TNode } from "@/lib/script/types";
import { getStudioContext } from "@/lib/session";

export const metadata: Metadata = { title: "Teleprompter" };

export default async function TeleprompterScriptPage({ params }: { params: Promise<{ scriptId: string }> }) {
  const { scriptId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(scriptId)) notFound();
  const ctx = await getStudioContext();
  const { data: s } = await ctx.supabase.from("scripts").select("id, title, content").eq("id", scriptId).maybeSingle();
  if (!s) notFound();
  return <Teleprompter title={s.title} blocks={docToBlocks(s.content as TNode)} backHref={`/scripts/${s.id}`} />;
}
