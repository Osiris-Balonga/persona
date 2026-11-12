import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPeopleUrl,
  buildPlaygroundPageUrl,
  defaultPlaygroundOptions,
  parsePlaygroundOptions,
  validatePlaygroundOptions,
} from "../src/lib/playground-query.ts";

test("targets the public /api entry while retaining legacy origin support", () => {
  for (const base of ["https://persona.test/api", "https://persona.test/api/"]) {
    const url = buildPeopleUrl(base, { ...defaultPlaygroundOptions, seed: "space & value", skinTone: [] }, true);
    assert.equal(url.pathname, "/api");
    assert.equal(url.searchParams.get("seed"), "space & value");
    assert.equal(url.searchParams.get("skinTone"), "");
  }
  assert.equal(buildPeopleUrl("https://legacy.test", defaultPlaygroundOptions).pathname, "/people");
});

test("the compatibility switch omits portrait contexts for older APIs", () => {
  const options = { ...defaultPlaygroundOptions, portraitContexts: ["doctor", "business"] };
  assert.equal(buildPeopleUrl("https://persona.test", options).searchParams.has("portraitContexts"), false);
  const enabled = buildPeopleUrl("https://persona.test", options, true);
  assert.equal(enabled.searchParams.get("portraitContexts"), "doctor,business");
  assert.equal(enabled.searchParams.has("portraitContext"), false);
});

test("all five portrait types are explicit when enabled, while zero stays explicit and survives refresh", () => {
  assert.equal(buildPeopleUrl("https://persona.test", defaultPlaygroundOptions, true).searchParams.get("portraitContexts"), "standard,doctor,construction,business,school-pupil");
  const options = { ...defaultPlaygroundOptions, portraitContexts: [] };
  const enabled = buildPeopleUrl("https://persona.test", options, true);
  assert.equal(enabled.searchParams.has("portraitContexts"), true);
  assert.equal(enabled.searchParams.get("portraitContexts"), "");
  const page = new URL(buildPlaygroundPageUrl("https://persona.test/fr/playground", options), "https://persona.test");
  assert.equal(page.searchParams.has("portraitContexts"), true);
  assert.deepEqual(parsePlaygroundOptions(page.searchParams).portraitContexts, []);
});

test("portrait choices restore in canonical order, exclude unsupported types and default to all five", () => {
  assert.deepEqual(parsePlaygroundOptions(new URLSearchParams()).portraitContexts, ["standard", "doctor", "construction", "business", "school-pupil"]);
  const options = parsePlaygroundOptions(new URLSearchParams("portraitContexts=business,doctor,doctor,university-student,teacher"));
  assert.deepEqual(options.portraitContexts, ["doctor", "business"]);
  const page = new URL(buildPlaygroundPageUrl("https://persona.test/fr/playground?portraitContext=standard", options), "https://persona.test");
  assert.equal(page.searchParams.has("portraitContext"), false);
  assert.deepEqual(parsePlaygroundOptions(page.searchParams).portraitContexts, ["doctor", "business"]);
});

test("starts without a seed and keeps the example email domain", () => {
  const options = parsePlaygroundOptions(new URLSearchParams());
  assert.equal(options.seed, "");
  assert.equal(options.emailDomain, "example.test");
  const url = buildPeopleUrl("https://persona.test", options);
  assert.equal(url.searchParams.has("seed"), false);
  assert.equal(url.searchParams.get("emailDomain"), "example.test");
});

test("clearing a seed removes it from shared and API URLs, including whitespace", () => {
  for (const seed of ["", "   "]) {
    const options = { ...defaultPlaygroundOptions, seed };
    const path = buildPlaygroundPageUrl(
      "https://persona.test/fr/playground?seed=previous&utm_source=share",
      options,
    );
    const page = new URL(path, "https://persona.test");
    assert.equal(page.searchParams.has("seed"), false);
    assert.equal(page.searchParams.get("utm_source"), "share");
    assert.equal(parsePlaygroundOptions(page.searchParams).seed, "");
    assert.equal(buildPeopleUrl("https://persona.test", options).searchParams.has("seed"), false);
  }
});

test("an explicit seed survives sharing and is sent to the API", () => {
  const options = { ...defaultPlaygroundOptions, seed: "repeatable-demo" };
  const path = buildPlaygroundPageUrl("https://persona.test/fr/playground", options);
  const restored = parsePlaygroundOptions(new URL(path, "https://persona.test").searchParams);
  assert.equal(restored.seed, options.seed);
  assert.equal(buildPeopleUrl("https://persona.test", restored).searchParams.get("seed"), options.seed);
});

test("serializes supported filters and a 100-person request", () => {
  const options = {
    ...defaultPlaygroundOptions,
    count: 100,
    ageGroups: ["adult", "senior"],
    nationality: "FR",
    residenceCountry: "CG",
    city: "Brazzaville",
    fields: ["name", "picture"],
  };
  assert.equal(validatePlaygroundOptions(options), null);
  const url = buildPeopleUrl("https://persona-dev.onrender.com", options);
  assert.equal(url.pathname, "/people");
  assert.equal(url.searchParams.get("count"), "100");
  assert.equal(url.searchParams.get("ageGroup"), "adult,senior");
  assert.equal(url.searchParams.get("city"), "Brazzaville");
  assert.equal(url.searchParams.get("fields"), "name,picture");
});

test("rejects out-of-range counts and a city without a country", () => {
  assert.equal(
    validatePlaygroundOptions({ ...defaultPlaygroundOptions, count: 101 }),
    "count",
  );
  assert.equal(
    validatePlaygroundOptions({
      ...defaultPlaygroundOptions,
      city: "Brazzaville",
    }),
    "city",
  );
});

test("restores a shared playground URL without losing unrelated parameters", () => {
  const options = {
    ...defaultPlaygroundOptions,
    count: 90,
    continent: "africa",
    nationality: "CG",
    residenceCountry: "FR",
    ageGroups: ["adult", "senior"],
    fields: ["name", "location", "picture"],
    emailDomain: "persona.com",
  };
  const path = buildPlaygroundPageUrl(
    "https://persona.test/fr/playground?utm_source=share#result",
    options,
  );
  const page = new URL(path, "https://persona.test");
  assert.equal(page.searchParams.get("utm_source"), "share");
  assert.equal(page.hash, "#result");
  assert.deepEqual(parsePlaygroundOptions(page.searchParams), options);
  assert.equal(
    buildPlaygroundPageUrl(
      `https://persona.test${path}`,
      defaultPlaygroundOptions,
    ),
    "/fr/playground?utm_source=share#result",
  );
});

test("age groups start selected and context eligibility is the union of selected portrait types", async () => {
  const { eligiblePlaygroundAgeGroups, trimPlaygroundAgeGroups } = await import("../src/lib/playground-query.ts");
  assert.deepEqual(defaultPlaygroundOptions.ageGroups, ["child", "teen", "adult", "senior"]);
  assert.deepEqual(eligiblePlaygroundAgeGroups(["school-pupil"]), ["child", "teen"]);
  assert.deepEqual(eligiblePlaygroundAgeGroups(["school-pupil", "business"]), ["child", "teen", "adult"]);
  assert.deepEqual(trimPlaygroundAgeGroups(["child", "adult", "senior"], ["school-pupil"]), {
    ageGroups: ["child"], removed: ["adult", "senior"],
  });
  assert.deepEqual(eligiblePlaygroundAgeGroups([]), ["child", "teen", "adult", "senior"]);
});

test("age selections, portrait contexts, and skin tone restore and serialize explicitly", () => {
  const options = {
    ...defaultPlaygroundOptions,
    ageGroups: ["child", "teen"],
    portraitContexts: ["school-pupil"],
    skinTone: 5,
  };
  const api = buildPeopleUrl("https://persona.test", options, true);
  assert.equal(api.searchParams.get("ageGroup"), "child,teen");
  assert.equal(api.searchParams.get("portraitContexts"), "school-pupil");
  assert.equal(api.searchParams.get("skinTone"), "5");
  const shared = new URL(buildPlaygroundPageUrl("https://persona.test/en/playground", options), "https://persona.test");
  assert.deepEqual(parsePlaygroundOptions(shared.searchParams), options);
  const noPortraits = { ...options, ageGroups: ["adult"], portraitContexts: [], skinTone: 5 };
  const noPortraitsUrl = buildPeopleUrl("https://persona.test", noPortraits, true);
  assert.equal(noPortraitsUrl.searchParams.get("ageGroup"), "adult");
  assert.equal(noPortraitsUrl.searchParams.get("portraitContexts"), "");
  assert.equal(noPortraitsUrl.searchParams.has("skinTone"), false);
  assert.equal(buildPeopleUrl("https://persona.test", options, false).searchParams.has("skinTone"), false);
});

test("invalid age and skin tone query values normalize safely", () => {
  const restored = parsePlaygroundOptions(new URLSearchParams("ageGroup=wat&skinTone=11"));
  assert.deepEqual(restored.ageGroups, ["child", "teen", "adult", "senior"]);
  assert.equal(restored.skinTone, null);
});

test("restored pupil-only links trim incompatible ages and expose the adjustment state", () => {
  const restored = parsePlaygroundOptions(new URLSearchParams("portraitContexts=school-pupil&ageGroup=adult"));
  assert.deepEqual(restored.ageGroups, ["child", "teen"]);
  assert.equal(restored.ageGroupsAdjustedByEligibility, true);
});

test("date validation checks real calendar days and the supported year range", () => {
  for (const asOf of ["2026-02-29", "2026-04-31", "0001-01-01", "10000-01-01"]) {
    assert.equal(validatePlaygroundOptions({ ...defaultPlaygroundOptions, asOf }), "asOf", asOf);
  }
  assert.equal(validatePlaygroundOptions({ ...defaultPlaygroundOptions, asOf: "2024-02-29" }), null);
  assert.equal(validatePlaygroundOptions({ ...defaultPlaygroundOptions, asOf: "0102-01-01" }), null);
});

test("skin tone must be an integer from one through ten", () => {
  for (const skinTone of [0, 11, 2.5]) {
    assert.equal(validatePlaygroundOptions({ ...defaultPlaygroundOptions, skinTone }), "skinTone");
  }
  assert.equal(validatePlaygroundOptions({ ...defaultPlaygroundOptions, skinTone: 10 }), null);
});

test("multiple tones restore canonically and preserve their union in API and shared URLs", () => {
  const restored = parsePlaygroundOptions(new URLSearchParams("skinTone=8,6"));
  assert.deepEqual(restored.skinTone, [6,8]);
  assert.equal(validatePlaygroundOptions(restored), null);
  assert.equal(buildPeopleUrl("https://persona.test", restored, true).searchParams.get("skinTone"), "6,8");
  const shared = new URL(buildPlaygroundPageUrl("https://persona.test/fr/playground", restored), "https://persona.test");
  assert.deepEqual(parsePlaygroundOptions(shared.searchParams), restored);
  for (const skinTone of [[6,6], [6,11]]) {
    assert.equal(validatePlaygroundOptions({ ...defaultPlaygroundOptions, skinTone }), "skinTone");
  }
});

test("rejects an age band that has no overlap with the explicitly selected portrait types", () => {
  const incompatible = {
    ...defaultPlaygroundOptions,
    ageGroups: ["adult"],
    portraitContexts: ["school-pupil"],
  };
  assert.equal(validatePlaygroundOptions(incompatible), "ageGroup");
  assert.equal(validatePlaygroundOptions({ ...incompatible, ageGroups: ["teen"] }), null);
});

test("pending residence coverage requires an explicit nationality or continent", () => {
  const pendingResidence = { ...defaultPlaygroundOptions, residenceCountry: "CG" };
  assert.equal(validatePlaygroundOptions(pendingResidence, null, true), "residenceNationality");
  assert.equal(validatePlaygroundOptions({ ...pendingResidence, nationality: "FR" }, null, true), null);
  assert.equal(validatePlaygroundOptions({ ...pendingResidence, continent: "africa" }, null, true), null);
});

test('empty tone selection survives sharing and requests', () => {
 const options = { ...defaultPlaygroundOptions, skinTone: [] };
 assert.equal(validatePlaygroundOptions(options), null);
 assert.deepEqual(parsePlaygroundOptions(new URLSearchParams('skinTone=')).skinTone, []);
 assert.equal(buildPeopleUrl('https://persona.test', options, true).searchParams.get('skinTone'), '');
});
