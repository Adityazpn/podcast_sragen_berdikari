"use client";

import { useActionState } from "react";
import { createScript } from "@/app/(app)/scripts/actions";
import { FormAlert } from "@/app/(auth)/auth-form";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { SCRIPT_TEMPLATES } from "@/lib/script/template";

export function NewScriptForm({ episodes, defaultEpisode }: { episodes: { id: string; label: string }[]; defaultEpisode?: string }) {
  const [state, action, pending] = useActionState(createScript, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_200px_auto] sm:items-end" noValidate>
      <div className="sm:col-span-4">
        <FormAlert state={state} />
      </div>
      <Field label="Episode" htmlFor="episode_id" error={state?.fieldErrors?.episode_id}>
        <NativeSelect id="episode_id" name="episode_id" defaultValue={defaultEpisode ?? ""} required>
          <option value="">Pilih episode...</option>
          {episodes.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Judul (opsional)" htmlFor="title">
        <Input id="title" name="title" maxLength={200} placeholder="Script — judul episode" />
      </Field>
      <Field label="Template" htmlFor="template">
        <NativeSelect id="template" name="template" defaultValue="full">
          {Object.entries(SCRIPT_TEMPLATES).map(([k, t]) => (
            <option key={k} value={k}>
              {t.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Button type="submit" loading={pending} disabled={episodes.length === 0}>
        Buat script
      </Button>
    </form>
  );
}
