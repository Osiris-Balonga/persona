import "server-only";
import { summarizeUsage, usageWindow } from "@/lib/usage-stats-core";
import { serverConfig } from "@/lib/server-config";

export async function getUsageStats(now = new Date()) {
  const token = serverConfig.analyticsReadToken;
  if (!token) throw new Error("Analytics read token is not configured");

  const window = usageWindow(now);
  const environment = serverConfig.analyticsEnvironment;
  const query = new URLSearchParams({
    environment,
    from: window.from,
    to: window.to,
    granularity: "day",
  });
  const response = await fetch(`${serverConfig.analyticsOrigin}/v1/stats?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) throw new Error(`Analytics responded with ${response.status}`);
  return { ...summarizeUsage(await response.json(), window.today), window, environment };
}
