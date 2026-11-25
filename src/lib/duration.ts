/** Format menit (boleh desimal) menjadi "m:ss" atau "h:mm:ss". Perhitungan biasa, bukan AI. */
export function clock(minutes: number) {
  const total = Math.round(minutes * 60);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function sumMinutes(values: (number | string | null | undefined)[]) {
  return values.reduce<number>((acc, v) => acc + (Number(v) || 0), 0);
}

export function humanMinutes(minutes: number) {
  const total = Math.round(minutes * 60);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts = [];
  if (h) parts.push(`${h} jam`);
  if (m) parts.push(`${m} menit`);
  if (s) parts.push(`${s} detik`);
  return parts.length ? parts.join(" ") : "0 menit";
}
