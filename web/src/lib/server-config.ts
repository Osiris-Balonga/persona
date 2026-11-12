import "server-only";

const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const serverConfig = {
  apiUpstreamOrigin: (process.env.PERSONA_API_UPSTREAM_URL?.trim() || "http://127.0.0.1:3000").replace(/\/+$/, ""),
  apiProxyToken: process.env.PERSONA_API_PROXY_TOKEN,
  siteOrigin: (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (vercelHost ? `https://${vercelHost}` : "http://localhost:3000")
  ).replace(/\/+$/, ""),
  analyticsOrigin: (
    process.env.ANALYTICS_API_URL?.trim() ||
    "https://persona-analytics.osirisbalonga.workers.dev"
  ).replace(/\/+$/, ""),
  analyticsReadToken: process.env.ANALYTICS_READ_TOKEN,
  analyticsEnvironment:
    process.env.ANALYTICS_ENVIRONMENT === "production"
      ? "production"
      : "staging",
} as const;
