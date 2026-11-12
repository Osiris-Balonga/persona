import assert from "node:assert/strict";
import test from "node:test";
import {
  playgroundPortraitContexts,
  togglePortraitContext,
} from "../src/lib/playground-query.ts";

test("offers only the five approved Playground portrait types, all selected initially", () => {
  assert.deepEqual(playgroundPortraitContexts, [
    "standard", "doctor", "construction", "business", "school-pupil",
  ]);
});

test("allows excluding each type and leaves the last deselection empty", () => {
  let selected = [...playgroundPortraitContexts];
  for (const context of playgroundPortraitContexts) {
    selected = togglePortraitContext(selected, context);
    assert.equal(selected.includes(context), false);
  }
  assert.deepEqual(selected, []);
  assert.deepEqual(togglePortraitContext(selected, "doctor"), ["doctor"]);
});

test("reselecting a type preserves the other choices without mutating them", () => {
  const selected = ["standard", "business"];
  assert.deepEqual(togglePortraitContext(selected, "doctor"), ["standard", "doctor", "business"]);
  assert.deepEqual(selected, ["standard", "business"]);
});
