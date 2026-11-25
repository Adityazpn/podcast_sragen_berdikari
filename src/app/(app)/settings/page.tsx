import Link from "next/link";
import type { Metadata } from "next";
import { PasswordForm, ProfileForm, WorkspaceForm } from "@/components/settings/settings-forms";
import { PageHeader } from "@/components/ui/page-header";
import { getStudioContext } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

const TABS = [
  { key: "profile", label: "Profil" },
  { key: "account", label: "Akun & keamanan" },
  { key: "workspace", label: "Workspace" },
] as const;

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "profile" } = await searchParams;
  const ctx = await getStudioContext();
  let avatarUrl: string | null = null;
  if (ctx.profile.avatar_url) {
    const { data } = await ctx.supabase.storage.from("avatars").createSignedUrl(ctx.profile.avatar_url, 3600);
    avatarUrl = data?.signedUrl ?? null;
  }
  return (
    <>
      <PageHeader title="Settings" description="Kelola profil, keamanan akun, dan workspace." />
      <div role="tablist" className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            href={`/settings?tab=${t.key}`}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium",
              tab === t.key ? "border-accent text-accent" : "border-transparent text-secondary hover:text-primary",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <div className="max-w-2xl">
        {tab === "account" ? (
          <PasswordForm email={ctx.email} />
        ) : tab === "workspace" ? (
          <WorkspaceForm name={ctx.workspace.name} isAdmin={ctx.role === "admin"} />
        ) : (
          <ProfileForm fullName={ctx.profile.full_name} jobTitle={ctx.profile.job_title ?? ""} avatarUrl={avatarUrl} />
        )}
      </div>
    </>
  );
}
