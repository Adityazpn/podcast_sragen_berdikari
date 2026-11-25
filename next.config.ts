import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Upload gambar (cover, foto narasumber, avatar) lewat server action.
    // Vercel membatasi body request ±4,5 MB, jadi gambar dibatasi 4 MB.
    serverActions: { bodySizeLimit: "4mb" },
  },
  // @react-pdf/renderer dijalankan di server (route export), jangan di-bundle.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
