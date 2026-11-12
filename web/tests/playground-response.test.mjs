import assert from "node:assert/strict";
import test from "node:test";
import { mapPlaygroundFailure } from "../src/lib/playground-response.ts";

test("maps stable API codes and parameters without exposing backend prose", () => {
  const failure = mapPlaygroundFailure(400, {
    error: { code: "INVALID_QUERY", parameter: "skinTone", message: "skinTone must be an integer 1-10" },
  });
  assert.equal(failure.titleKey, "errorInvalidQueryTitle");
  assert.equal(failure.guidanceKey, "errorParamSkinTone");
  assert.equal(`${failure.titleKey} ${failure.guidanceKey}`.includes("must be an integer"), false);
  assert.equal((failure.rawPayload).error.message, "skinTone must be an integer 1-10");
});

test("unknown API codes fall back to safe generic recovery while keeping raw JSON", () => {
  const payload = { error: { code: "NEW_CODE", parameter: "secret", message: "opaque English text" } };
  const failure = mapPlaygroundFailure(400, payload);
  assert.equal(failure.titleKey, "errorGenericTitle");
  assert.equal(failure.guidanceKey, "errorGenericGuidance");
  assert.equal(failure.rawPayload, payload);
});

test("rate limits and service failures map by status, with retry information kept separate", () => {
  assert.equal(mapPlaygroundFailure(429, null, "30").titleKey, "errorRateLimitTitle");
  assert.equal(mapPlaygroundFailure(429, null, "30").retryAfter, "30");
  assert.equal(mapPlaygroundFailure(503, null).guidanceKey, "errorUnavailableGuidance");
});
