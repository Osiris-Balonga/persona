export type PlaygroundPerson = {
  id?: string;
  gender?: string;
  name?: { first?: string; last?: string; full?: string };
  nationality?: string;
  dob?: { date?: string; age?: number; ageGroup?: string };
  location?: {
    city?: string | null;
    state?: string | null;
    country?: { code?: string; name?: string };
    formatted?: string;
  };
  email?: string | null;
  phone?: string | null;
  picture?: { large?: string; medium?: string; thumbnail?: string } | null;
};

export type PlaygroundResponse = {
  results: PlaygroundPerson[];
  meta?: {
    count?: number;
    asOf?: string;
    seed?: string | null;
    schemaVersion?: string;
    dataVersion?: string;
    catalogVersion?: string;
  };
};

export type ApiError = {
  error?: { code?: string; message?: string; parameter?: string };
};

const parameterGuidanceKeys: Record<string, string> = {
  count: "errorParamCount",
  gender: "errorParamGender",
  ageGroup: "errorParamAgeGroup",
  continent: "errorParamContinent",
  nationality: "errorParamNationality",
  residenceCountry: "errorParamResidenceCountry",
  city: "errorParamCity",
  emailDomain: "errorParamEmailDomain",
  seed: "errorParamSeed",
  asOf: "errorParamAsOf",
  fields: "errorParamFields",
  portraitContext: "errorParamPortraitContext",
  portraitContexts: "errorParamPortraitContexts",
  skinTone: "errorParamSkinTone",
  query: "errorParamQuery",
};

export type PlaygroundFailure = {
  titleKey: string;
  guidanceKey: string;
  retryAfter: string;
  rawPayload: unknown;
};

export function mapPlaygroundFailure(
  status: number | null,
  payload: unknown,
  retryAfter = "",
  cause?: "offline" | "timeout" | "invalidResponse",
): PlaygroundFailure {
  const safeRetryAfter = /^\d{1,5}$/.test(retryAfter) ? retryAfter : "";
  const fallback = {
    titleKey: cause === "offline" ? "errorOfflineTitle" : cause === "timeout" ? "errorTimeoutTitle" : cause === "invalidResponse" ? "errorInvalidResponseTitle" : status === 503 ? "errorUnavailableTitle" : status === 500 ? "errorServiceTitle" : status === 404 ? "errorEndpointTitle" : status === 429 ? "errorRateLimitTitle" : "errorGenericTitle",
    guidanceKey: cause === "offline" ? "errorOfflineGuidance" : cause === "timeout" ? "errorTimeoutGuidance" : cause === "invalidResponse" ? "errorInvalidResponseGuidance" : status === 503 ? "errorUnavailableGuidance" : status === 500 ? "errorServiceGuidance" : status === 404 ? "errorEndpointGuidance" : status === 429 ? "errorRateLimitGuidance" : "errorGenericGuidance",
    retryAfter: status === 429 ? safeRetryAfter : "",
    rawPayload: payload,
  };
  if (status !== 400 || !payload || typeof payload !== "object") return fallback;
  const error = (payload as ApiError).error;
  if (!error || typeof error !== "object") return fallback;
  const codes: Record<string, [string, string]> = {
    INVALID_QUERY: ["errorInvalidQueryTitle", "errorInvalidQueryGuidance"],
    CONFLICTING_FILTERS: ["errorConflictTitle", "errorConflictGuidance"],
    UNSUPPORTED_VALUE: ["errorUnsupportedTitle", "errorUnsupportedGuidance"],
  };
  const mapped = codes[error.code ?? ""];
  if (!mapped) return fallback;
  return {
    titleKey: mapped[0],
    guidanceKey: parameterGuidanceKeys[error.parameter ?? ""] ?? mapped[1],
    retryAfter: "",
    rawPayload: payload,
  };
}

export function isPlaygroundResponse(value: unknown): value is PlaygroundResponse {
  if (!value || typeof value !== "object") return false;
  const response = value as Partial<PlaygroundResponse>;
  return Array.isArray(response.results) && response.results.every((person) => person && typeof person === "object");
}
