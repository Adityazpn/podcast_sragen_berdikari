"use client";

import { useActionState, useEffect } from "react";
import { saveQuestion } from "@/app/(app)/questions/actions";
import { FormAlert } from "@/app/(auth)/auth-form";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect, Textarea } from "@/components/ui/input";
import { QUESTION_CATEGORIES, QUESTION_PRIORITIES, QUESTION_STATUSES } from "@/lib/constants";

export interface QuestionData {
  id: string;
  question: string;
  category: string;
  purpose: string | null;
  host_notes: string | null;
  priority: string;
  status: string;
  position: number;
  follow_ups: { id: string; question: string; status: string; position: number }[];
}

export function QuestionForm({
  episodeId,
  question,
  defaultCategory,
  onDone,
}: {
  episodeId: string;
  question?: QuestionData;
  defaultCategory?: string;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(saveQuestion.bind(null, episodeId, question?.id ?? null), null);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state?.ok ? null : state} />
      <Field label="Question *" htmlFor="question" error={fe.question}>
        <Textarea id="question" name="question" rows={3} defaultValue={question?.question} required autoFocus />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Category" htmlFor="category" error={fe.category}>
          <NativeSelect id="category" name="category" defaultValue={question?.category ?? defaultCategory ?? "main_topic"}>
            {QUESTION_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Priority" htmlFor="priority" error={fe.priority}>
          <NativeSelect id="priority" name="priority" defaultValue={question?.priority ?? "normal"}>
            {QUESTION_PRIORITIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Status" htmlFor="status" error={fe.status}>
          <NativeSelect id="status" name="status" defaultValue={question?.status ?? "not_asked"}>
            {QUESTION_STATUSES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Purpose" htmlFor="purpose" error={fe.purpose} hint="Apa yang ingin digali dari pertanyaan ini?">
        <Textarea id="purpose" name="purpose" rows={2} defaultValue={question?.purpose ?? ""} />
      </Field>
      <Field label="Host Notes" htmlFor="host_notes" error={fe.host_notes}>
        <Textarea id="host_notes" name="host_notes" rows={2} defaultValue={question?.host_notes ?? ""} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Batal
        </Button>
        <Button type="submit" loading={pending}>
          {question ? "Simpan" : "Tambah pertanyaan"}
        </Button>
      </div>
    </form>
  );
}
