"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, FileText, Info, ListChecks, ListOrdered, Route } from "lucide-react";
import { cn } from "@/lib/utils";

/** Navigasi ruang kerja satu episode. */
export function EpisodeTabs({ episodeId, projectId }: { episodeId: string; projectId: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/projects/${projectId}/episodes/${episodeId}`, label: "Ringkasan", icon: Info, exact: true },
    { href: `/scripts?episode=${episodeId}`, match: "/scripts", label: "Script", icon: FileText },
    { href: `/questions/${episodeId}`, label: "Pertanyaan", icon: ListChecks },
    { href: `/flow/${episodeId}`, label: "Alur Percakapan", icon: Route },
    { href: `/rundown/${episodeId}`, label: "Rundown", icon: ListOrdered },
    { href: `/research?episode=${episodeId}`, match: "/research", label: "Riset", icon: BookOpen },
  ];
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-border" aria-label="Ruang kerja episode">
      {tabs.map((t) => {
        const target = t.match ?? t.href;
        const active = t.exact ? pathname === t.href : pathname.startsWith(target);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium",
              active ? "border-accent text-accent" : "border-transparent text-secondary hover:text-primary",
            )}
          >
            <t.icon className="size-4" /> {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function EpisodeHeading({
  episode,
  section,
  actions,
}: {
  episode: { id: string; title: string; episode_number: number | null; project: { id: string; name: string }; guest: { name: string } | null };
  section: string;
  actions?: React.ReactNode;
}) {
  return (
    <>
      <div className="mb-1 text-sm text-secondary">
        <Link href={`/projects/${episode.project.id}`} className="hover:text-primary">
          {episode.project.name}
        </Link>{" "}
        /{" "}
        <Link href={`/projects/${episode.project.id}/episodes/${episode.id}`} className="hover:text-primary">
          {episode.episode_number != null ? `#${episode.episode_number} ` : ""}
          {episode.title}
        </Link>
      </div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{section}</h1>
          {episode.guest && <p className="text-sm text-secondary">Narasumber: {episode.guest.name}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <EpisodeTabs episodeId={episode.id} projectId={episode.project.id} />
    </>
  );
}
