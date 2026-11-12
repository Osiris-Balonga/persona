import assert from "node:assert/strict";
import test from "node:test";
import { proxyApiRequest } from "../src/lib/api-proxy.ts";

const options = { upstream: "https://legacy.example.test", token: "fixture-token-at-least-thirty-two-characters", vercel: true };

test("forwards the exact query and authenticated edge identity while removing caller credentials", async () => {
  let called = false;
  const response = await proxyApiRequest(new Request("https://persona.example.test/api?seed=a%20%26%20b&skinTone=&cursor=x%2By", {
    headers: { "x-forwarded-for": "198.51.100.8", "x-persona-client-ip": "203.0.113.1", "x-persona-proxy-token": "forged",
      cookie: "private=1", authorization: "Bearer private", "if-none-match": '"fixture"', origin: "https://client.example.test" },
  }), options, async (input, init) => {
    called = true;
    assert.equal(String(input), "https://legacy.example.test/people?seed=a%20%26%20b&skinTone=&cursor=x%2By");
    const headers = new Headers(init.headers);
    assert.equal(headers.get("x-persona-client-ip"), "198.51.100.8");
    assert.equal(headers.get("x-persona-proxy-token"), options.token);
    assert.equal(headers.get("if-none-match"), '"fixture"');
    assert.equal(headers.get("origin"), "https://client.example.test");
    assert.equal(headers.get("cookie"), null);
    assert.equal(headers.get("authorization"), null);
    assert.equal(init.redirect, "manual");
    assert.equal(init.cache, "no-store");
    return Response.json({ results: [{ id: "fixture" }], meta: { schemaVersion: "2" } }, {
      headers: { "cache-control": "no-store", "set-cookie": "upstream=private", "x-persona-proxy-token": "must-not-leak" },
    });
  });
  assert.equal(called, true);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(response.headers.get("x-persona-proxy-token"), null);
  assert.equal((await response.json()).meta.schemaVersion, "2");
});

test("preserves conditional responses, rate limits and CORS without caching random output", async () => {
  for (const status of [304, 429]) {
    const response = await proxyApiRequest(new Request("https://persona.example.test/api", { method: "GET" }), options,
      async () => new Response(status === 304 ? null : '{"error":{"code":"RATE_LIMITED"}}', { status, headers: {
        etag: '"fixture"', "retry-after": "60", "x-ratelimit-remaining": "0", "access-control-allow-origin": "*",
        "cache-control": status === 304 ? "private, no-cache" : "no-store",
      } }));
    assert.equal(response.status, status);
    assert.equal(response.headers.get("etag"), '"fixture"');
    assert.equal(response.headers.get("retry-after"), "60");
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
    assert.equal(response.headers.get("x-ratelimit-remaining"), "0");
    if (status === 304) assert.equal(await response.text(), "");
  }
});

test("routes only API resources and rejects writes or unknown paths before fetching", async () => {
  for (const [path, target] of [["/api/", "/people"], ["/api/people", "/people"], ["/api/coverage", "/coverage"], ["/api/health", "/health"]]) {
    const response = await proxyApiRequest(new Request(`https://persona.example.test${path}`, { method: "HEAD" }), options,
      async (url, init) => { assert.equal(new URL(url).pathname, target); assert.equal(init.method, "HEAD"); return new Response(null); });
    assert.equal(response.status, 200);
  }
  for (const [path, method, status] of [["/api/unknown", "GET", 404], ["/api", "POST", 405], ["/apiary", "GET", 404]]) {
    const response = await proxyApiRequest(new Request(`https://persona.example.test${path}`, { method }), options,
      async () => { assert.fail("must not fetch"); });
    assert.equal(response.status, status);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});

test("forwards browser preflights without converting their empty response to JSON", async () => {
  const response = await proxyApiRequest(new Request("https://persona.example.test/api", { method: "OPTIONS", headers: {
    origin: "https://client.example.test", "access-control-request-method": "GET", "access-control-request-headers": "if-none-match",
  } }), options, async (_url, init) => {
    assert.equal(init.method, "OPTIONS");
    assert.equal(new Headers(init.headers).get("access-control-request-method"), "GET");
    return new Response(null, { status: 204, headers: { "access-control-allow-methods": "GET, HEAD" } });
  });
  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
});

test("trusts an edge IP only on Vercel and never accepts a chain or forged custom IP", async () => {
  for (const [vercel, ip] of [[false, "198.51.100.1"], [true, "198.51.100.1, 203.0.113.1"], [true, "invalid"]]) {
    await proxyApiRequest(new Request("https://persona.example.test/api", { headers: {
      "x-forwarded-for": ip, "x-persona-client-ip": "203.0.113.99",
    } }), { ...options, vercel }, async (_url, init) => {
      assert.equal(new Headers(init.headers).get("x-persona-client-ip"), null);
      return new Response("{}");
    });
  }
});

test("fails closed on missing configuration, proxy loops and redirects without exposing upstream details", async () => {
  for (const invalid of [{ ...options, token: "" }, { ...options, upstream: "https://persona.example.test" },
    { ...options, upstream: "https://user:secret@legacy.example.test" }, { ...options, upstream: "https://legacy.example.test/api" }]) {
    const response = await proxyApiRequest(new Request("https://persona.example.test/api"), invalid, async () => assert.fail("must not fetch"));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  for (const fetcher of [async () => { throw new Error("private upstream details"); }, async () => new Response(null, {
    status: 307, headers: { location: "https://login.example.test/private" },
  })]) {
    const response = await proxyApiRequest(new Request("https://persona.example.test/api"), options, fetcher);
    assert.equal(response.status, 502);
    assert.doesNotMatch(await response.text(), /private|login\.example/);
  }
});
