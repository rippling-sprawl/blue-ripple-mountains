import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "secure.livedownloads.com" },
      { protocol: "https", hostname: "play.nugs.net" },
    ],
  },
};

export default nextConfig;
