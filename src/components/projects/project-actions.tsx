"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteProject, duplicateProject } from "@/app/(app)/projects/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";

export function ProjectActions({
  projectId,
  projectName,
  isAdmin,
  redirectAfterDelete,
}: {
  projectId: string;
  projectName: string;
  isAdmin: boolean;
  redirectAfterDelete?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const onDuplicate = () =>
    start(async () => {
      const res = await duplicateProject(projectId);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Project berhasil diduplikasi");
        if (res?.id) router.push(`/projects/${res.id}`);
      }
    });

  const onDelete = async () => {
    const res = await deleteProject(projectId);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Project dihapus");
      if (redirectAfterDelete) router.push("/projects");
      else router.refresh();
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Dropdown>
        <DropdownTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Aksi untuk ${projectName}`} disabled={pending}>
            <MoreHorizontal />
          </Button>
        </DropdownTrigger>
        <DropdownContent>
          <DropdownItem asChild>
            <Link href={`/projects/${projectId}/edit`}>
              <Pencil /> Edit
            </Link>
          </DropdownItem>
          <DropdownItem onSelect={onDuplicate}>
            <Copy /> Duplikasi
          </DropdownItem>
          {isAdmin && (
            <>
              <DropdownSeparator />
              <DropdownItem danger onSelect={() => setConfirmOpen(true)}>
                <Trash2 /> Hapus
              </DropdownItem>
            </>
          )}
        </DropdownContent>
      </Dropdown>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Hapus project?"
        description={`Project "${projectName}" beserta seluruh episode, naskah, pertanyaan, dan catatannya akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={onDelete}
      />
    </div>
  );
}
