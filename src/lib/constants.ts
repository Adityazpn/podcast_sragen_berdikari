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

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
