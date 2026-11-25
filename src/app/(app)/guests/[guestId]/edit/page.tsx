import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GuestForm } from "@/components/guests/guest-form";
import { PageHeader } from "@/components/ui/page-header";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { getStudioContext } from "@/lib/session";
import { signedUrls } from "@/lib/storage";
import type { Guest } from "@/lib/types";

export const metadata: Metadata = { title: "Edit narasumber" };

export default async function EditGuestPage({ params }: { params: Promise<{ guestId: string }> }) {
  const { guestId } = await params;
  const ctx = await getStudioContext();
  const { data: guest } = await ctx.supabase.from("guests").select("*").eq("id", guestId).maybeSingle();
  if (!guest) notFound();
  const urls = await signedUrls(ctx, STORAGE_BUCKETS.guestPhotos, [guest.photo_path]);
  return (
    <>
      <PageHeader title="Edit narasumber" description={guest.name} />
      <GuestForm guest={guest as Guest} photoUrl={guest.photo_path ? urls[guest.photo_path] : null} />
    </>
  );
}
