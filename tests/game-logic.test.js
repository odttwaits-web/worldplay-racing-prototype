import test from "node:test";
import assert from "node:assert/strict";
import { melbourneCupRunners, survivorOpeningRunners } from "../data.js";
import { entryIsOpen, moveRankedSelection, normalizePrototypeState } from "../game-logic.js";

test("entries close exactly at the server-shaped deadline value", () => {
  const game = { deadline: "2026-11-04T14:55:00+11:00" };
  assert.equal(entryIsOpen(game, Date.parse("2026-11-04T14:54:59+11:00")), true);
  assert.equal(entryIsOpen(game, Date.parse("2026-11-04T14:55:00+11:00")), false);
  assert.equal(entryIsOpen({ deadline: "invalid" }), false);
});

test("ranking controls move a pick without mutating the original order", () => {
  const original = ["a", "b", "c"];
  assert.deepEqual(moveRankedSelection(original, 1, -1), ["b", "a", "c"]);
  assert.deepEqual(original, ["a", "b", "c"]);
  assert.deepEqual(moveRankedSelection(original, 0, -1), original);
});

test("stale or cross-game saved selections are discarded", () => {
  const defaults = {
    top10: [], top10Submitted: false, top10SubmittedPicks: [], top10Editing: false,
    survivorPick: null, survivorSubmitted: false, survivorSubmittedPick: null, survivorEditing: false
  };
  const validCupId = melbourneCupRunners[0].id;
  const scratchedSurvivorId = survivorOpeningRunners.find((runner) => runner.status === "scratched").id;
  const normalized = normalizePrototypeState({
    top10: [validCupId, "old-runner-id"],
    top10Submitted: true,
    top10Editing: true,
    top10SubmittedPicks: [validCupId],
    survivorPick: scratchedSurvivorId,
    survivorSubmitted: true,
    survivorSubmittedPick: "old-survivor-id",
    survivorEditing: true
  }, defaults, melbourneCupRunners, survivorOpeningRunners);

  assert.deepEqual(normalized.top10, [validCupId]);
  assert.equal(normalized.top10Submitted, false);
  assert.equal(normalized.top10Editing, false);
  assert.equal(normalized.survivorPick, null);
  assert.equal(normalized.survivorSubmitted, false);
  assert.equal(normalized.survivorEditing, false);
});
