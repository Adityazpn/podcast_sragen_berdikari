import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Data tidak ditemukan"
      description="Data mungkin sudah dihapus atau Anda tidak punya akses."
      action={
        <Button asChild variant="outline">
          <Link href="/dashboard">Kembali ke Dashboard</Link>
        </Button>
      }
    />
  );
}
