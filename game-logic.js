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

export function emptyWeeklyEntry() {
  return {
    picks: {}, confidence: {}, margin: "", submitted: false,
    submittedPicks: {}, submittedConfidence: {}, submittedMargin: "", editing: false
  };
}

export function weeklyEntryIsComplete(game, entry) {
  if (!game || !entry || game.fixtures.some((fixture) => !entry.picks?.[fixture.id])) return false;
  if (game.featuredFixtureId) {
    const margin = Number(entry.margin);
    if (!Number.isInteger(margin) || margin < 1 || margin > 99) return false;
  }
  if (game.scoring === "confidence") {
    const values = game.fixtures.map((fixture) => Number(entry.confidence?.[fixture.id]));
    return values.every((value) => Number.isInteger(value) && value >= 1 && value <= game.fixtures.length)
      && new Set(values).size === game.fixtures.length;
  }
  return true;
}

export function normalizeWeeklyEntries(rawEntries, games) {
  const normalized = {};
  for (const game of Object.values(games)) {
    const raw = rawEntries?.[game.id] || {};
    const entry = { ...emptyWeeklyEntry(), ...raw };
    const validTeams = new Map(game.fixtures.map((fixture) => [fixture.id, new Set([fixture.home.code, fixture.away.code])]));
    entry.picks = Object.fromEntries(Object.entries(entry.picks || {}).filter(([fixtureId, code]) => validTeams.get(fixtureId)?.has(code)));
    entry.submittedPicks = Object.fromEntries(Object.entries(entry.submittedPicks || {}).filter(([fixtureId, code]) => validTeams.get(fixtureId)?.has(code)));
    entry.confidence = Object.fromEntries(Object.entries(entry.confidence || {}).filter(([fixtureId, value]) => validTeams.has(fixtureId) && Number.isInteger(Number(value))));
    entry.submittedConfidence = Object.fromEntries(Object.entries(entry.submittedConfidence || {}).filter(([fixtureId, value]) => validTeams.has(fixtureId) && Number.isInteger(Number(value))));
    if (entry.submitted && !weeklyEntryIsComplete(game, {
      picks: entry.submittedPicks,
      confidence: entry.submittedConfidence,
      margin: entry.submittedMargin
    })) entry.submitted = false;
    if (!entry.submitted) entry.editing = false;
    normalized[game.id] = entry;
  }
  return normalized;
}
