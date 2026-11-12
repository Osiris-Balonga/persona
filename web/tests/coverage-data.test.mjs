import assert from "node:assert/strict";
import test from "node:test";
import { decodeCoveragePayload } from "../src/lib/coverage-decoder.ts";
import { loadCoverageData } from "../src/lib/coverage-load.ts";

const validPayload = {
  meta: { dataVersion: "geo-test", catalogVersion: "catalog-test", portraitSelectionVersion: "selection-test" },
  countries: [{ code: "CG", name: "Congo", status: "available", sampledCities: 4, postcodeCities: 2, phone: "format-valid", continent: "002", subregion: "017" }],
  portraits: { total: 4272, annotatedSkinTone: 500, contexts: [{ id: "standard", minAge: 6, maxAge: 100, count: 3000, weight: 50 }], skinTones: [{ value: 5, count: 500 }] },
};

test("decodes the live coverage contract and derives no unprovided totals", () => {
  const decoded = decodeCoveragePayload(validPayload);
  assert.equal(decoded.meta.dataVersion, "geo-test");
  assert.equal(decoded.countries[0].postcodeCities, 2);
  assert.equal(decoded.portraits.contexts[0].count, 3000);
  assert.equal(decoded.portraits.total, 4272);
});

test("rejects malformed or incomplete live coverage payloads", () => {
  assert.throws(() => decodeCoveragePayload({ ...validPayload, countries: [{ ...validPayload.countries[0], status: "maybe" }] }));
  assert.throws(() => decodeCoveragePayload({ ...validPayload, countries: [{ ...validPayload.countries[0], continent: "Africa" }] }));
  assert.throws(() => decodeCoveragePayload({ ...validPayload, portraits: { ...validPayload.portraits, total: -1 } }));
  assert.throws(() => decodeCoveragePayload({ ...validPayload, portraits: { ...validPayload.portraits, skinTones: [{ value: 11, count: 500 }] } }));
  assert.throws(() => decodeCoveragePayload({ ...validPayload, portraits: { ...validPayload.portraits, contexts: [{ ...validPayload.portraits.contexts[0], count: 5000 }] } }));
  assert.throws(() => decodeCoveragePayload({ ...validPayload, meta: { dataVersion: "geo-test" } }));
});

test("allows valid coverage when the portrait catalog is empty", () => {
  const payload = { ...validPayload, portraits: { total: 0, annotatedSkinTone: 0, contexts: [], skinTones: [] } };
  assert.equal(decodeCoveragePayload(payload).portraits.total, 0);
});

test("uses live data when valid and labels the dated snapshot after a feed failure", async () => {
  const live = await loadCoverageData(async () => ({ ok: true, json: async () => validPayload }), { rows: validPayload.countries, date: "2026-09-28" }, decodeCoveragePayload);
  assert.equal(live.source.kind, "live");
  assert.equal(live.rows[0].code, "CG");

  const snapshot = await loadCoverageData(async () => ({ ok: false, status: 503, json: async () => null }), { rows: validPayload.countries, date: "2026-09-28" }, decodeCoveragePayload);
  assert.deepEqual(snapshot.source, { kind: "snapshot", date: "2026-09-28" });
  assert.equal(snapshot.portraits, null);

  const unavailable = await loadCoverageData(async () => { throw new Error("offline"); }, null, decodeCoveragePayload);
  assert.deepEqual(unavailable.source, { kind: "unavailable" });
  assert.deepEqual(unavailable.rows, []);
});
