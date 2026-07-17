import test from "node:test";
import assert from "node:assert/strict";
import {
  allRunners,
  meetings,
  melbourneCupRunners,
  runnerById,
  survivorGame,
  survivorOpeningRunners,
  topTenGame
} from "../data.js";

test("the spring campaign contains ten meetings", () => {
  assert.equal(meetings.length, 10);
  assert.equal(meetings[0].status, "open");
  assert.equal(meetings[0].name, "Makybe Diva Stakes Day");
  assert.equal(meetings.at(-1).name, "Champions Day");
});

test("runner ids are unique and resolve through runnerById", () => {
  const ids = allRunners.map((runner) => runner.id);
  assert.equal(new Set(ids).size, allRunners.length);
  assert.equal(runnerById(ids[0]).name, allRunners[0].name);
});

test("the Melbourne Cup prototype has a separate 24-runner field", () => {
  assert.equal(melbourneCupRunners.length, 24);
  assert.ok(melbourneCupRunners.every((runner) => runner.id.startsWith("cup-")));
  assert.ok(melbourneCupRunners.filter((runner) => runner.status !== "scratched").length >= 10);
});

test("Survivor has its own opening field and a disabled-state example", () => {
  assert.ok(survivorOpeningRunners.length >= 10);
  assert.ok(survivorOpeningRunners.every((runner) => runner.id.startsWith("makybe-")));
  assert.ok(survivorOpeningRunners.some((runner) => runner.status === "scratched"));
  assert.equal(
    melbourneCupRunners.some((cupRunner) => survivorOpeningRunners.some((runner) => runner.id === cupRunner.id)),
    false
  );
});

test("both games expose valid selection deadlines", () => {
  assert.ok(Number.isFinite(Date.parse(topTenGame.deadline)));
  assert.ok(Number.isFinite(Date.parse(survivorGame.deadline)));
  assert.ok(Date.parse(survivorGame.deadline) < Date.parse(topTenGame.deadline));
});

test("each Survivor meeting exposes future-ready race metadata", () => {
  for (const meeting of meetings) {
    assert.ok(meeting.venue);
    assert.ok(meeting.featureRace);
    assert.ok(["open", "upcoming", "closed", "complete"].includes(meeting.status));
  }
});
