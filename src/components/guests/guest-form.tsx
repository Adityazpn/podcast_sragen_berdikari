"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Trash2, UserRound } from "lucide-react";
import { saveGuest } from "@/app/(app)/guests/actions";
import { FormAlert } from "@/app/(auth)/auth-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { MAX_IMAGE_BYTES } from "@/lib/constants";
import type { Guest } from "@/lib/types";

type Key = keyof Guest;

export function GuestForm({ guest, photoUrl }: { guest?: Guest; photoUrl?: string | null }) {
  const [state, action, pending] = useActionState(saveGuest.bind(null, guest?.id ?? null), null);
  const [preview, setPreview] = useState<string | null>(photoUrl ?? null);
  const [removed, setRemoved] = useState(false);
  const fe = state?.fieldErrors ?? {};
  const v = (k: Key) => (guest?.[k] as string | null | undefined) ?? "";

  const text = (k: Key, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, className?: string) => (
    <Field label={label} htmlFor={k} error={fe[k]} className={className}>
      <Input id={k} name={k} defaultValue={v(k)} {...props} />
    </Field>
  );
  const area = (k: Key, label: string, rows = 4) => (
    <Field label={label} htmlFor={k} error={fe[k]} className="sm:col-span-2">
      <Textarea id={k} name={k} rows={rows} defaultValue={v(k)} />
    </Field>
  );

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_300px]" noValidate>
      <div className="space-y-6">
        <FormAlert state={state} />
        <Card>
          <CardHeader>
            <CardTitle>Identitas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {text("name", "Guest Name *", { required: true, maxLength: 150 }, "sm:col-span-2")}
            {text("profession", "Profession")}
            {text("position", "Position")}
            {text("company", "Company")}
            {text("expertise", "Expertise", { placeholder: "Pisahkan dengan koma" })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Profil & perjalanan</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {area("biography", "Biography", 5)}
            {area("background", "Background")}
            {area("career_journey", "Career Journey")}
            {area("achievements", "Achievements")}
            {area("experiences", "Experiences")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tautan & kontak</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {text("website", "Website", { type: "url", placeholder: "https://" })}
            {text("instagram", "Instagram", { type: "url", placeholder: "https://instagram.com/..." })}
            {text("youtube", "YouTube", { type: "url", placeholder: "https://youtube.com/..." })}
            {text("linkedin", "LinkedIn", { type: "url", placeholder: "https://linkedin.com/in/..." })}
            {text("contact_email", "Email", { type: "email" })}
            {text("contact_phone", "Telepon / WhatsApp", { type: "tel" })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Guest Notes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">{area("notes", "Catatan internal tim", 4)}</CardContent>
        </Card>
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Photo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="mx-auto flex size-40 items-center justify-center overflow-hidden rounded-full bg-muted">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Preview foto" className="size-full object-cover" />
              ) : (
                <UserRound className="size-12 text-secondary" />
              )}
            </div>
            <Input
              id="photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && f.size > MAX_IMAGE_BYTES) {
                  toast.error("Ukuran gambar maksimal 4 MB.");
                  e.target.value = "";
                  return;
                }
                setPreview(f ? URL.createObjectURL(f) : photoUrl ?? null);
                setRemoved(false);
              }}
            />
            <p className="text-xs text-secondary">JPG, PNG, atau WEBP. Maksimal 4 MB.</p>
            {fe.photo && <p className="text-xs text-danger">{fe.photo[0]}</p>}
            {guest?.photo_path && !removed && (
              <Button type="button" variant="ghost" size="sm" className="text-danger" onClick={() => { setRemoved(true); setPreview(null); }}>
                <Trash2 /> Hapus foto
              </Button>
            )}
            <input type="hidden" name="remove_photo" value={removed ? "1" : "0"} />
          </CardContent>
        </Card>
        <div className="sticky top-20 flex gap-2">
          <Button type="submit" loading={pending} className="flex-1">
            {guest ? "Simpan perubahan" : "Tambah narasumber"}
          </Button>
          <Button asChild variant="outline">
            <Link href={guest ? `/guests/${guest.id}` : "/guests"}>Batal</Link>
          </Button>
        </div>
      </div>
    </form>
  );
}
