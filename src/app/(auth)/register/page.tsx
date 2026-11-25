"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { register } from "../actions";
import { FormAlert, useAuthAction } from "../auth-form";

export default function RegisterPage() {
  const [state, action, pending] = useAuthAction(register);
  return (
    <>
      <h1 className="text-2xl font-semibold">Buat akun</h1>
      <p className="mt-1 text-sm text-secondary">Akun baru otomatis mendapat workspace sendiri sebagai Admin.</p>
      <form action={action} className="mt-8 space-y-4" noValidate>
        <FormAlert state={state} />
        <Field label="Nama lengkap" htmlFor="full_name" error={state?.fieldErrors?.full_name}>
          <Input id="full_name" name="full_name" autoComplete="name" required />
        </Field>
        <Field label="Username" htmlFor="username" error={state?.fieldErrors?.username} hint="3–30 karakter: huruf, angka, titik, garis bawah. Bisa dipakai untuk login.">
          <Input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required />
        </Field>
        <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" htmlFor="password" error={state?.fieldErrors?.password} hint="Minimal 8 karakter, berisi huruf dan angka.">
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
        </Field>
        <Field label="Konfirmasi password" htmlFor="confirm" error={state?.fieldErrors?.confirm}>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
        </Field>
        <Button type="submit" className="w-full" loading={pending} disabled={state?.ok}>
          Daftar
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-secondary">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Masuk
        </Link>
      </p>
    </>
  );
}
