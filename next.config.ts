import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Loghi lega/squadra e bandiere paese: arrivano tutti da qui nelle
        // risposte del backend.
        protocol: "https",
        hostname: "cdn.sportmonks.com",
      },
    ],
  },
};

export default nextConfig;
