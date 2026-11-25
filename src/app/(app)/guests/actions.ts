"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { getStudioContext } from "@/lib/session";
import { removeFile, uploadImage } from "@/lib/storage";
import type { ActionState } from "@/lib/types";
import { formToObject, optionalText, optionalUrl } from "@/lib/validation";

const guestSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(150),
  profession: optionalText(120),
  position: optionalText(120),
  company: optionalText(150),
  biography: optionalText(10000),
  background: optionalText(10000),
  career_journey: optionalText(10000),
  achievements: optionalText(10000),
  experiences: optionalText(10000),
  expertise: optionalText(500),
  website: optionalUrl,
  instagram: optionalUrl,
  youtube: optionalUrl,
  linkedin: optionalUrl,
  contact_email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || z.string().email().safeParse(v).success, "Email tidak valid"),
  contact_phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^[+0-9()\-\s]{6,40}$/.test(v), "Nomor telepon tidak valid"),
  notes: optionalText(10000),
});

export async function saveGuest(guestId: string | null, _: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = guestSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const ctx = await getStudioContext();
  const photo = formData.get("photo");
  const upload = await uploadImage(ctx, STORAGE_BUCKETS.guestPhotos, photo instanceof File ? photo : null);
  if (upload.error) return { fieldErrors: { photo: [upload.error] } };
  const removePhoto = formData.get("remove_photo") === "1";

  let id = guestId;
  if (guestId) {
    const { data: existing } = await ctx.supabase.from("guests").select("photo_path").eq("id", guestId).single();
    if (!existing) return { error: "Narasumber tidak ditemukan." };
    const patch: Record<string, unknown> = { ...parsed.data };
    if (upload.path) patch.photo_path = upload.path;
    else if (removePhoto) patch.photo_path = null;
    const { error } = await ctx.supabase.from("guests").update(patch).eq("id", guestId);
    if (error) return { error: `Gagal menyimpan: ${error.message}` };
    if (upload.path || removePhoto) await removeFile(ctx, STORAGE_BUCKETS.guestPhotos, existing.photo_path);
    await logActivity(ctx, "updated", "guest", guestId, parsed.data.name);
  } else {
    const { data, error } = await ctx.supabase
      .from("guests")
      .insert({ ...parsed.data, photo_path: upload.path ?? null, workspace_id: ctx.workspace.id, created_by: ctx.userId })
      .select("id")
      .single();
    if (error || !data) return { error: `Gagal menambah narasumber: ${error?.message}` };
    id = data.id;
    await logActivity(ctx, "created", "guest", id, parsed.data.name);
  }
  revalidatePath("/guests");
  revalidatePath("/dashboard");
  redirect(`/guests/${id}?saved=1`);
}

export async function deleteGuest(guestId: string): Promise<ActionState> {
  const ctx = await getStudioContext();
  const { data: guest } = await ctx.supabase.from("guests").select("name, photo_path").eq("id", guestId).single();
  if (!guest) return { error: "Narasumber tidak ditemukan." };
  const { error, count } = await ctx.supabase.from("guests").delete({ count: "exact" }).eq("id", guestId);
  if (error || !count) return { error: "Gagal menghapus narasumber." };
  await removeFile(ctx, STORAGE_BUCKETS.guestPhotos, guest.photo_path);
  await logActivity(ctx, "deleted", "guest", guestId, guest.name);
  revalidatePath("/guests");
  revalidatePath("/dashboard");
  return { ok: true };
}
