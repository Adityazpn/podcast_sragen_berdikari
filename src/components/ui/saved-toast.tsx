"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/** Menampilkan toast sekali bila URL mengandung ?saved=1, lalu membersihkan parameter. */
export function SavedToast({ message = "Perubahan tersimpan" }: { message?: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (params.get("saved") === "1") {
      toast.success(message);
      const next = new URLSearchParams(params);
      next.delete("saved");
      router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  }, [params, router, pathname, message]);
  return null;
}
