import assert from "node:assert/strict";
import test from "node:test";

test("portrait selection is enabled for the compatible beta API and can be disabled for older origins", async () => {
  const key = "NEXT_PUBLIC_PERSONA_PORTRAIT_CONTEXTS_ENABLED";
  const original = process.env[key];
  try {
    delete process.env[key];
    assert.equal((await import("../src/lib/config.ts?default")).config.portraitContextsEnabled, true);
    process.env[key] = "false";
    assert.equal((await import("../src/lib/config.ts?disabled")).config.portraitContextsEnabled, false);
    process.env[key] = "true";
    assert.equal((await import("../src/lib/config.ts?enabled")).config.portraitContextsEnabled, true);
  } finally {
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  }
});
