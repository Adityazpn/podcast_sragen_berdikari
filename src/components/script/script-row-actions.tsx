"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteScript, duplicateScript } from "@/app/(app)/scripts/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";

export function ScriptRowActions({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <Dropdown>
        <DropdownTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Aksi untuk ${title}`} disabled={pending}>
            <MoreHorizontal />
          </Button>
        </DropdownTrigger>
        <DropdownContent>
          <DropdownItem
            onSelect={() =>
              start(async () => {
                const res = await duplicateScript(id);
                if (res?.error) toast.error(res.error);
                else {
                  toast.success("Script diduplikasi");
                  router.refresh();
                }
              })
            }
          >
            <Copy /> Duplikasi
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem danger onSelect={() => setConfirm(true)}>
            <Trash2 /> Hapus
          </DropdownItem>
        </DropdownContent>
      </Dropdown>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Hapus script?"
        description={`Script "${title}" akan dihapus permanen.`}
        onConfirm={async () => {
          const res = await deleteScript(id);
          if (res?.error) toast.error(res.error);
          else {
            toast.success("Script dihapus");
            router.refresh();
          }
        }}
      />
    </>
  );
}
