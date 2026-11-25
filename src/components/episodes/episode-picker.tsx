"use client";

import { useRouter } from "next/navigation";
import { NativeSelect } from "@/components/ui/input";

/** Pemilih episode yang langsung membuka halaman `${base}/${episodeId}`. */
export function EpisodePicker({
  options,
  base,
  value,
  placeholder = "Pilih episode...",
}: {
  options: { id: string; label: string }[];
  base: string;
  value?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  return (
    <NativeSelect
      aria-label="Pilih episode"
      value={value ?? ""}
      onChange={(e) => e.target.value && router.push(`${base}/${e.target.value}`)}
      className="max-w-md"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </NativeSelect>
  );
}
