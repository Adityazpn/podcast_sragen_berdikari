"use client";

import Link from "next/link";
import { FilePlus2, ListPlus, Mic2, Podcast, UserPlus } from "lucide-react";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownTrigger } from "@/components/ui/dropdown";

const tile =
  "flex items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left text-sm font-medium transition-colors hover:border-accent hover:bg-accent-soft/40";

export function QuickActions({ projects }: { projects: { id: string; name: string }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Link href="/projects/new" className={tile}>
        <Podcast className="size-5 text-accent" /> Create New Project
      </Link>
      {projects.length === 0 ? (
        <Link href="/projects/new" className={tile} title="Buat project terlebih dahulu">
          <Mic2 className="size-5 text-accent" /> Create New Episode
        </Link>
      ) : (
        <Dropdown>
          <DropdownTrigger className={tile}>
            <Mic2 className="size-5 text-accent" /> Create New Episode
          </DropdownTrigger>
          <DropdownContent align="start" className="max-h-72 overflow-y-auto">
            <DropdownLabel>Pilih project</DropdownLabel>
            {projects.map((p) => (
              <DropdownItem key={p.id} asChild>
                <Link href={`/projects/${p.id}/episodes/new`}>{p.name}</Link>
              </DropdownItem>
            ))}
          </DropdownContent>
        </Dropdown>
      )}
      <Link href="/guests/new" className={tile}>
        <UserPlus className="size-5 text-accent" /> Add New Guest
      </Link>
      <Link href="/scripts" className={tile}>
        <FilePlus2 className="size-5 text-accent" /> Create New Script
      </Link>
      <Link href="/questions" className={tile}>
        <ListPlus className="size-5 text-accent" /> Create New Questions
      </Link>
    </div>
  );
}
