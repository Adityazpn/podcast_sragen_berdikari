import "server-only";
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "./constants";
import type { StudioContext } from "./session";

/** Validasi & unggah gambar ke bucket privat. Path selalu diawali workspace_id (dipakai oleh RLS storage). */
export async function uploadImage(
  ctx: Pick<StudioContext, "supabase" | "workspace">,
  bucket: string,
  file: File | null,
): Promise<{ path?: string; error?: string }> {
  if (!file || file.size === 0) return {};
  if (!IMAGE_TYPES.includes(file.type)) return { error: "Format gambar harus JPG, PNG, atau WEBP." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "Ukuran gambar maksimal 4 MB." };

  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `${ctx.workspace.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await ctx.supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return { error: `Gagal mengunggah gambar: ${error.message}` };
  return { path };
}

export async function removeFile(ctx: Pick<StudioContext, "supabase">, bucket: string, path: string | null) {
  if (!path) return;
  await ctx.supabase.storage.from(bucket).remove([path]);
}

/** Signed URL (1 jam) untuk menampilkan gambar privat. */
export async function signedUrls(
  ctx: Pick<StudioContext, "supabase">,
  bucket: string,
  paths: (string | null)[],
): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  if (unique.length === 0) return {};
  const { data } = await ctx.supabase.storage.from(bucket).createSignedUrls(unique, 3600);
  const out: Record<string, string> = {};
  data?.forEach((d) => {
    if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  });
  return out;
}
