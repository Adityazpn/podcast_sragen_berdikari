"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { REMEMBER_COOKIE } from "@/lib/supabase/config";
import type { ActionState } from "@/lib/types";
import { emailSchema, passwordSchema } from "@/lib/validation";

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${h.get("host")}`;
}

/** Hanya izinkan redirect ke path internal untuk mencegah open redirect. */
function safeNext(next: FormDataEntryValue | null) {
  const v = typeof next === "string" ? next : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/dashboard";
}

const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Password wajib diisi") });

export async function login(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const remember = formData.get("remember") === "on";
  const cookieStore = await cookies();
  // Diset sebelum sign-in agar cookie sesi ikut aturan "Ingat saya".
  cookieStore.set(REMEMBER_COOKIE, remember ? "1" : "0", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(remember ? { maxAge: 60 * 60 * 24 * 400 } : {}),
  });

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") return { error: "Email belum dikonfirmasi. Cek kotak masuk Anda." };
    // Pesan generik agar tidak membocorkan email mana yang terdaftar.
    return { error: "Email atau password salah." };
  }
  redirect(safeNext(formData.get("next")));
}

const registerSchema = z
  .object({
    full_name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
    email: emailSchema,
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Konfirmasi password tidak sama" });

export async function register(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${await siteUrl()}/auth/callback?next=/dashboard`,
    },
  });
  if (error) {
    if (error.code === "user_already_exists") return { error: "Email sudah terdaftar. Silakan login." };
    if (error.code === "weak_password") return { fieldErrors: { password: ["Password terlalu lemah"] } };
    return { error: "Pendaftaran gagal. Silakan coba lagi." };
  }
  if (data.session) redirect("/dashboard");
  return { ok: true, message: "Akun dibuat. Cek email Anda untuk konfirmasi sebelum login." };
}

export async function forgotPassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { fieldErrors: { email: parsed.error.flatten().formErrors } };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${await siteUrl()}/auth/callback?next=/auth/reset-password`,
  });
  // Selalu sukses agar tidak membocorkan email yang terdaftar.
  return { ok: true, message: "Jika email terdaftar, link reset password sudah dikirim." };
}

const resetSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Konfirmasi password tidak sama" });

export async function resetPassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Link reset sudah kedaluwarsa. Minta link baru." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { fieldErrors: { password: ["Password baru harus berbeda dari yang lama"] } };
    return { error: "Gagal mengubah password. Silakan coba lagi." };
  }
  redirect("/dashboard?password=updated");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(REMEMBER_COOKIE);
  redirect("/login");
}
