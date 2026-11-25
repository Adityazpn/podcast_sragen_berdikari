import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Search, UserRound, UserSquare2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, NativeSelect } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { getStudioContext } from "@/lib/session";
import { signedUrls } from "@/lib/storage";

export const metadata: Metadata = { title: "Guest Database" };

const SORTS = {
  name: { column: "name", ascending: true, label: "Nama (A–Z)" },
  newest: { column: "created_at", ascending: false, label: "Terbaru ditambahkan" },
  updated: { column: "updated_at", ascending: false, label: "Terakhir diperbarui" },
} as const;

export default async function GuestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; profession?: string; company?: string; sort?: string }>;
}) {
  const { q = "", profession = "", company = "", sort = "name" } = await searchParams;
  const ctx = await getStudioContext();
  const s = SORTS[sort as keyof typeof SORTS] ?? SORTS.name;

  let query = ctx.supabase
    .from("guests")
    .select("id, name, photo_path, profession, position, company, expertise, episodes(count)")
    .eq("workspace_id", ctx.workspace.id)
    .order(s.column, { ascending: s.ascending });
  const term = q.trim().replace(/[%,()]/g, " ");
  if (term) query = query.or(`name.ilike.%${term}%,company.ilike.%${term}%,expertise.ilike.%${term}%,position.ilike.%${term}%`);
  if (profession) query = query.eq("profession", profession);
  if (company) query = query.eq("company", company);

  const [{ data: guests, error }, { data: facets }] = await Promise.all([
    query,
    ctx.supabase.from("guests").select("profession, company").eq("workspace_id", ctx.workspace.id),
  ]);
  if (error) throw new Error(error.message);

  const professions = [...new Set((facets ?? []).map((f) => f.profession).filter(Boolean))].sort() as string[];
  const companies = [...new Set((facets ?? []).map((f) => f.company).filter(Boolean))].sort() as string[];
  const photos = await signedUrls(ctx, STORAGE_BUCKETS.guestPhotos, guests.map((g) => g.photo_path));
  const filtered = !!(q || profession || company);

  return (
    <>
      <PageHeader
        title="Guest Database"
        description="Database narasumber yang diisi manual oleh tim."
        actions={
          <Button asChild>
            <Link href="/guests/new">
              <Plus /> Tambah narasumber
            </Link>
          </Button>
        }
      />

      <form className="mb-6 grid gap-2 sm:grid-cols-[1fr_180px_180px_180px_auto]" role="search">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary" />
          <Input name="q" defaultValue={q} placeholder="Cari nama, perusahaan, keahlian..." className="pl-9" aria-label="Cari narasumber" />
        </div>
        <NativeSelect name="profession" defaultValue={profession} aria-label="Filter profesi">
          <option value="">Semua profesi</option>
          {professions.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </NativeSelect>
        <NativeSelect name="company" defaultValue={company} aria-label="Filter perusahaan">
          <option value="">Semua perusahaan</option>
          {companies.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </NativeSelect>
        <NativeSelect name="sort" defaultValue={sort} aria-label="Urutkan">
          {Object.entries(SORTS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </NativeSelect>
        <div className="flex gap-2">
          <Button type="submit" variant="outline">
            Terapkan
          </Button>
          {filtered && (
            <Button asChild variant="ghost">
              <Link href="/guests">Reset</Link>
            </Button>
          )}
        </div>
      </form>

      {guests.length === 0 ? (
        <EmptyState
          icon={UserSquare2}
          title={filtered ? "Tidak ada narasumber yang cocok" : "Belum ada narasumber"}
          description={filtered ? "Coba ubah kata kunci atau filter." : "Tambahkan narasumber pertama beserta profil dan risetnya."}
          action={
            !filtered && (
              <Button asChild>
                <Link href="/guests/new">
                  <Plus /> Tambah narasumber
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {guests.map((g) => {
            const photo = g.photo_path ? photos[g.photo_path] : null;
            const count = (g.episodes as unknown as { count: number }[])[0]?.count ?? 0;
            return (
              <Link key={g.id} href={`/guests/${g.id}`}>
                <Card className="flex h-full items-center gap-4 p-4 transition-shadow hover:shadow-md">
                  <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" className="size-full object-cover" />
                    ) : (
                      <UserRound className="size-6 text-secondary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{g.name}</p>
                    <p className="truncate text-sm text-secondary">{[g.position, g.company].filter(Boolean).join(" · ") || g.profession || "-"}</p>
                    <p className="mt-1 text-xs text-secondary">{count} episode</p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
