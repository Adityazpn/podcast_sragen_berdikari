"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteEpisode,
  duplicateEpisode,
  setEpisodeArchived,
} from "@/app/(app)/projects/[projectId]/episodes/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";

export function EpisodeActions({
  episodeId,
  projectId,
  title,
  archived,
  redirectAfterDelete,
}: {
  episodeId: string;
  projectId: string;
  title: string;
  archived: boolean;
  redirectAfterDelete?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const run = (fn: () => Promise<{ error?: string } | null>, success: string, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (res?.error) toast.error(res.error);
      else {
        toast.success(success);
        after?.();
        router.refresh();
      }
    });

  return (
    <>
      <Dropdown>
        <DropdownTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Aksi untuk ${title}`} disabled={pending}>
            <MoreHorizontal />
          </Button>
        </DropdownTrigger>
        <DropdownContent>
          <DropdownItem asChild>
            <Link href={`/projects/${projectId}/episodes/${episodeId}/edit`}>
              <Pencil /> Edit
            </Link>
          </DropdownItem>
          <DropdownItem
            onSelect={() =>
              start(async () => {
                const res = await duplicateEpisode(episodeId);
                if (res?.error) toast.error(res.error);
                else {
                  toast.success("Episode diduplikasi");
                  router.push(`/projects/${projectId}/episodes/${res.id}`);
                }
              })
            }
          >
            <Copy /> Duplikasi
          </DropdownItem>
          <DropdownItem
            onSelect={() =>
              run(() => setEpisodeArchived(episodeId, !archived), archived ? "Episode dipulihkan" : "Episode diarsipkan")
            }
          >
            {archived ? <ArchiveRestore /> : <Archive />} {archived ? "Pulihkan" : "Arsipkan"}
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem danger onSelect={() => setConfirmOpen(true)}>
            <Trash2 /> Hapus
          </DropdownItem>
        </DropdownContent>
      </Dropdown>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Hapus episode?"
        description={`Episode "${title}" beserta naskah, pertanyaan, dan catatannya akan dihapus permanen. Gunakan "Arsipkan" bila hanya ingin menyembunyikannya.`}
        onConfirm={async () => {
          const res = await deleteEpisode(episodeId);
          if (res?.error) toast.error(res.error);
          else {
            toast.success("Episode dihapus");
            if (redirectAfterDelete) router.push(`/projects/${projectId}`);
            else router.refresh();
          }
        }}
      />
    </>
  );
}
