"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { saveEpisode } from "@/app/(app)/projects/[projectId]/episodes/actions";
import { FormAlert } from "@/app/(auth)/auth-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { EPISODE_STATUSES } from "@/lib/constants";
import type { Episode } from "@/lib/types";

/** ISO -> nilai input datetime-local dalam zona waktu browser. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EpisodeForm({
  projectId,
  episode,
  guests,
  defaults,
}: {
  projectId: string;
  episode?: Episode;
  guests: { id: string; name: string }[];
  defaults?: { host?: string | null; duration?: number | null; audience?: string | null; nextNumber?: number };
}) {
  const [state, action, pending] = useActionState(saveEpisode.bind(null, projectId, episode?.id ?? null), null);
  const [tz, setTz] = useState("");
  const [recording, setRecording] = useState("");
  useEffect(() => {
    setTz(String(new Date().getTimezoneOffset()));
    setRecording(toLocalInput(episode?.recording_date ?? null));
  }, [episode?.recording_date]);
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-6" noValidate>
      <FormAlert state={state} />
      <input type="hidden" name="tz_offset" value={tz} />
      <Card>
        <CardHeader>
          <CardTitle>Informasi episode</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-6">
          <Field label="Episode Title *" htmlFor="title" error={fe.title} className="sm:col-span-4">
            <Input id="title" name="title" defaultValue={episode?.title} required maxLength={200} />
          </Field>
          <Field label="Episode Number" htmlFor="episode_number" error={fe.episode_number} className="sm:col-span-2">
            <Input
              id="episode_number"
              name="episode_number"
              type="number"
              min={0}
              defaultValue={episode?.episode_number ?? defaults?.nextNumber ?? ""}
            />
          </Field>
          <Field label="Main Topic" htmlFor="main_topic" error={fe.main_topic} className="sm:col-span-3">
            <Input id="main_topic" name="main_topic" defaultValue={episode?.main_topic ?? ""} />
          </Field>
          <Field label="Episode Status" htmlFor="status" error={fe.status} className="sm:col-span-3">
            <NativeSelect id="status" name="status" defaultValue={episode?.status ?? "idea"}>
              {EPISODE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Description" htmlFor="description" error={fe.description} className="sm:col-span-6">
            <Textarea id="description" name="description" rows={3} defaultValue={episode?.description ?? ""} />
          </Field>
          <Field label="Episode Objective" htmlFor="objective" error={fe.objective} className="sm:col-span-6">
            <Textarea id="objective" name="objective" rows={2} defaultValue={episode?.objective ?? ""} />
          </Field>
          <Field label="Target Audience" htmlFor="target_audience" error={fe.target_audience} className="sm:col-span-6">
            <Input id="target_audience" name="target_audience" defaultValue={episode?.target_audience ?? defaults?.audience ?? ""} />
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Rekaman</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Guest" htmlFor="guest_id" error={fe.guest_id} hint={guests.length === 0 ? "Belum ada narasumber. Tambahkan di Guest Database." : undefined}>
            <NativeSelect id="guest_id" name="guest_id" defaultValue={episode?.guest_id ?? ""}>
              <option value="">Tanpa narasumber</option>
              {guests.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Host" htmlFor="host" error={fe.host}>
            <Input id="host" name="host" defaultValue={episode?.host ?? defaults?.host ?? ""} />
          </Field>
          <Field label="Recording Date" htmlFor="recording_date" error={fe.recording_date}>
            <Input
              id="recording_date"
              name="recording_date"
              type="datetime-local"
              value={recording}
              onChange={(e) => setRecording(e.target.value)}
            />
          </Field>
          <Field label="Recording Location" htmlFor="recording_location" error={fe.recording_location}>
            <Input id="recording_location" name="recording_location" defaultValue={episode?.recording_location ?? ""} />
          </Field>
          <Field label="Episode Duration (menit)" htmlFor="duration_minutes" error={fe.duration_minutes}>
            <Input
              id="duration_minutes"
              name="duration_minutes"
              type="number"
              min={1}
              max={1440}
              defaultValue={episode?.duration_minutes ?? defaults?.duration ?? ""}
            />
          </Field>
          <Field label="Publication Link" htmlFor="publication_link" error={fe.publication_link}>
            <Input id="publication_link" name="publication_link" type="url" placeholder="https://" defaultValue={episode?.publication_link ?? ""} />
          </Field>
        </CardContent>
      </Card>
      <div className="flex gap-2">
        <Button type="submit" loading={pending}>
          {episode ? "Simpan perubahan" : "Buat episode"}
        </Button>
        <Button asChild variant="outline">
          <Link href={episode ? `/projects/${projectId}/episodes/${episode.id}` : `/projects/${projectId}`}>Batal</Link>
        </Button>
      </div>
    </form>
  );
}
