import "server-only";
import { EPISODE_STATUSES, labelOf, QUESTION_CATEGORIES, QUESTION_PRIORITIES, QUESTION_STATUSES, RESEARCH_CATEGORIES, SOURCE_TYPES } from "@/lib/constants";
import { clock, humanMinutes, sumMinutes } from "@/lib/duration";
import { docToBlocks, formatReading } from "@/lib/script/blocks";
import type { TNode } from "@/lib/script/types";
import type { createClient } from "@/lib/supabase/server";
import { formatDate, formatDuration } from "@/lib/utils";
import { field, h, p, type ExportBlock, type ExportDoc } from "./model";

type SB = Awaited<ReturnType<typeof createClient>>;

async function episodeMeta(sb: SB, episodeId: string) {
  const { data } = await sb
    .from("episodes")
    .select("id, title, episode_number, host, recording_date, duration_minutes, status, project:podcast_projects(name), guest:guests(name)")
    .eq("id", episodeId)
    .maybeSingle();
  if (!data) return null;
  const project = data.project as unknown as { name: string } | null;
  const guest = data.guest as unknown as { name: string } | null;
  const meta: [string, string][] = [
    ["Podcast", project?.name ?? "-"],
    ["Episode", `${data.episode_number != null ? `#${data.episode_number} ` : ""}${data.title}`],
  ];
  if (guest) meta.push(["Narasumber", guest.name]);
  if (data.host) meta.push(["Host", data.host]);
  if (data.recording_date) meta.push(["Rekaman", formatDate(data.recording_date, true)]);
  if (data.duration_minutes) meta.push(["Target durasi", formatDuration(data.duration_minutes)]);
  meta.push(["Status", labelOf(EPISODE_STATUSES, data.status)]);
  return { episode: data, meta };
}

export async function buildScriptDoc(sb: SB, scriptId: string): Promise<ExportDoc | null> {
  const { data: s } = await sb.from("scripts").select("title, content, word_count, status, updated_at, episode_id").eq("id", scriptId).maybeSingle();
  if (!s) return null;
  const em = await episodeMeta(sb, s.episode_id);
  return {
    title: s.title,
    subtitle: "Naskah Podcast",
    meta: [
      ...(em?.meta.filter(([k]) => k !== "Status") ?? []),
      ["Status naskah", s.status === "final" ? "Final" : "Draft"],
      ["Jumlah kata", `${s.word_count.toLocaleString("id-ID")} kata (± ${formatReading(s.word_count)})`],
      ["Terakhir diubah", formatDate(s.updated_at, true)],
    ],
    blocks: docToBlocks(s.content as TNode),
  };
}

export async function buildQuestionsDoc(sb: SB, episodeId: string): Promise<ExportDoc | null> {
  const em = await episodeMeta(sb, episodeId);
  if (!em) return null;
  const { data } = await sb
    .from("questions")
    .select("question, category, purpose, host_notes, priority, status, position, follow_up_questions(question, position)")
    .eq("episode_id", episodeId)
    .order("position");
  const qs = data ?? [];
  const blocks: ExportBlock[] = qs.map((q, i) => ({
    kind: "question" as const,
    number: i + 1,
    text: q.question,
    category: labelOf(QUESTION_CATEGORIES, q.category),
    badges: [
      ...(q.priority !== "normal" ? [labelOf(QUESTION_PRIORITIES, q.priority)] : []),
      labelOf(QUESTION_STATUSES, q.status),
    ],
    purpose: q.purpose,
    notes: q.host_notes,
    followUps: [...((q.follow_up_questions as { question: string; position: number }[]) ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((f) => f.question),
  }));
  if (!blocks.length) blocks.push(p("Belum ada pertanyaan."));
  return { title: `Daftar Pertanyaan — ${em.episode.title}`, subtitle: "Question Builder", meta: [...em.meta, ["Jumlah pertanyaan", String(qs.length)]], blocks };
}

export async function buildRundownDoc(sb: SB, episodeId: string): Promise<ExportDoc | null> {
  const em = await episodeMeta(sb, episodeId);
  if (!em) return null;
  const { data } = await sb.from("rundown_segments").select("title, duration_minutes, notes").eq("episode_id", episodeId).order("position");
  const segs = data ?? [];
  let t = 0;
  const rows = segs.map((sg, i) => {
    const start = t;
    t += Number(sg.duration_minutes) || 0;
    return [String(i + 1), clock(start), sg.title, `${Number(sg.duration_minutes)} menit`, sg.notes ?? ""];
  });
  const total = sumMinutes(segs.map((s) => s.duration_minutes));
  const blocks: ExportBlock[] = segs.length
    ? [
        {
          kind: "table",
          header: ["#", "Mulai", "Segmen", "Durasi", "Catatan"],
          rows,
          footer: ["", "", "Total", humanMinutes(total), ""],
          widths: [0.4, 0.8, 2.2, 1.2, 3],
        },
      ]
    : [p("Belum ada segmen rundown.")];
  return { title: `Rundown — ${em.episode.title}`, subtitle: "Episode Rundown", meta: [...em.meta, ["Total durasi rundown", `${clock(total)} (${humanMinutes(total)})`]], blocks };
}

export async function buildGuestDoc(sb: SB, guestId: string): Promise<ExportDoc | null> {
  const { data: g } = await sb.from("guests").select("*").eq("id", guestId).maybeSingle();
  if (!g) return null;
  const { data: eps } = await sb
    .from("episodes")
    .select("title, recording_date, project:podcast_projects(name)")
    .eq("guest_id", guestId)
    .order("recording_date", { ascending: false, nullsFirst: false });
  const meta: [string, string][] = [];
  if (g.profession) meta.push(["Profesi", g.profession]);
  if (g.position) meta.push(["Jabatan", g.position]);
  if (g.company) meta.push(["Perusahaan", g.company]);
  if (g.expertise) meta.push(["Keahlian", g.expertise]);
  if (g.contact_email) meta.push(["Email", g.contact_email]);
  if (g.contact_phone) meta.push(["Telepon", g.contact_phone]);
  const links = [
    ["Website", g.website],
    ["Instagram", g.instagram],
    ["YouTube", g.youtube],
    ["LinkedIn", g.linkedin],
  ].filter(([, v]) => v) as [string, string][];
  const blocks: ExportBlock[] = [
    ...field("Biography", g.biography),
    ...field("Background", g.background),
    ...field("Career Journey", g.career_journey),
    ...field("Achievements", g.achievements),
    ...field("Experiences", g.experiences),
    ...field("Guest Notes", g.notes),
  ];
  if (links.length) blocks.push(h("Tautan", 3), { kind: "table", header: ["Platform", "URL"], rows: links, widths: [1, 4] });
  if (eps?.length) {
    blocks.push(h("Episode", 3), {
      kind: "table",
      header: ["Episode", "Podcast", "Rekaman"],
      rows: eps.map((e) => [e.title, (e.project as unknown as { name: string } | null)?.name ?? "-", formatDate(e.recording_date)]),
      widths: [3, 2, 1.2],
    });
  }
  if (!blocks.length) blocks.push(p("Profil belum diisi."));
  return { title: g.name, subtitle: "Profil Narasumber", meta, blocks };
}

export async function buildResearchDoc(sb: SB, filter: { guest?: string; episode?: string }): Promise<ExportDoc | null> {
  let title = "Catatan Riset";
  const meta: [string, string][] = [];
  if (filter.guest) {
    const { data } = await sb.from("guests").select("name").eq("id", filter.guest).maybeSingle();
    if (!data) return null;
    title = `Catatan Riset — ${data.name}`;
    meta.push(["Narasumber", data.name]);
  }
  if (filter.episode) {
    const em = await episodeMeta(sb, filter.episode);
    if (!em) return null;
    if (!filter.guest) title = `Catatan Riset — ${em.episode.title}`;
    meta.push(...em.meta.filter(([k]) => k === "Podcast" || k === "Episode"));
  }
  let nq = sb.from("research_notes").select("category, title, content, position").order("position").order("created_at");
  let sq = sb.from("research_sources").select("type, title, url, file_path, notes").order("created_at");
  if (filter.guest) {
    nq = nq.eq("guest_id", filter.guest);
    sq = sq.eq("guest_id", filter.guest);
  }
  if (filter.episode) {
    nq = nq.eq("episode_id", filter.episode);
    sq = sq.eq("episode_id", filter.episode);
  }
  const [{ data: notes }, { data: sources }] = await Promise.all([nq, sq]);
  const blocks: ExportBlock[] = [];
  for (const c of RESEARCH_CATEGORIES) {
    const items = (notes ?? []).filter((n) => n.category === c.value);
    if (!items.length) continue;
    blocks.push(h(c.label));
    items.forEach((n) => blocks.push(...field(n.title, n.content || "-")));
  }
  if (sources?.length) {
    blocks.push(h("Sumber & Referensi"), {
      kind: "table",
      header: ["Jenis", "Judul", "Lokasi", "Catatan"],
      rows: sources.map((s) => [labelOf(SOURCE_TYPES, s.type), s.title, s.url ?? "(file terunggah)", s.notes ?? ""]),
      widths: [0.9, 2, 2.6, 2],
    });
  }
  if (!blocks.length) blocks.push(p("Belum ada catatan riset."));
  meta.push(["Jumlah catatan", String(notes?.length ?? 0)], ["Jumlah sumber", String(sources?.length ?? 0)]);
  return { title, subtitle: "Research Notes", meta, blocks };
}
