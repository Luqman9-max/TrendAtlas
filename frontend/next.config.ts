import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Vercel optimization
  output: "standalone",

  // Allow external images if needed
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },

  // Disable x-powered-by header
  poweredByHeader: false,
};

export default nextConfig;
