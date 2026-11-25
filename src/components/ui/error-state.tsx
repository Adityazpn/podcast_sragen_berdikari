"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "./button";

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-danger/20 bg-danger/5 px-6 py-14 text-center">
      <AlertTriangle className="mb-3 size-8 text-danger" />
      <h3 className="text-base font-semibold">Terjadi kesalahan</h3>
      <p className="mt-1 max-w-md text-sm text-secondary">{message ?? "Data gagal dimuat. Silakan coba lagi."}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          Coba lagi
        </Button>
      )}
    </div>
  );
}
