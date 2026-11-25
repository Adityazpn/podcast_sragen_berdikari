import type { EpisodeStatus } from "./types";

export const EPISODE_STATUSES: { value: EpisodeStatus; label: string; tone: "neutral" | "accent" | "success" | "warning" | "danger" | "primary" }[] = [
  { value: "idea", label: "Idea", tone: "neutral" },
  { value: "planning", label: "Planning", tone: "neutral" },
  { value: "script_draft", label: "Script Draft", tone: "warning" },
  { value: "ready_to_record", label: "Ready to Record", tone: "accent" },
  { value: "recorded", label: "Recorded", tone: "primary" },
  { value: "editing", label: "Editing", tone: "warning" },
  { value: "published", label: "Published", tone: "success" },
];

export const episodeStatusMeta = (s: EpisodeStatus) =>
  EPISODE_STATUSES.find((x) => x.value === s) ?? EPISODE_STATUSES[0]!;

export const PROJECT_CATEGORIES = [
  "Bisnis",
  "Teknologi",
  "Pendidikan",
  "Gaya Hidup",
  "Kesehatan",
  "Budaya",
  "Komunitas",
  "Hiburan",
  "Pemerintahan",
  "Lainnya",
];

export const COMMUNICATION_STYLES = ["Santai", "Formal", "Semi-formal", "Inspiratif", "Edukatif", "Humor"];

export const LANGUAGES = ["Bahasa Indonesia", "Bahasa Jawa", "English", "Campuran"];

export const STORAGE_BUCKETS = {
  covers: "project-covers",
  guestPhotos: "guest-photos",
  research: "research-files",
  assets: "episode-assets",
} as const;

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const QUESTION_CATEGORIES = [
  { value: "opening", label: "Opening Questions" },
  { value: "background", label: "Background Questions" },
  { value: "ice_breaking", label: "Ice Breaking" },
  { value: "career_journey", label: "Career Journey" },
  { value: "personal_experience", label: "Personal Experience" },
  { value: "main_topic", label: "Main Topic Questions" },
  { value: "challenges", label: "Challenges and Obstacles" },
  { value: "deep_discussion", label: "Deep Discussion" },
  { value: "emotional", label: "Emotional Questions" },
  { value: "reflection", label: "Reflection Questions" },
  { value: "future_vision", label: "Future Vision" },
  { value: "closing", label: "Closing Questions" },
] as const;
export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number]["value"];

export const QUESTION_PRIORITIES = [
  { value: "important", label: "Penting", tone: "danger" },
  { value: "normal", label: "Normal", tone: "neutral" },
  { value: "optional", label: "Opsional", tone: "accent" },
] as const;
export type QuestionPriority = (typeof QUESTION_PRIORITIES)[number]["value"];

export const QUESTION_STATUSES = [
  { value: "not_asked", label: "Belum ditanyakan" },
  { value: "asked", label: "Sudah ditanyakan" },
  { value: "skipped", label: "Dilewati" },
] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number]["value"];

export const RESEARCH_CATEGORIES = [
  { value: "personal_background", label: "Personal Background" },
  { value: "education", label: "Education" },
  { value: "career_journey", label: "Career Journey" },
  { value: "achievements", label: "Achievements" },
  { value: "business_experience", label: "Business Experience" },
  { value: "interesting_stories", label: "Interesting Stories" },
  { value: "important_facts", label: "Important Facts" },
  { value: "interview_angles", label: "Interview Angles" },
  { value: "topics_to_explore", label: "Topics to Explore" },
  { value: "sensitive_topics", label: "Sensitive Topics" },
  { value: "sources_references", label: "Sources and References" },
] as const;
export type ResearchCategory = (typeof RESEARCH_CATEGORIES)[number]["value"];

export const SOURCE_TYPES = [
  { value: "pdf", label: "PDF" },
  { value: "document", label: "Dokumen" },
  { value: "website", label: "Website" },
  { value: "youtube", label: "YouTube" },
  { value: "article", label: "Artikel" },
  { value: "other", label: "Lainnya" },
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number]["value"];

export const RESEARCH_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
];
export const MAX_RESEARCH_BYTES = 20 * 1024 * 1024;

export const FLOW_TYPES = [
  { value: "opening_transition", label: "Opening Transition" },
  { value: "question_transition", label: "Question Transition" },
  { value: "topic_bridge", label: "Topic Bridge" },
  { value: "follow_up_prompt", label: "Follow-up Prompt" },
  { value: "natural_prompt", label: "Natural Conversation Prompt" },
  { value: "backup_question", label: "Backup Question" },
  { value: "closing_transition", label: "Closing Transition" },
] as const;
export type FlowType = (typeof FLOW_TYPES)[number]["value"];

export const DIALOGUE_ROLES = [
  { value: "host", label: "HOST" },
  { value: "guest", label: "GUEST" },
  { value: "host_note", label: "HOST NOTE" },
  { value: "transition", label: "TRANSITION" },
] as const;
export type DialogueRole = (typeof DIALOGUE_ROLES)[number]["value"];

/** Kecepatan bicara rata-rata untuk estimasi durasi baca (kata per menit). */
export const SPEAKING_WPM = 130;

export const DEFAULT_RUNDOWN = [
  { title: "Opening", duration_minutes: 3 },
  { title: "Introduction", duration_minutes: 5 },
  { title: "Ice Breaking", duration_minutes: 5 },
  { title: "Main Discussion", duration_minutes: 25 },
  { title: "Deep Conversation", duration_minutes: 15 },
  { title: "Closing", duration_minutes: 5 },
];

export const labelOf = <T extends { value: string; label: string }>(list: readonly T[], v: string | null | undefined) =>
  list.find((x) => x.value === v)?.label ?? v ?? "-";

export const RECORDING_NOTE_TYPES = [
  { value: "live", label: "Live Note", tone: "neutral" },
  { value: "important_moment", label: "Important Moment", tone: "danger" },
  { value: "additional_question", label: "Additional Question", tone: "accent" },
  { value: "revisit_topic", label: "Topic to Revisit", tone: "warning" },
  { value: "timestamp", label: "Timestamp", tone: "primary" },
  { value: "checklist", label: "Checklist", tone: "neutral" },
  { value: "post_recording", label: "Post-Recording", tone: "success" },
] as const;
export type RecordingNoteType = (typeof RECORDING_NOTE_TYPES)[number]["value"];

export const DEFAULT_RECORDING_CHECKLIST = [
  "Mikrofon host & narasumber sudah dites",
  "Level audio aman (tidak clipping)",
  "Kamera & pencahayaan siap",
  "Rekaman cadangan (backup recorder) aktif",
  "HP dalam mode senyap",
  "Naskah & teleprompter siap",
  "Narasumber sudah di-briefing",
  "Izin publikasi narasumber sudah disetujui",
];
