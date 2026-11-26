"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod/v4";
import { logActivity } from "@/lib/activity";
import { AI_HOURLY_LIMIT, generateStructured, section } from "@/lib/ai/claude";
import { DIALOGUE_ROLES, QUESTION_CATEGORIES, RESEARCH_CATEGORIES, labelOf } from "@/lib/constants";
import { getStudioContext, type StudioContext } from "@/lib/session";

const uuid = z.string().uuid();
const catValues = QUESTION_CATEGORIES.map((c) => c.value) as [string, ...string[]];
const roleValues = DIALOGUE_ROLES.map((r) => r.value) as [string, ...string[]];

/** Batas total konteks yang dikirim ke AI (karakter). Catatan riset paling lama dipotong lebih dulu. */
const MAX_CONTEXT = 120_000;

async function checkQuota(ctx: StudioContext): Promise<string | null> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await ctx.supabase
    .from("activity_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.userId)
    .eq("action", "generated")
    .gte("created_at", since);
  if ((count ?? 0) >= AI_HOURLY_LIMIT) return `Batas ${AI_HOURLY_LIMIT} permintaan AI per jam tercapai. Coba lagi nanti.`;
  return null;
}

type GuestRow = Record<string, string | null> & { id: string; name: string };

function guestText(g: GuestRow | null) {
  if (!g) return "";
  const fields: [string, string][] = [
    ["Profesi", "profession"],
    ["Jabatan", "position"],
    ["Perusahaan/organisasi", "company"],
    ["Keahlian", "expertise"],
    ["Biografi", "biography"],
    ["Latar belakang", "background"],
    ["Perjalanan karier", "career_journey"],
    ["Pencapaian", "achievements"],
    ["Pengalaman", "experiences"],
    ["Catatan tim", "notes"],
  ];
  return section(
    `Narasumber: ${g.name}`,
    fields
      .filter(([, k]) => g[k])
      .map(([l, k]) => `${l}: ${g[k]}`)
      .join("\n"),
  );
}

async function researchText(ctx: StudioContext, filter: { guestId?: string | null; episodeId?: string | null }) {
  const ors: string[] = [];
  if (filter.guestId) ors.push(`guest_id.eq.${filter.guestId}`);
  if (filter.episodeId) ors.push(`episode_id.eq.${filter.episodeId}`);
  if (!ors.length) return { text: "", trimmed: false };
  const { data } = await ctx.supabase
    .from("research_notes")
    .select("title, category, content, updated_at")
    .or(ors.join(","))
    .order("updated_at", { ascending: false })
    .limit(60);
  let used = 0;
  let trimmed = false;
  const parts: string[] = [];
  for (const n of data ?? []) {
    const block = `### ${n.title} (${labelOf(RESEARCH_CATEGORIES, n.category)})\n${n.content ?? ""}\n`;
    if (used + block.length > MAX_CONTEXT) {
      trimmed = true;
      break;
    }
    parts.push(block);
    used += block.length;
  }
  return { text: parts.length ? `## Catatan riset\n${parts.join("\n")}` : "", trimmed };
}

async function episodeContext(ctx: StudioContext, episodeId: string) {
  const { data: ep } = await ctx.supabase
    .from("episodes")
    .select("id, title, main_topic, description, objective, target_audience, duration_minutes, host, guest_id, project:podcast_projects(name, description, main_topic, target_audience, language, communication_style, host_name), guest:guests(*)")
    .eq("id", episodeId)
    .maybeSingle();
  if (!ep) return null;
  const p = ep.project as unknown as Record<string, string | null> | null;
  const g = ep.guest as unknown as GuestRow | null;
  const research = await researchText(ctx, { guestId: ep.guest_id, episodeId });
  const text = [
    section(
      "Podcast",
      p &&
        [
          `Nama: ${p.name}`,
          p.description && `Deskripsi: ${p.description}`,
          p.main_topic && `Topik utama: ${p.main_topic}`,
          p.target_audience && `Target pendengar: ${p.target_audience}`,
          p.language && `Bahasa: ${p.language}`,
          p.communication_style && `Gaya komunikasi: ${p.communication_style}`,
        ]
          .filter(Boolean)
          .join("\n"),
    ),
    section(
      `Episode: ${ep.title}`,
      [
        ep.main_topic && `Topik: ${ep.main_topic}`,
        ep.description && `Deskripsi: ${ep.description}`,
        ep.objective && `Tujuan: ${ep.objective}`,
        ep.target_audience && `Target pendengar: ${ep.target_audience}`,
        ep.duration_minutes && `Durasi: ${ep.duration_minutes} menit`,
        (ep.host || p?.host_name) && `Host: ${ep.host || p?.host_name}`,
      ]
        .filter(Boolean)
        .join("\n"),
    ),
    guestText(g),
    research.text,
  ].join("\n");
  return { ep, guest: g, text, trimmed: research.trimmed };
}

// ---------------------------------------------------------------------------
// 1. Generate pertanyaan
// ---------------------------------------------------------------------------

const QuestionsOut = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      category: z.enum(catValues),
      purpose: z.string(),
      follow_ups: z.array(z.string()),
    }),
  ),
});
export type GeneratedQuestion = z.infer<typeof QuestionsOut>["questions"][number];

export async function generateQuestions(
  episodeId: string,
  input: { count: number; categories: string[]; instruction: string },
): Promise<{ error?: string; questions?: GeneratedQuestion[]; note?: string }> {
  if (!uuid.safeParse(episodeId).success) return { error: "Episode tidak valid." };
  const count = Math.min(30, Math.max(1, Math.round(input.count) || 10));
  const cats = input.categories.filter((c) => catValues.includes(c));
  const instruction = (input.instruction ?? "").slice(0, 2000);
  const ctx = await getStudioContext();
  const quota = await checkQuota(ctx);
  if (quota) return { error: quota };
  const ec = await episodeContext(ctx, episodeId);
  if (!ec) return { error: "Episode tidak ditemukan." };

  const { data: existing } = await ctx.supabase.from("questions").select("question").eq("episode_id", episodeId).limit(200);
  const existingText = section("Pertanyaan yang sudah ada (jangan diulang)", (existing ?? []).map((q) => `- ${q.question}`).join("\n"));

  const catList = (cats.length ? cats : catValues).map((c) => `${c} (${labelOf(QUESTION_CATEGORIES, c)})`).join(", ");
  const res = await generateStructured({
    context: ec.text + "\n" + existingText,
    schema: QuestionsOut,
    task: `Susun ${count} pertanyaan wawancara podcast untuk episode ini.
Kategori yang boleh dipakai: ${catList}. Sebar pertanyaan secara wajar di kategori tersebut dan urutkan seperti alur wawancara (pembuka → inti → penutup).
Setiap pertanyaan: satu kalimat tanya yang terbuka dan enak diucapkan host, tujuan singkat (purpose, 1 kalimat), dan 0–2 pertanyaan lanjutan (follow_ups).
Kaitkan dengan data narasumber dan riset bila ada; jangan menyebut fakta yang tidak ada di data.${instruction ? `\nInstruksi tambahan dari tim: ${instruction}` : ""}`,
  });
  if ("error" in res) return { error: res.error };
  await logActivity(ctx, "generated", "ai", episodeId, `${res.data.questions.length} pertanyaan untuk ${ec.ep.title}`);
  return {
    questions: res.data.questions.slice(0, count),
    note: ec.trimmed ? "Sebagian catatan riset lama tidak ikut dikirim karena terlalu panjang." : undefined,
  };
}

const AddIn = z.array(
  z.object({
    question: z.string().trim().min(3).max(2000),
    category: z.enum(catValues),
    purpose: z.string().trim().max(1000),
    follow_ups: z.array(z.string().trim().min(1).max(2000)).max(5),
  }),
).min(1).max(30);

export async function addGeneratedQuestions(episodeId: string, items: GeneratedQuestion[]): Promise<{ error?: string; ok?: boolean }> {
  if (!uuid.safeParse(episodeId).success) return { error: "Episode tidak valid." };
  const parsed = AddIn.safeParse(items);
  if (!parsed.success) return { error: "Data pertanyaan tidak valid." };
  const ctx = await getStudioContext();
  const { data: ep } = await ctx.supabase.from("episodes").select("workspace_id").eq("id", episodeId).maybeSingle();
  if (!ep) return { error: "Episode tidak ditemukan." };
  const { data: last } = await ctx.supabase
    .from("questions")
    .select("position")
    .eq("episode_id", episodeId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  let pos = (last?.position ?? -1) + 1;
  const { data: inserted, error } = await ctx.supabase
    .from("questions")
    .insert(
      parsed.data.map((q) => ({
        workspace_id: ep.workspace_id,
        episode_id: episodeId,
        question: q.question,
        category: q.category,
        purpose: q.purpose || null,
        priority: "normal",
        status: "not_asked",
        position: pos++,
        created_by: ctx.userId,
      })),
    )
    .select("id, position");
  if (error || !inserted) return { error: "Gagal menyimpan pertanyaan." };
  const byPos = new Map(inserted.map((r) => [r.position, r.id]));
  const startPos = pos - parsed.data.length;
  const followRows = parsed.data.flatMap((q, i) =>
    q.follow_ups.map((f, j) => ({ workspace_id: ep.workspace_id, question_id: byPos.get(startPos + i)!, question: f, position: j })),
  );
  if (followRows.length) {
    const { error: fe } = await ctx.supabase.from("follow_up_questions").insert(followRows);
    if (fe) return { error: "Pertanyaan tersimpan, tetapi pertanyaan lanjutan gagal disimpan." };
  }
  await logActivity(ctx, "created", "question", episodeId, `${parsed.data.length} pertanyaan dari AI`);
  revalidatePath(`/questions/${episodeId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// 2. Analisa narasumber
// ---------------------------------------------------------------------------

const GuestOut = z.object({
  summary: z.string(),
  expertise: z.array(z.string()),
  interesting_angles: z.array(z.string()),
  topics_to_explore: z.array(z.string()),
  sensitive_topics: z.array(z.string()),
  facts_to_verify: z.array(z.string()),
  suggested_questions: z.array(z.string()),
});
export type GuestAnalysis = z.infer<typeof GuestOut>;

export async function analyzeGuest(guestId: string, instruction: string): Promise<{ error?: string; analysis?: GuestAnalysis; note?: string }> {
  if (!uuid.safeParse(guestId).success) return { error: "Narasumber tidak valid." };
  const ctx = await getStudioContext();
  const quota = await checkQuota(ctx);
  if (quota) return { error: quota };
  const { data: g } = await ctx.supabase.from("guests").select("*").eq("id", guestId).maybeSingle();
  if (!g) return { error: "Narasumber tidak ditemukan." };
  const research = await researchText(ctx, { guestId });
  const { data: eps } = await ctx.supabase.from("episodes").select("title, main_topic, status").eq("guest_id", guestId).limit(20);
  const context = [
    guestText(g as GuestRow),
    section("Episode bersama narasumber ini", (eps ?? []).map((e) => `- ${e.title}${e.main_topic ? ` (${e.main_topic})` : ""}`).join("\n")),
    research.text,
  ].join("\n");
  if (!context.trim()) return { error: "Data narasumber masih kosong. Isi profil atau catatan riset dulu." };

  const res = await generateStructured({
    context,
    schema: GuestOut,
    effort: "medium",
    task: `Analisa narasumber ini untuk persiapan wawancara podcast.
- summary: ringkasan profil 3–5 kalimat.
- expertise: bidang keahlian utama.
- interesting_angles: sudut cerita yang menarik untuk pendengar.
- topics_to_explore: topik yang layak digali lebih dalam.
- sensitive_topics: topik yang perlu hati-hati (kosongkan bila tidak ada indikasi di data).
- facts_to_verify: hal yang perlu dicek ulang tim sebelum rekaman karena datanya kurang jelas.
- suggested_questions: 5 pertanyaan pembuka yang kuat.
Gunakan hanya informasi dari data.${instruction ? `\nInstruksi tambahan dari tim: ${instruction.slice(0, 2000)}` : ""}`,
  });
  if ("error" in res) return { error: res.error };
  await logActivity(ctx, "generated", "ai", guestId, `Analisa narasumber ${g.name}`);
  return { analysis: res.data, note: research.trimmed ? "Sebagian catatan riset lama tidak ikut dianalisa karena terlalu panjang." : undefined };
}

export async function saveGuestAnalysis(guestId: string, analysis: GuestAnalysis): Promise<{ error?: string; ok?: boolean }> {
  if (!uuid.safeParse(guestId).success) return { error: "Narasumber tidak valid." };
  const parsed = GuestOut.safeParse(analysis);
  if (!parsed.success) return { error: "Data analisa tidak valid." };
  const ctx = await getStudioContext();
  const { data: g } = await ctx.supabase.from("guests").select("name, workspace_id").eq("id", guestId).maybeSingle();
  if (!g) return { error: "Narasumber tidak ditemukan." };
  const a = parsed.data;
  const list = (title: string, items: string[]) => (items.length ? `${title}\n${items.map((i) => `• ${i}`).join("\n")}\n\n` : "");
  const content = (
    `${a.summary}\n\n` +
    list("Keahlian:", a.expertise) +
    list("Sudut cerita menarik:", a.interesting_angles) +
    list("Topik untuk digali:", a.topics_to_explore) +
    list("Topik sensitif:", a.sensitive_topics) +
    list("Perlu dicek ulang:", a.facts_to_verify) +
    list("Usulan pertanyaan:", a.suggested_questions) +
    `(Draf dari AI, ${new Date().toLocaleDateString("id-ID")}. Tinjau sebelum dipakai.)`
  ).slice(0, 50000);
  const { data, error } = await ctx.supabase
    .from("research_notes")
    .insert({ workspace_id: g.workspace_id, guest_id: guestId, category: "interview_angles", title: `Analisa narasumber: ${g.name}`.slice(0, 200), content, created_by: ctx.userId })
    .select("id")
    .single();
  if (error || !data) return { error: "Gagal menyimpan ke Research Notes." };
  await logActivity(ctx, "created", "research", data.id, `Analisa narasumber: ${g.name}`);
  revalidatePath(`/guests/${guestId}`);
  revalidatePath("/research");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// 3. Susun teks naskah
// ---------------------------------------------------------------------------

const ScriptOut = z.object({
  blocks: z.array(z.object({ role: z.enum(roleValues), text: z.string() })),
});
export type ScriptBlock = z.infer<typeof ScriptOut>["blocks"][number];

export async function generateScriptText(
  scriptId: string,
  input: { instruction: string; surrounding: string; length: "short" | "medium" | "long" },
): Promise<{ error?: string; blocks?: ScriptBlock[] }> {
  if (!uuid.safeParse(scriptId).success) return { error: "Script tidak valid." };
  const instruction = (input.instruction ?? "").trim().slice(0, 3000);
  if (instruction.length < 5) return { error: "Tulis instruksi minimal 5 karakter." };
  const ctx = await getStudioContext();
  const quota = await checkQuota(ctx);
  if (quota) return { error: quota };
  const { data: s } = await ctx.supabase.from("scripts").select("title, episode_id").eq("id", scriptId).maybeSingle();
  if (!s) return { error: "Script tidak ditemukan." };
  const ec = s.episode_id ? await episodeContext(ctx, s.episode_id) : null;
  const lengthHint = { short: "2–4 blok", medium: "5–8 blok", long: "9–14 blok" }[input.length] ?? "5–8 blok";
  const context = [
    ec?.text ?? "",
    section("Bagian naskah di sekitar posisi kursor", (input.surrounding ?? "").slice(0, 8000)),
  ].join("\n");

  const res = await generateStructured({
    context,
    schema: ScriptOut,
    task: `Tulis teks naskah podcast untuk script "${s.title}" sesuai instruksi tim di bawah, ${lengthHint}.
Setiap blok punya role: host (ucapan host), guest (perkiraan jawaban narasumber, tulis singkat dan beri tanda [perkiraan] di awal), host_note (catatan untuk host, tidak diucapkan), transition (kalimat peralihan).
Tulis kalimat yang enak diucapkan, tidak kaku, dan sambung dengan bagian di sekitar kursor. Jangan menulis judul bagian.
Instruksi tim: ${instruction}`,
  });
  if ("error" in res) return { error: res.error };
  await logActivity(ctx, "generated", "ai", scriptId, `Teks naskah untuk ${s.title}`);
  return { blocks: res.data.blocks.filter((b) => b.text.trim()) };
}
