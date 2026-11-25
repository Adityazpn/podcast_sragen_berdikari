"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateEpisodeStatus } from "@/app/(app)/projects/[projectId]/episodes/actions";
import { NativeSelect } from "@/components/ui/input";
import { EPISODE_STATUSES } from "@/lib/constants";
import type { EpisodeStatus } from "@/lib/types";

export function StatusSelect({ episodeId, status }: { episodeId: string; status: EpisodeStatus }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <NativeSelect
      aria-label="Ubah status episode"
      defaultValue={status}
      disabled={pending}
      className="h-8 w-40 text-xs"
      onChange={(e) => {
        const value = e.target.value as EpisodeStatus;
        start(async () => {
          const res = await updateEpisodeStatus(episodeId, value);
          if (res?.error) toast.error(res.error);
          else {
            toast.success("Status diperbarui");
            router.refresh();
          }
        });
      }}
    >
      {EPISODE_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </NativeSelect>
  );
}
