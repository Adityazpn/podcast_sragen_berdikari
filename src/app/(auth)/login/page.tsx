import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Login" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold">Masuk ke Sukowati Berdikari</h1>
      <p className="mt-1 text-sm text-secondary">Gunakan email atau username dan password akun Anda.</p>
      <div className="mt-8">
        <LoginForm next={next ?? "/dashboard"} linkError={error} />
      </div>
      <p className="mt-6 text-center text-sm text-secondary">
        Belum punya akun?{" "}
        <Link href="/register" className="font-medium text-accent hover:underline">
          Daftar
        </Link>
      </p>
    </>
  );
}
