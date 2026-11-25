"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ImagePlus, Trash2 } from "lucide-react";
import { saveProject } from "@/app/(app)/projects/actions";
import { FormAlert } from "@/app/(auth)/auth-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { COMMUNICATION_STYLES, LANGUAGES, PROJECT_CATEGORIES } from "@/lib/constants";
import type { PodcastProject } from "@/lib/types";

export function ProjectForm({ project, coverUrl }: { project?: PodcastProject; coverUrl?: string | null }) {
  const [state, action, pending] = useActionState(saveProject.bind(null, project?.id ?? null), null);
  const [preview, setPreview] = useState<string | null>(coverUrl ?? null);
  const [removed, setRemoved] = useState(false);
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_320px]" noValidate>
      <div className="space-y-6">
        <FormAlert state={state} />
        <Card>
          <CardHeader>
            <CardTitle>Informasi podcast</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Podcast Name *" htmlFor="name" error={fe.name} className="sm:col-span-2">
              <Input id="name" name="name" defaultValue={project?.name} required maxLength={120} />
            </Field>
            <Field label="Description" htmlFor="description" error={fe.description} className="sm:col-span-2">
              <Textarea id="description" name="description" rows={4} defaultValue={project?.description ?? ""} maxLength={2000} />
            </Field>
            <Field label="Category" htmlFor="category" error={fe.category}>
              <NativeSelect id="category" name="category" defaultValue={project?.category ?? ""}>
                <option value="">Pilih kategori</option>
                {PROJECT_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Main Topic" htmlFor="main_topic" error={fe.main_topic}>
              <Input id="main_topic" name="main_topic" defaultValue={project?.main_topic ?? ""} />
            </Field>
            <Field label="Target Audience" htmlFor="target_audience" error={fe.target_audience} className="sm:col-span-2">
              <Input id="target_audience" name="target_audience" defaultValue={project?.target_audience ?? ""} />
            </Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Format & gaya</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Podcast Language" htmlFor="language" error={fe.language}>
              <NativeSelect id="language" name="language" defaultValue={project?.language ?? "Bahasa Indonesia"}>
                {LANGUAGES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Communication Style" htmlFor="communication_style" error={fe.communication_style}>
              <NativeSelect id="communication_style" name="communication_style" defaultValue={project?.communication_style ?? ""}>
                <option value="">Pilih gaya</option>
                {COMMUNICATION_STYLES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Default Episode Duration (menit)" htmlFor="default_episode_duration" error={fe.default_episode_duration}>
              <Input
                id="default_episode_duration"
                name="default_episode_duration"
                type="number"
                min={1}
                max={1440}
                defaultValue={project?.default_episode_duration ?? ""}
              />
            </Field>
            <Field label="Host Name" htmlFor="host_name" error={fe.host_name}>
              <Input id="host_name" name="host_name" defaultValue={project?.host_name ?? ""} />
            </Field>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Cover</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Preview cover" className="size-full object-cover" />
              ) : (
                <ImagePlus className="size-8 text-secondary" />
              )}
            </div>
            <Input
              id="cover"
              name="cover"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setPreview(f ? URL.createObjectURL(f) : coverUrl ?? null);
                setRemoved(false);
              }}
            />
            <p className="text-xs text-secondary">JPG, PNG, atau WEBP. Maksimal 5 MB.</p>
            {fe.cover && <p className="text-xs text-danger">{fe.cover[0]}</p>}
            {project?.cover_path && !removed && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-danger"
                onClick={() => {
                  setRemoved(true);
                  setPreview(null);
                }}
              >
                <Trash2 /> Hapus cover
              </Button>
            )}
            <input type="hidden" name="remove_cover" value={removed ? "1" : "0"} />
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Button type="submit" loading={pending} className="flex-1">
            {project ? "Simpan perubahan" : "Buat project"}
          </Button>
          <Button asChild variant="outline">
            <Link href={project ? `/projects/${project.id}` : "/projects"}>Batal</Link>
          </Button>
        </div>
      </div>
    </form>
  );
}
