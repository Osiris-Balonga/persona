import assert from "node:assert/strict";
import test from "node:test";
import { activityBadgeKey } from "../src/lib/activity-environment.ts";

test("Activity's badge key follows its configured environment", () => {
  assert.equal(activityBadgeKey("production"), "badgeProduction");
});

test("Activity keeps a staging label for preview environments", () => {
  assert.equal(activityBadgeKey("staging"), "badgeStaging");
});
