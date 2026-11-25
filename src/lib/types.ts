export type Role = "admin" | "member";

export type EpisodeStatus =
  | "idea"
  | "planning"
  | "script_draft"
  | "ready_to_record"
  | "recorded"
  | "editing"
  | "published";

export interface Profile {
  id: string;
  full_name: string;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  job_title: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface PodcastProject {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  category: string | null;
  main_topic: string | null;
  target_audience: string | null;
  language: string | null;
  communication_style: string | null;
  default_episode_duration: number | null;
  host_name: string | null;
  cover_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Guest {
  id: string;
  workspace_id: string;
  name: string;
  photo_path: string | null;
  profession: string | null;
  position: string | null;
  company: string | null;
  biography: string | null;
  background: string | null;
  career_journey: string | null;
  achievements: string | null;
  experiences: string | null;
  expertise: string | null;
  website: string | null;
  instagram: string | null;
  youtube: string | null;
  linkedin: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Episode {
  id: string;
  workspace_id: string;
  project_id: string;
  guest_id: string | null;
  title: string;
  episode_number: number | null;
  main_topic: string | null;
  description: string | null;
  host: string | null;
  recording_date: string | null;
  recording_location: string | null;
  duration_minutes: number | null;
  target_audience: string | null;
  objective: string | null;
  status: EpisodeStatus;
  publication_link: string | null;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  workspace_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  created_at: string;
}

/** Hasil standar dari server action form. */
export type ActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  message?: string;
} | null;
