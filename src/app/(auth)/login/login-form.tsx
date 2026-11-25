"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { login } from "../actions";
import { FormAlert, useAuthAction } from "../auth-form";

export function LoginForm({ next, linkError }: { next: string; linkError?: string }) {
  const [state, action, pending] = useAuthAction(login);
  return (
    <form action={action} className="space-y-4" noValidate>
      {linkError && !state && <FormAlert state={{ error: "Link tidak valid atau sudah kedaluwarsa." }} />}
      <FormAlert state={state} />
      <input type="hidden" name="next" value={next} />
      <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      <Field label="Password" htmlFor="password" error={state?.fieldErrors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="remember" defaultChecked className="size-4 rounded accent-accent" />
          Ingat saya
        </label>
        <Link href="/forgot-password" className="text-sm text-accent hover:underline">
          Lupa password?
        </Link>
      </div>
      <Button type="submit" className="w-full" loading={pending}>
        Masuk
      </Button>
    </form>
  );
}
