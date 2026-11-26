"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AiDisabledNote() {
  return (
    <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
      <p className="font-medium">Fitur AI belum aktif</p>
      <p className="mt-1 text-secondary">
        Admin perlu menambahkan <code className="rounded bg-muted px-1">ANTHROPIC_API_KEY</code> di Vercel (Settings → Environment Variables),
        lalu deploy ulang. Kunci didapat dari console.anthropic.com.
      </p>
    </div>
  );
}

export function AiBadge() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-secondary">
      <Sparkles className="size-3.5 text-accent" /> Draf dari AI (Claude). Selalu tinjau dan edit sebelum dipakai.
    </p>
  );
}

export function AiButton({ onClick, label, variant = "outline" }: { onClick: () => void; label: string; variant?: "outline" | "accent" }) {
  return (
    <Button variant={variant} onClick={onClick}>
      <Sparkles /> {label}
    </Button>
  );
}
