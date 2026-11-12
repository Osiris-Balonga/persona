import { isIP } from "node:net";

const paths: Readonly<Record<string, string>> = {
  "/api": "/people", "/api/people": "/people", "/api/coverage": "/coverage", "/api/health": "/health",
};
const requestHeaders = ["accept", "if-none-match", "origin", "access-control-request-method", "access-control-request-headers"];
const responseHeaders = ["content-type", "cache-control", "etag", "vary", "allow", "retry-after",
  "x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset", "access-control-allow-origin",
  "access-control-allow-methods", "access-control-allow-headers", "access-control-expose-headers", "access-control-max-age"];

function error(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status, headers: {
    "cache-control": "no-store", "access-control-allow-origin": "*", "allow": "GET, HEAD, OPTIONS",
  } });
}

export async function proxyApiRequest(request: Request, options: { upstream: string; token: string; vercel?: boolean }, fetcher: typeof fetch = fetch): Promise<Response> {
  const incoming = new URL(request.url);
  const path = paths[incoming.pathname.replace(/\/+$/, "")];
  if (!path) return error(404, "NOT_FOUND", "Route not found");
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) return error(405, "METHOD_NOT_ALLOWED", "Method not allowed");

  let upstream: URL;
  try {
    upstream = new URL(options.upstream);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(upstream.hostname);
    if ((upstream.protocol !== "https:" && !(local && upstream.protocol === "http:")) ||
      upstream.username || upstream.password || upstream.search || upstream.hash || upstream.pathname !== "/" ||
      upstream.origin === incoming.origin || options.token.length < 32) throw new Error("Invalid proxy configuration");
  } catch { return error(503, "API_UNAVAILABLE", "API proxy is not configured"); }

  upstream.pathname = path;
  upstream.search = incoming.search;
  const headers = new Headers();
  for (const name of requestHeaders) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  headers.set("x-persona-proxy-token", options.token);
  // Vercel overwrites this header at its edge. Other hosts need their own verified adapter.
  const clientIp = request.headers.get("x-forwarded-for");
  if (options.vercel && clientIp && isIP(clientIp)) headers.set("x-persona-client-ip", clientIp);
  try {
    const response = await fetcher(upstream, { method: request.method, headers, cache: "no-store", redirect: "manual",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(15_000)]) });
    if (response.status >= 300 && response.status < 400 && response.status !== 304) {
      await response.body?.cancel();
      return error(502, "API_UNAVAILABLE", "Unable to reach the API");
    }
    const outgoing = new Headers();
    for (const name of responseHeaders) {
      const value = response.headers.get(name);
      if (value !== null) outgoing.set(name, value);
    }
    return new Response(request.method === "HEAD" ? null : response.body, { status: response.status, headers: outgoing });
  } catch { return error(502, "API_UNAVAILABLE", "Unable to reach the API"); }
}
