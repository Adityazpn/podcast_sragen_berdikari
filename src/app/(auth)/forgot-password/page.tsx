"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { forgotPassword } from "../actions";
import { FormAlert, useAuthAction } from "../auth-form";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useAuthAction(forgotPassword);
  return (
    <>
      <h1 className="text-2xl font-semibold">Lupa password</h1>
      <p className="mt-1 text-sm text-secondary">Masukkan email akun Anda. Kami kirimkan link untuk membuat password baru.</p>
      <form action={action} className="mt-8 space-y-4" noValidate>
        <FormAlert state={state} />
        <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Button type="submit" className="w-full" loading={pending}>
          Kirim link reset
        </Button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-accent hover:underline">
          Kembali ke login
        </Link>
      </p>
    </>
  );
}
