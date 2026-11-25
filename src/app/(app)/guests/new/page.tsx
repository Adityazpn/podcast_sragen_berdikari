import type { Metadata } from "next";
import { GuestForm } from "@/components/guests/guest-form";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Tambah narasumber" };

export default function NewGuestPage() {
  return (
    <>
      <PageHeader title="Tambah narasumber" description="Semua informasi diisi manual oleh tim." />
      <GuestForm />
    </>
  );
}
