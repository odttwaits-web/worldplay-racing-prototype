export function entryIsOpen(game, now = Date.now()) {
  const deadline = Date.parse(game.deadline);
  return Number.isFinite(deadline) && now < deadline;
}

export function moveRankedSelection(selection, index, delta) {
  const next = [...selection];
  const target = index + delta;
  if (index < 0 || index >= next.length || target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function normalizePrototypeState(rawState, defaults, cupRunners, survivorRunners) {
  const loaded = { ...defaults, ...rawState };
  const cupIds = new Set(cupRunners.filter((runner) => runner.status !== "scratched").map((runner) => runner.id));
  const survivorIds = new Set(survivorRunners.filter((runner) => runner.status !== "scratched").map((runner) => runner.id));

  loaded.top10 = Array.isArray(loaded.top10) ? loaded.top10.filter((id) => cupIds.has(id)).slice(0, 10) : [];
  loaded.top10SubmittedPicks = Array.isArray(loaded.top10SubmittedPicks)
    ? loaded.top10SubmittedPicks.filter((id) => cupIds.has(id)).slice(0, 10)
    : [];
  if (!survivorIds.has(loaded.survivorPick)) loaded.survivorPick = null;
  if (!survivorIds.has(loaded.survivorSubmittedPick)) loaded.survivorSubmittedPick = null;
  if (loaded.top10Submitted && loaded.top10SubmittedPicks.length !== 10) loaded.top10Submitted = false;
  if (loaded.survivorSubmitted && !loaded.survivorSubmittedPick) loaded.survivorSubmitted = false;
  if (!loaded.top10Submitted) loaded.top10Editing = false;
  if (!loaded.survivorSubmitted) loaded.survivorEditing = false;

  return loaded;
}
