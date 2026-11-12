import type { NextConfig } from "next";
import path from "node:path";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  agentRules: false,
  turbopack: { root: path.resolve(__dirname) },
  skipTrailingSlashRedirect: true,
  env: {
    NEXT_PUBLIC_PERSONA_API_URL: process.env.NEXT_PUBLIC_PERSONA_API_URL ||
      (process.env.VERCEL_ENV === "production" ? "https://persona.osirisbalonga.me/api" :
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api` : "http://localhost:3001/api"),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "persona-portraits.osirisbalonga.workers.dev",
        pathname: "/portraits/v1/**",
      },
    ],
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
