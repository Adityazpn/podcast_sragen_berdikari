"use client";

import { useActionState, useState } from "react";
import { UserRound } from "lucide-react";
import { changePassword, updateProfile, updateWorkspace } from "@/app/(app)/settings/actions";
import { FormAlert } from "@/app/(auth)/auth-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";

export function ProfileForm({
  fullName,
  username,
  jobTitle,
  avatarUrl,
}: {
  fullName: string;
  username: string;
  jobTitle: string;
  avatarUrl: string | null;
}) {
  const [state, action, pending] = useActionState(updateProfile, null);
  const [preview, setPreview] = useState(avatarUrl);
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
        <CardDescription>Nama dan foto ini terlihat oleh anggota tim.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4" noValidate>
          <FormAlert state={state} />
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-muted">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="size-full object-cover" />
              ) : (
                <UserRound className="size-7 text-secondary" />
              )}
            </div>
            <Field label="Foto profil" htmlFor="avatar" error={state?.fieldErrors?.avatar} className="flex-1">
              <Input
                id="avatar"
                name="avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setPreview(f ? URL.createObjectURL(f) : avatarUrl);
                }}
              />
            </Field>
          </div>
          <Field label="Nama lengkap" htmlFor="full_name" error={state?.fieldErrors?.full_name}>
            <Input id="full_name" name="full_name" defaultValue={fullName} required />
          </Field>
          <Field label="Username" htmlFor="username" error={state?.fieldErrors?.username} hint="Dipakai untuk login. 3–30 karakter: huruf, angka, titik, garis bawah.">
            <Input id="username" name="username" defaultValue={username} autoCapitalize="none" spellCheck={false} required />
          </Field>
          <Field label="Jabatan di tim" htmlFor="job_title" error={state?.fieldErrors?.job_title}>
            <Input id="job_title" name="job_title" defaultValue={jobTitle} placeholder="Produser, Host, Researcher..." />
          </Field>
          <Button type="submit" loading={pending}>
            Simpan profil
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function PasswordForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(changePassword, null);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Settings</CardTitle>
        <CardDescription>Email login: {email}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4" noValidate key={state?.ok ? "done" : "form"}>
          <FormAlert state={state} />
          <Field label="Password saat ini" htmlFor="current" error={state?.fieldErrors?.current}>
            <Input id="current" name="current" type="password" autoComplete="current-password" />
          </Field>
          <Field label="Password baru" htmlFor="password" error={state?.fieldErrors?.password} hint="Minimal 8 karakter, berisi huruf dan angka.">
            <Input id="password" name="password" type="password" autoComplete="new-password" />
          </Field>
          <Field label="Konfirmasi password baru" htmlFor="confirm" error={state?.fieldErrors?.confirm}>
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" />
          </Field>
          <Button type="submit" loading={pending}>
            Ubah password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function WorkspaceForm({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const [state, action, pending] = useActionState(updateWorkspace, null);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace</CardTitle>
        <CardDescription>{isAdmin ? "Nama workspace tim produksi Anda." : "Hanya admin yang dapat mengubah workspace."}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4" noValidate>
          <FormAlert state={state} />
          <Field label="Nama workspace" htmlFor="ws-name" error={state?.fieldErrors?.name}>
            <Input id="ws-name" name="name" defaultValue={name} disabled={!isAdmin} />
          </Field>
          {isAdmin && (
            <Button type="submit" loading={pending}>
              Simpan workspace
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
