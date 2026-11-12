export function apiEndpoints(base: string) {
  const url = new URL(base);
  const path = url.pathname.replace(/\/+$/, "");
  const publicEntry = path.endsWith("/api");
  url.pathname = publicEntry ? path : `${path}/people`;
  const people = url.toString();
  url.pathname = `${path}/coverage`;
  return { people, coverage: url.toString() };
}
