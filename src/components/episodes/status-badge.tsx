import { Badge } from "@/components/ui/badge";
import { episodeStatusMeta } from "@/lib/constants";
import type { EpisodeStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: EpisodeStatus }) {
  const meta = episodeStatusMeta(status);
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
