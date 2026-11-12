import assert from "node:assert/strict";
import test from "node:test";
import { getSkinToneSwatch, skinToneSwatches } from "../src/lib/skin-tone-swatches.ts";

test("skin tone swatches match the review palette and expose no unsupported values", () => {
  assert.deepEqual(skinToneSwatches.map(({ value }) => value), [1,2,3,4,5,6,7,8,9,10]);
  assert.equal(skinToneSwatches[0].color, "#f7ede4");
  assert.equal(skinToneSwatches[9].color, "#2a2420");
  assert.equal(getSkinToneSwatch(5)?.color, "#d7bd96");
  assert.equal(getSkinToneSwatch(0), undefined);
});

test("all tones can be excluded individually, reselected and reset including an empty filter", async () => {
  const { toggleSkinTone, selectedSkinTones } = await import("../src/lib/skin-tone-swatches.ts");
  assert.equal(typeof toggleSkinTone, "function");
  assert.deepEqual(selectedSkinTones(null), [1,2,3,4,5,6,7,8,9,10]);
  const subset = toggleSkinTone(null, 10);
  assert.deepEqual(selectedSkinTones(subset), [1,2,3,4,5,6,7,8,9]);
  assert.equal(toggleSkinTone(subset, 10), null);
  assert.deepEqual(toggleSkinTone([7,8], 8), 7);
  assert.deepEqual(toggleSkinTone(7, 7), []);
  assert.deepEqual(toggleSkinTone(7, 8), [7,8]);
});

test('global tone toggle selects and clears all tones', async () => {
  const { toggleAllSkinTones } = await import('../src/lib/skin-tone-swatches.ts');
  assert.deepEqual(toggleAllSkinTones(null), []);
  assert.equal(toggleAllSkinTones([]), null);
  assert.equal(toggleAllSkinTones([7,8]), null);
});
