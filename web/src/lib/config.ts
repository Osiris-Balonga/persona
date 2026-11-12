import { apiEndpoints } from "./api-url.ts";

const apiOrigin = (
  process.env.NEXT_PUBLIC_PERSONA_API_URL?.trim() ||
  "http://localhost:3001/api"
).replace(/\/+$/, "");

const repositoryUrl = "https://github.com/Osiris-Balonga/persona";
const portraitOrigin = "https://persona-portraits.osirisbalonga.workers.dev";

export const config = {
  portraitContextsEnabled: (process.env.NEXT_PUBLIC_PERSONA_PORTRAIT_CONTEXTS_ENABLED ?? "true") === "true",
  apiOrigin,
  peopleUrl: apiEndpoints(apiOrigin).people,
  repositoryUrl,
  apiDocsUrl: `${repositoryUrl}/blob/dev/api/docs/api.md`,
  examplePortraitUrl: `${portraitOrigin}/portraits/v1/thumbnail/p_1166.webp`,
} as const;
