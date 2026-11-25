import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Upload gambar (cover, foto narasumber, avatar) lewat server action.
    // Vercel membatasi body request ±4,5 MB, jadi gambar dibatasi 4 MB.
    serverActions: { bodySizeLimit: "4mb" },
  },
  // @react-pdf/renderer dijalankan di server (route export), jangan di-bundle.
  serverExternalPackages: ["@react-pdf/renderer"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
