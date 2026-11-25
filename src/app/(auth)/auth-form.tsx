"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ActionState } from "@/lib/types";

export function useAuthAction(action: (s: ActionState, f: FormData) => Promise<ActionState>) {
  return useActionState(action, null);
}

export function FormAlert({ state }: { state: ActionState }) {
  if (!state) return null;
  if (state.error)
    return (
      <div role="alert" className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
        <AlertCircle className="mt-0.5 size-4 shrink-0" /> {state.error}
      </div>
    );
  if (state.message)
    return (
      <div role="status" className="flex items-start gap-2 rounded-lg border border-success/20 bg-success/5 p-3 text-sm text-success">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> {state.message}
      </div>
    );
  return null;
}
