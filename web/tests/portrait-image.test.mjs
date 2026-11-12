import assert from "node:assert/strict";
import test from "node:test";
import { portraitImageForSize } from "../src/lib/portrait-image.ts";

test("selects the large portrait for cards and the smallest thumbnail for previews", () => {
  const picture = { thumbnail: "thumbnail.webp", medium: "medium.webp", large: "large.webp" };
  assert.equal(portraitImageForSize(picture, "card"), "large.webp");
  assert.equal(portraitImageForSize(picture, "thumbnail"), "thumbnail.webp");
});

test("falls back through available variants without inventing a URL", () => {
  assert.equal(portraitImageForSize({ medium: "medium.webp" }, "card"), "medium.webp");
  assert.equal(portraitImageForSize({ thumbnail: "thumbnail.webp" }, "card"), "thumbnail.webp");
  assert.equal(portraitImageForSize(null, "thumbnail"), null);
});
