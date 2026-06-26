import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'isnmtnsibzlivqpqoifv.supabase.co',
      },
    ],
  },
};

export default nextConfig;
