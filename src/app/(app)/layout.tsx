import { Brand, SidebarNav } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getStudioContext } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getStudioContext();
  let avatarUrl: string | null = null;
  if (ctx.profile.avatar_url) {
    const { data } = await ctx.supabase.storage.from("avatars").createSignedUrl(ctx.profile.avatar_url, 3600);
    avatarUrl = data?.signedUrl ?? null;
  }
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface p-4 lg:flex">
        <div className="mb-6 pt-1">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
        <p className="px-3 pt-4 text-xs text-secondary">Produksi manual, tanpa AI.</p>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          name={ctx.profile.full_name || ctx.email}
          email={ctx.email}
          avatarUrl={avatarUrl}
          role={ctx.role}
          workspaceName={ctx.workspace.name}
          workspaceId={ctx.workspace.id}
          workspaces={ctx.workspaces.map((w) => ({ id: w.workspace.id, name: w.workspace.name, role: w.role }))}
        />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
