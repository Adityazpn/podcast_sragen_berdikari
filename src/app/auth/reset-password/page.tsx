"use client";

import { APP_NAME, Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { resetPassword } from "@/app/(auth)/actions";
import { FormAlert, useAuthAction } from "@/app/(auth)/auth-form";

export default function ResetPasswordPage() {
  const [state, action, pending] = useAuthAction(resetPassword);
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2 font-semibold">
          <Logo size={40} priority />
          {APP_NAME}
        </div>
        <h1 className="text-2xl font-semibold">Buat password baru</h1>
        <form action={action} className="mt-8 space-y-4" noValidate>
          <FormAlert state={state} />
          <Field label="Password baru" htmlFor="password" error={state?.fieldErrors?.password} hint="Minimal 8 karakter, berisi huruf dan angka.">
            <Input id="password" name="password" type="password" autoComplete="new-password" required autoFocus />
          </Field>
          <Field label="Konfirmasi password" htmlFor="confirm" error={state?.fieldErrors?.confirm}>
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
          </Field>
          <Button type="submit" className="w-full" loading={pending}>
            Simpan password
          </Button>
        </form>
      </div>
    </div>
  );
}
