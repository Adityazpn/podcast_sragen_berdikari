import Link from "next/link";
import type { Episode } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { EpisodeActions } from "./episode-actions";
import { StatusSelect } from "./status-select";

export function EpisodeTable({
  episodes,
  projectId,
}: {
  episodes: (Episode & { guest: { id: string; name: string } | null })[];
  projectId: string;
}) {
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-y border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-secondary">
            <th className="px-5 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Judul</th>
            <th className="px-3 py-2 font-medium">Narasumber</th>
            <th className="px-3 py-2 font-medium">Rekaman</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-5 py-2" />
          </tr>
        </thead>
        <tbody>
          {episodes.map((e) => (
            <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30">
              <td className="px-5 py-3 text-secondary">{e.episode_number ?? "-"}</td>
              <td className="px-3 py-3">
                <Link href={`/projects/${projectId}/episodes/${e.id}`} className="font-medium hover:text-accent">
                  {e.title}
                </Link>
              </td>
              <td className="px-3 py-3 text-secondary">
                {e.guest ? (
                  <Link href={`/guests/${e.guest.id}`} className="hover:text-accent">
                    {e.guest.name}
                  </Link>
                ) : (
                  "-"
                )}
              </td>
              <td className="px-3 py-3 text-secondary">{formatDate(e.recording_date)}</td>
              <td className="px-3 py-3">
                <StatusSelect key={e.status} episodeId={e.id} status={e.status} />
              </td>
              <td className="px-5 py-3 text-right">
                <EpisodeActions episodeId={e.id} projectId={projectId} title={e.title} archived={!!e.archived_at} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
