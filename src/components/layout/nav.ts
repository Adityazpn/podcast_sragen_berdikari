import {
  Archive,
  BookOpen,
  FileText,
  LayoutDashboard,
  ListChecks,
  ListOrdered,
  type LucideIcon,
  MonitorPlay,
  Podcast,
  Settings,
  UserSquare2,
  Users,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Fase pengembangan. Item dengan fase > CURRENT_PHASE ditampilkan sebagai "Segera". */
  phase: number;
  adminOnly?: boolean;
}

export const CURRENT_PHASE = 2;

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, phase: 1 },
  { href: "/projects", label: "Podcast Projects", icon: Podcast, phase: 1 },
  { href: "/scripts", label: "Script Studio", icon: FileText, phase: 2 },
  { href: "/questions", label: "Question Builder", icon: ListChecks, phase: 2 },
  { href: "/guests", label: "Guest Database", icon: UserSquare2, phase: 1 },
  { href: "/research", label: "Research Notes", icon: BookOpen, phase: 2 },
  { href: "/rundown", label: "Episode Rundown", icon: ListOrdered, phase: 2 },
  { href: "/teleprompter", label: "Teleprompter", icon: MonitorPlay, phase: 3 },
  { href: "/archive", label: "Episode Archive", icon: Archive, phase: 2 },
  { href: "/team", label: "Team Management", icon: Users, phase: 3, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, phase: 1 },
];
