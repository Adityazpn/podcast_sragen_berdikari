"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteGuest } from "@/app/(app)/guests/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";

export function GuestDeleteButton({ guestId, name, episodeCount }: { guestId: string; name: string; episodeCount: number }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      title="Hapus narasumber?"
      description={`Data "${name}" akan dihapus permanen.${episodeCount ? ` ${episodeCount} episode yang terhubung akan tetap ada, tetapi tanpa narasumber.` : ""}`}
      onConfirm={async () => {
        const res = await deleteGuest(guestId);
        if (res?.error) toast.error(res.error);
        else {
          toast.success("Narasumber dihapus");
          router.push("/guests");
        }
      }}
      trigger={
        <Button variant="outline" className="text-danger">
          <Trash2 /> Hapus
        </Button>
      }
    />
  );
}
