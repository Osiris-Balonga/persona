import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { activityHistoryDisclosureKey } from "../src/lib/activity-environment.ts";

const en = JSON.parse(await readFile(new URL("../messages/en.json", import.meta.url), "utf8"));
const fr = JSON.parse(await readFile(new URL("../messages/fr.json", import.meta.url), "utf8"));

test("only production explains that public totals include pre-production history", () => {
  assert.equal(activityHistoryDisclosureKey("production"), "historyDisclosure");
  assert.equal(activityHistoryDisclosureKey("staging"), null);
  assert.match(en.Activity.historyDisclosure, /pre-production history.*production usage/i);
  assert.match(fr.Activity.historyDisclosure, /historique de préproduction.*production/i);
});
