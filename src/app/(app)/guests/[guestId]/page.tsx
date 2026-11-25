import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BookOpen, Briefcase, Camera, Download, Globe, Mail, Pencil, Phone, UserRound, Video } from "lucide-react";
import { StatusBadge } from "@/components/episodes/status-badge";
import { GuestDeleteButton } from "@/components/guests/guest-delete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SavedToast } from "@/components/ui/saved-toast";
import { ACTION_LABEL } from "@/lib/activity";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { getStudioContext } from "@/lib/session";
import { signedUrls } from "@/lib/storage";
import type { EpisodeStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Narasumber" };

export default async function GuestDetailPage({ params }: { params: Promise<{ guestId: string }> }) {
  const { guestId } = await params;
  const ctx = await getStudioContext();
  const [{ data: g }, { data: episodes }, { data: history }] = await Promise.all([
    ctx.supabase.from("guests").select("*").eq("id", guestId).maybeSingle(),
    ctx.supabase
      .from("episodes")
      .select("id, title, episode_number, status, recording_date, project:podcast_projects(id, name)")
      .eq("guest_id", guestId)
      .order("recording_date", { ascending: false, nullsFirst: false }),
    ctx.supabase
      .from("activity_logs")
      .select("id, action, created_at, user:profiles(full_name)")
      .eq("entity_type", "guest")
      .eq("entity_id", guestId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  if (!g) notFound();
  const urls = await signedUrls(ctx, STORAGE_BUCKETS.guestPhotos, [g.photo_path]);
  const photo = g.photo_path ? urls[g.photo_path] : null;

  const links = [
    { icon: Globe, label: "Website", href: g.website },
    { icon: Camera, label: "Instagram", href: g.instagram },
    { icon: Video, label: "YouTube", href: g.youtube },
    { icon: Briefcase, label: "LinkedIn", href: g.linkedin },
  ].filter((l) => l.href);

  const sections = [
    ["Biography", g.biography],
    ["Background", g.background],
    ["Career Journey", g.career_journey],
    ["Achievements", g.achievements],
    ["Experiences", g.experiences],
    ["Guest Notes", g.notes],
  ] as const;

  const expertise = (g.expertise ?? "").split(",").map((s: string) => s.trim()).filter(Boolean);

  return (
    <>
      <SavedToast />
      <div className="mb-2 text-sm text-secondary">
        <Link href="/guests" className="hover:text-primary">
          Guest Database
        </Link>
      </div>
      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={g.name} className="size-full object-cover" />
          ) : (
            <UserRound className="size-10 text-secondary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{g.name}</h1>
          <p className="text-secondary">{[g.profession, g.position, g.company].filter(Boolean).join(" · ") || "-"}</p>
          {expertise.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {expertise.map((e: string) => (
                <Badge key={e} tone="accent">
                  {e}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/research?guest=${g.id}`}>
              <BookOpen /> Riset
            </Link>
          </Button>
          <Button asChild variant="outline">
            <a href={`/api/export/guest/${g.id}?format=pdf`}>
              <Download /> PDF
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/guests/${g.id}/edit`}>
              <Pencil /> Edit
            </Link>
          </Button>
          <GuestDeleteButton guestId={g.id} name={g.name} episodeCount={episodes?.length ?? 0} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {sections.map(([title, body]) => (
            <Card key={title}>
              <CardHeader>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-line text-sm leading-relaxed text-secondary">{body || "Belum diisi."}</CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Kontak & tautan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {g.contact_email && (
                <a href={`mailto:${g.contact_email}`} className="flex items-center gap-2 hover:text-accent">
                  <Mail className="size-4 text-secondary" /> {g.contact_email}
                </a>
              )}
              {g.contact_phone && (
                <a href={`tel:${g.contact_phone}`} className="flex items-center gap-2 hover:text-accent">
                  <Phone className="size-4 text-secondary" /> {g.contact_phone}
                </a>
              )}
              {links.map((l) => (
                <a key={l.label} href={l.href!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-accent">
                  <l.icon className="size-4 text-secondary" /> {l.label}
                </a>
              ))}
              {!g.contact_email && !g.contact_phone && links.length === 0 && <p className="text-secondary">Belum ada kontak.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Previous Episodes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {episodes && episodes.length > 0 ? (
                episodes.map((e) => {
                  const p = e.project as unknown as { id: string; name: string };
                  return (
                    <Link key={e.id} href={`/projects/${p.id}/episodes/${e.id}`} className="block rounded-lg border border-border p-3 hover:border-accent">
                      <p className="font-medium">{e.title}</p>
                      <p className="text-xs text-secondary">
                        {p.name} · {formatDate(e.recording_date)}
                      </p>
                      <div className="mt-1.5">
                        <StatusBadge status={e.status as EpisodeStatus} />
                      </div>
                    </Link>
                  );
                })
              ) : (
                <p className="text-secondary">Belum pernah tampil di episode.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Guest History</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm">
                <li className="text-secondary">Ditambahkan {formatDate(g.created_at, true)}</li>
                {(history ?? []).map((h) => (
                  <li key={h.id} className="text-secondary">
                    <span className="text-primary">{(h.user as unknown as { full_name: string } | null)?.full_name ?? "Seseorang"}</span>{" "}
                    {ACTION_LABEL[h.action] ?? h.action} data · {formatDate(h.created_at, true)}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
