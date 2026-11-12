import assert from "node:assert/strict";
import test from "node:test";
import { featuredPersonWithPortrait } from "../src/lib/featured-person-selection.ts";

test("selects a profile with a portrait instead of a portraitless earlier result", () => {
  const withoutPortrait = { id: "no-photo", picture: null };
  const withPortrait = { id: "photo", picture: { large: "https://cdn.test/large.webp" } };

  assert.equal(featuredPersonWithPortrait([withoutPortrait, withPortrait]), withPortrait);
});

test("returns no featured profile when the API batch has no portraits", () => {
  assert.equal(featuredPersonWithPortrait([
    { id: "one", picture: null },
    { id: "two", picture: { large: null, medium: null, thumbnail: null } },
  ]), null);
  assert.equal(featuredPersonWithPortrait([]), null);
});
