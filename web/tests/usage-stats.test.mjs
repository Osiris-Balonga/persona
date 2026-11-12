import assert from "node:assert/strict";
import test from "node:test";
import { fillUsageWindow, summarizeUsage, usageWindow } from "../src/lib/usage-stats-core.ts";

test("the UTC window includes today and the preceding 29 days", () => {
  assert.deepEqual(usageWindow(new Date("2026-09-29T23:45:00Z")), {
    from: "2026-08-31",
    to: "2026-09-30",
    today: "2026-09-29",
  });
});

test("usage counts profiles and active days without inventing missing days", () => {
  assert.deepEqual(summarizeUsage({ points: [
    { period: "2026-09-29", profiles: 1366 },
    { period: "2026-09-28", profiles: 4 },
  ] }, "2026-09-29"), {
    points: [{ period: "2026-09-28", profiles: 4 }, { period: "2026-09-29", profiles: 1366 }],
    total: 1370,
    today: 1366,
    activeDays: 2,
    firstDay: "2026-09-28",
  });
});

test("the chart contains every UTC day in the 30-day window", () => {
  const window = usageWindow(new Date("2026-09-29T23:45:00Z"));
  const series = fillUsageWindow([{ period: "2026-09-28", profiles: 4 }, { period: "2026-09-29", profiles: 1366 }], window.from, window.today);
  assert.equal(series.length, 30);
  assert.deepEqual(series[0], { period: "2026-08-31", profiles: 0 });
  assert.deepEqual(series[28], { period: "2026-09-28", profiles: 4 });
  assert.deepEqual(series[29], { period: "2026-09-29", profiles: 1366 });
});

test("invalid and duplicate analytics points are rejected", () => {
  assert.throws(() => summarizeUsage({ points: [{ period: "2026-09-29", profiles: -1 }] }, "2026-09-29"));
  assert.throws(() => summarizeUsage({ points: [
    { period: "2026-09-29", profiles: 1 },
    { period: "2026-09-29", profiles: 2 },
  ] }, "2026-09-29"));
});
