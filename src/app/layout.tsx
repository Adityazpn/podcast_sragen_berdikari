import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Sukowati Berdikari", template: "%s · Sukowati Berdikari" },
  description: "Sukowati Berdikari — Ruang Cerita Perjalanan & Masa Depan. Ruang kerja produksi podcast.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className="min-h-screen antialiased">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
