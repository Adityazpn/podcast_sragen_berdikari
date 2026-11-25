"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/constants";
import { getStudioContext } from "@/lib/session";
import type { ActionState } from "@/lib/types";
import { optionalText, passwordSchema, usernameSchema } from "@/lib/validation";

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  username: usernameSchema,
  job_title: optionalText(100),
});

export async function updateProfile(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = profileSchema.safeParse({
    full_name: formData.get("full_name"),
    username: formData.get("username") ?? "",
    job_title: formData.get("job_title") ?? "",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const ctx = await getStudioContext();

  const patch: Record<string, unknown> = { ...parsed.data };
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    if (!IMAGE_TYPES.includes(avatar.type)) return { fieldErrors: { avatar: ["Format harus JPG, PNG, atau WEBP."] } };
    if (avatar.size > MAX_IMAGE_BYTES) return { fieldErrors: { avatar: ["Ukuran maksimal 5 MB."] } };
    const ext = avatar.type === "image/jpeg" ? "jpg" : avatar.type.split("/")[1];
    const path = `${ctx.userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await ctx.supabase.storage.from("avatars").upload(path, avatar, { contentType: avatar.type });
    if (error) return { fieldErrors: { avatar: [`Gagal mengunggah: ${error.message}`] } };
    if (ctx.profile.avatar_url) await ctx.supabase.storage.from("avatars").remove([ctx.profile.avatar_url]);
    patch.avatar_url = path;
  }

  const { error } = await ctx.supabase.from("profiles").update(patch).eq("id", ctx.userId);
  if (error) {
    if (error.code === "23505") return { fieldErrors: { username: ["Username sudah dipakai"] } };
    return { error: `Gagal menyimpan profil: ${error.message}` };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Profil tersimpan." };
}

const passwordChangeSchema = z
  .object({ current: z.string().min(1, "Password saat ini wajib diisi"), password: passwordSchema, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Konfirmasi password tidak sama" });

export async function changePassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = passwordChangeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const ctx = await getStudioContext();

  // Verifikasi password lama sebelum mengganti.
  const { error: verifyError } = await ctx.supabase.auth.signInWithPassword({ email: ctx.email, password: parsed.data.current });
  if (verifyError) return { fieldErrors: { current: ["Password saat ini salah"] } };

  const { error } = await ctx.supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { fieldErrors: { password: ["Password baru harus berbeda"] } };
    return { error: "Gagal mengubah password." };
  }
  return { ok: true, message: "Password berhasil diubah." };
}

export async function updateWorkspace(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.string().trim().min(2, "Nama minimal 2 karakter").max(100).safeParse(formData.get("name"));
  if (!parsed.success) return { fieldErrors: { name: parsed.error.flatten().formErrors } };
  const ctx = await getStudioContext();
  if (ctx.role !== "admin") return { error: "Hanya admin yang dapat mengubah workspace." };
  const { error } = await ctx.supabase.from("workspaces").update({ name: parsed.data }).eq("id", ctx.workspace.id);
  if (error) return { error: `Gagal menyimpan: ${error.message}` };
  await logActivity(ctx, "updated", "workspace", ctx.workspace.id, parsed.data);
  revalidatePath("/", "layout");
  return { ok: true, message: "Workspace tersimpan." };
}
