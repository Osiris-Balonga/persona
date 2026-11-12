import { proxyApiRequest } from "@/lib/api-proxy";
import { serverConfig } from "@/lib/server-config";

export const runtime = "nodejs";

function handle(request: Request) {
  return proxyApiRequest(request, {
    upstream: serverConfig.apiUpstreamOrigin,
    token: serverConfig.apiProxyToken ?? "",
    vercel: process.env.VERCEL === "1",
  });
}

export { handle as GET, handle as HEAD, handle as OPTIONS, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
