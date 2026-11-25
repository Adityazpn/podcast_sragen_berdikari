import Link from "next/link";
import type { Metadata } from "next";
import { History } from "lucide-react";
import { AddMemberButtons, MemberTable, ProjectAccess, type MemberRow } from "@/components/team/team-manager";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { NativeSelect } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { ACTION_LABEL, ENTITY_LABEL } from "@/lib/activity";
import { getStudioContext } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Team Management" };

const TABS = [
  { key: "members", label: "Anggota" },
  { key: "access", label: "Akses project" },
  { key: "activity", label: "Aktivitas tim" },
] as const;

const PAGE_SIZE = 50;

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; user?: string; type?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "members";
  const ctx = await getStudioContext();
  const isAdmin = ctx.role === "admin";
  const ws = ctx.workspace.id;

  const { data: rawMembers, error } = await ctx.supabase
    .from("workspace_members")
    .select("id, role, created_at, user_id, profile:profiles(full_name, username, email, job_title)")
    .eq("workspace_id", ws)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const members: MemberRow[] = (rawMembers ?? []).map((m) => {
    const p = m.profile as unknown as { full_name: string; username: string | null; email: string | null; job_title: string | null } | null;
    return {
      id: m.id,
      userId: m.user_id,
      role: m.role as MemberRow["role"],
      joinedAt: m.created_at,
      name: p?.full_name || p?.username || "Tanpa nama",
      username: p?.username ?? null,
      email: p?.email ?? null,
      jobTitle: p?.job_title ?? null,
      isOwner: m.user_id === ctx.workspace.owner_id,
      isSelf: m.user_id === ctx.userId,
    };
  });

  return (
    <>
      <PageHeader
        title="Team Management"
        description={`Kelola anggota, hak akses, dan riwayat aktivitas di ${ctx.workspace.name}.`}
        actions={isAdmin && tab === "members" ? <AddMemberButtons /> : undefined}
      />
      <div role="tablist" className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            href={`/team?tab=${t.key}`}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium",
              tab === t.key ? "border-accent text-accent" : "border-transparent text-secondary hover:text-primary",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "members" && <MemberTable members={members} isAdmin={isAdmin} />}
      {tab === "access" && <AccessTab ctx={ctx} members={members} isAdmin={isAdmin} />}
      {tab === "activity" && <ActivityTab ctx={ctx} members={members} sp={sp} />}
    </>
  );
}

async function AccessTab({
  ctx,
  members,
  isAdmin,
}: {
  ctx: Awaited<ReturnType<typeof getStudioContext>>;
  members: MemberRow[];
  isAdmin: boolean;
}) {
  const [projects, grants] = await Promise.all([
    ctx.supabase.from("podcast_projects").select("id, name, restricted").eq("workspace_id", ctx.workspace.id).order("name"),
    ctx.supabase.from("project_members").select("project_id, user_id").eq("workspace_id", ctx.workspace.id),
  ]);
  const err = projects.error ?? grants.error;
  if (err) throw new Error(err.message);
  return (
    <ProjectAccess
      isAdmin={isAdmin}
      projects={(projects.data ?? []).map((p) => ({ id: p.id, name: p.name, restricted: !!p.restricted }))}
      grants={(grants.data ?? []).map((g) => `${g.project_id}:${g.user_id}`)}
      members={members.filter((m) => m.role === "member")}
    />
  );
}

async function ActivityTab({
  ctx,
  members,
  sp,
}: {
  ctx: Awaited<ReturnType<typeof getStudioContext>>;
  members: MemberRow[];
  sp: { user?: string; type?: string; page?: string };
}) {
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  let q = ctx.supabase
    .from("activity_logs")
    .select("id, action, entity_type, entity_label, created_at, user_id", { count: "exact" })
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (sp.user && members.some((m) => m.userId === sp.user)) q = q.eq("user_id", sp.user);
  if (sp.type && sp.type in ENTITY_LABEL) q = q.eq("entity_type", sp.type);
  const { data, count, error } = await q;
  if (error) throw new Error(error.message);

  const nameOf = new Map(members.map((m) => [m.userId, m.name]));
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) => {
    const u = new URLSearchParams({ tab: "activity", page: String(p) });
    if (sp.user) u.set("user", sp.user);
    if (sp.type) u.set("type", sp.type);
    return `/team?${u}`;
  };

  // Kelompokkan per tanggal
  const groups = new Map<string, NonNullable<typeof data>>();
  for (const row of data ?? []) {
    const day = new Date(row.created_at).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    groups.set(day, [...(groups.get(day) ?? []), row]);
  }

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-end gap-3" action="/team">
        <input type="hidden" name="tab" value="activity" />
        <label className="text-sm">
          <span className="mb-1 block text-xs text-secondary">Anggota</span>
          <NativeSelect name="user" defaultValue={sp.user ?? ""} className="w-52">
            <option value="">Semua anggota</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-secondary">Jenis</span>
          <NativeSelect name="type" defaultValue={sp.type ?? ""} className="w-48">
            <option value="">Semua jenis</option>
            {Object.entries(ENTITY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </option>
            ))}
          </NativeSelect>
        </label>
        <button type="submit" className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90">
          Terapkan
        </button>
        <span className="ml-auto text-xs text-secondary">{total.toLocaleString("id-ID")} aktivitas</span>
      </form>

      {total === 0 ? (
        <EmptyState icon={History} title="Belum ada aktivitas" description="Aktivitas anggota (membuat, mengubah, menghapus) akan tercatat di sini." />
      ) : (
        <Card className="divide-y divide-border">
          {[...groups.entries()].map(([day, rows]) => (
            <div key={day}>
              <div className="bg-muted/60 px-4 py-2 text-xs font-medium text-secondary">{day}</div>
              <ul className="divide-y divide-border">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-baseline gap-3 px-4 py-2.5 text-sm">
                    <span className="w-12 shrink-0 text-xs tabular-nums text-secondary">
                      {new Date(r.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="min-w-0">
                      <span className="font-medium">{(r.user_id && nameOf.get(r.user_id)) || "Mantan anggota"}</span>{" "}
                      <span className="text-secondary">
                        {ACTION_LABEL[r.action] ?? r.action} {ENTITY_LABEL[r.entity_type] ?? r.entity_type}
                      </span>{" "}
                      {r.entity_label && <span className="break-words font-medium">{r.entity_label}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Card>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          {page > 1 ? <Link href={href(page - 1)} className="text-accent hover:underline">← Sebelumnya</Link> : <span />}
          <span className="text-secondary">
            Halaman {page} dari {pages}
          </span>
          {page < pages ? <Link href={href(page + 1)} className="text-accent hover:underline">Berikutnya →</Link> : <span />}
        </div>
      )}
    </div>
  );
}
