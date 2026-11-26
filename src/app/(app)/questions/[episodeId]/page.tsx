import type { Metadata } from "next";
import { EpisodeHeading } from "@/components/episodes/episode-tabs";
import { QuestionBuilder } from "@/components/questions/question-builder";
import type { QuestionData } from "@/components/questions/question-form";
import { aiEnabled } from "@/lib/ai/claude";
import { getEpisodeRef } from "@/lib/episodes";
import { getStudioContext } from "@/lib/session";

export const metadata: Metadata = { title: "Question Builder" };
export const maxDuration = 120;

export default async function QuestionBuilderPage({ params }: { params: Promise<{ episodeId: string }> }) {
  const { episodeId } = await params;
  const ctx = await getStudioContext();
  const episode = await getEpisodeRef(ctx, episodeId);
  const { data, error } = await ctx.supabase
    .from("questions")
    .select("id, question, category, purpose, host_notes, priority, status, position, follow_ups:follow_up_questions(id, question, status, position)")
    .eq("episode_id", episodeId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const questions = (data ?? []).map((q) => ({
    ...q,
    follow_ups: [...((q.follow_ups as QuestionData["follow_ups"]) ?? [])].sort((a, b) => a.position - b.position),
  })) as QuestionData[];
  return (
    <>
      <EpisodeHeading episode={episode} section="Question Builder" />
      <QuestionBuilder episodeId={episodeId} questions={questions} aiEnabled={aiEnabled()} />
    </>
  );
}
