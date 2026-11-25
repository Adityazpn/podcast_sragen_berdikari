"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveNote, saveSource } from "@/app/(app)/research/actions";
import { FormAlert } from "@/app/(auth)/auth-form";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { MAX_RESEARCH_BYTES, RESEARCH_CATEGORIES, RESEARCH_FILE_TYPES, SOURCE_TYPES, STORAGE_BUCKETS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

export type Option = { id: string; label: string };

export interface NoteData {
  id: string;
  category: string;
  title: string;
  content: string;
  guest_id: string | null;
  episode_id: string | null;
}

function LinkFields({
  guests,
  episodes,
  guestId,
  episodeId,
  error,
}: {
  guests: Option[];
  episodes: Option[];
  guestId?: string | null;
  episodeId?: string | null;
  error?: string[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Narasumber" htmlFor="guest_id" error={error}>
        <NativeSelect id="guest_id" name="guest_id" defaultValue={guestId ?? ""}>
          <option value="">Tidak dihubungkan</option>
          {guests.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Episode" htmlFor="episode_id">
        <NativeSelect id="episode_id" name="episode_id" defaultValue={episodeId ?? ""}>
          <option value="">Tidak dihubungkan</option>
          {episodes.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
    </div>
  );
}

export function NoteForm({
  note,
  guests,
  episodes,
  defaults,
  onDone,
}: {
  note?: NoteData;
  guests: Option[];
  episodes: Option[];
  defaults: { guest?: string; episode?: string; category?: string };
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(saveNote.bind(null, note?.id ?? null), null);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state?.ok ? null : state} />
      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        <Field label="Judul *" htmlFor="title" error={fe.title}>
          <Input id="title" name="title" defaultValue={note?.title} required autoFocus maxLength={200} />
        </Field>
        <Field label="Kategori" htmlFor="category" error={fe.category}>
          <NativeSelect id="category" name="category" defaultValue={note?.category ?? defaults.category ?? "personal_background"}>
            {RESEARCH_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Catatan" htmlFor="content" error={fe.content}>
        <Textarea id="content" name="content" rows={10} defaultValue={note?.content} placeholder="Tulis hasil riset Anda di sini..." />
      </Field>
      <LinkFields
        guests={guests}
        episodes={episodes}
        guestId={note ? note.guest_id : defaults.guest}
        episodeId={note ? note.episode_id : defaults.episode}
        error={fe.guest_id}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Batal
        </Button>
        <Button type="submit" loading={pending}>
          Simpan catatan
        </Button>
      </div>
    </form>
  );
}

export function SourceForm({
  workspaceId,
  guests,
  episodes,
  defaults,
  onDone,
}: {
  workspaceId: string;
  guests: Option[];
  episodes: Option[];
  defaults: { guest?: string; episode?: string };
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(saveSource, null);
  const [type, setType] = useState("website");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [filePath, setFilePath] = useState("");
  const [fileName, setFileName] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const isFile = type === "pdf" || type === "document";

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const upload = async (file: File) => {
    setUploadError(null);
    setFilePath("");
    if (!RESEARCH_FILE_TYPES.includes(file.type)) return setUploadError("Jenis file tidak didukung. Gunakan PDF, Word, PowerPoint, Excel, TXT, atau gambar.");
    if (file.size > MAX_RESEARCH_BYTES) return setUploadError("Ukuran file maksimal 20 MB.");
    setUploading(true);
    const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "bin";
    const path = `${workspaceId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient().storage.from(STORAGE_BUCKETS.research).upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) return setUploadError(`Gagal mengunggah: ${error.message}`);
    setFilePath(path);
    setFileName(file.name);
    if (titleRef.current && !titleRef.current.value) titleRef.current.value = file.name.replace(/\.[^.]+$/, "");
  };

  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state?.ok ? null : state} />
      <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
        <Field label="Jenis" htmlFor="type" error={fe.type}>
          <NativeSelect id="type" name="type" value={type} onChange={(e) => setType(e.target.value)}>
            {SOURCE_TYPES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Judul *" htmlFor="title" error={fe.title}>
          <Input ref={titleRef} id="title" name="title" required maxLength={200} />
        </Field>
      </div>
      {isFile ? (
        <Field label="File" htmlFor="file" error={uploadError ?? fe.url} hint="PDF, Word, PowerPoint, Excel, TXT, atau gambar. Maksimal 20 MB.">
          <Input
            id="file"
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
            disabled={uploading}
          />
          {uploading && <p className="text-xs text-secondary">Mengunggah...</p>}
          {filePath && <p className="text-xs text-success">Terunggah: {fileName}</p>}
        </Field>
      ) : (
        <Field label="URL" htmlFor="url" error={fe.url}>
          <Input id="url" name="url" type="url" placeholder="https://" />
        </Field>
      )}
      <input type="hidden" name="file_path" value={isFile ? filePath : ""} />
      <Field label="Catatan singkat" htmlFor="notes">
        <Textarea id="notes" name="notes" rows={2} maxLength={5000} />
      </Field>
      <LinkFields guests={guests} episodes={episodes} guestId={defaults.guest} episodeId={defaults.episode} error={fe.guest_id} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Batal
        </Button>
        <Button type="submit" loading={pending} disabled={uploading || (isFile && !filePath)}>
          Simpan sumber
        </Button>
      </div>
    </form>
  );
}
