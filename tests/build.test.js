import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

test("the private preview build contains the app and worker entrypoint", async () => {
  for (const file of [
    "dist/client/index.html",
    "dist/client/app.js",
    "dist/client/styles.css",
    "dist/client/assets/worldplay-logo.svg",
    "dist/server/index.js"
  ]) {
    await access(join(root, file));
  }
});

test("the hosted worker applies disclosure-safe security headers", async () => {
  const worker = await readFile(join(root, "dist/server/index.js"), "utf8");
  assert.match(worker, /Content-Security-Policy/);
  assert.match(worker, /X-Frame-Options/);
  assert.match(worker, /\/health/);
});

test("the stakeholder dashboard prioritises playable games and clear actions", async () => {
  const client = await readFile(join(root, "dist/client/app.js"), "utf8");
  for (const moduleName of ["ALL GAMES", "RACING", "AFL", "NRL", "YOUR GAMES", "COMING UP", "MY LEAGUES", "LATEST ACTIVITY", "WHAT TO KNOW", "FROM WORLDPLAY", "PICKS CLOSE", "TOP 10 RANK", "COMMUNITY &amp; LEAGUES"]) {
    assert.match(client, new RegExp(moduleName));
  }
  assert.doesNotMatch(client, /RACING EDITION/);
  assert.doesNotMatch(client, /sports-search/);
  assert.doesNotMatch(client, />BROWSE</);
  assert.match(client, /AFL ROUND CARD/);
  assert.match(client, /NFL WEEKLY PICK 6/);
  assert.doesNotMatch(client, /dashboardGameCard\("afl", "AFL FINALS"/);
  assert.doesNotMatch(client, /dashboardGameCard\("nrl", "NRL FINALS"/);
  assert.match(client, /const dashboardMatch = route\.match/);
});

test("weekly entries expose every required scoring input before review", async () => {
  const client = await readFile(join(root, "dist/client/app.js"), "utf8");
  assert.match(client, /FEATURED MATCH MARGIN/);
  assert.match(client, /CONFIDENCE POINTS LEFT/);
  assert.match(client, /First pick all six winners/);
});

test("playable game cards are full keyboard-accessible navigation targets", async () => {
  const client = await readFile(join(root, "dist/client/app.js"), "utf8");
  assert.match(client, /role="link" tabindex="0" data-route/);
  assert.match(client, /event\.key !== "Enter"/);
  assert.match(client, /event\.target\.closest\('\[role="link"\]\[data-route\]'\)/);
});

test("playable screens expose a persistent cross-game switcher", async () => {
  const client = await readFile(join(root, "dist/client/app.js"), "utf8");
  for (const label of ["ALL GAMES", "RACING HUB", "PICK TOP 10", "SURVIVOR", "AFL ROUND", "NFL PICK 6"]) {
    assert.match(client, new RegExp(label));
  }
  assert.match(client, /gameSwitcher\("top10"\)/);
  assert.match(client, /gameSwitcher\("survivor"\)/);
  assert.match(client, /gameSwitcher\(game\.id\)/);
});

test("the league hub supports every sport and core social league task", async () => {
  const client = await readFile(join(root, "dist/client/app.js"), "utf8");
  for (const label of ["ALL LEAGUES", "PLAY TOGETHER", "YOUR LEAGUES", "LEAGUE PULSE", "DISCOVER", "INVITES", "RACING", "AFL", "NRL", "NFL"]) {
    assert.match(client, new RegExp(label));
  }
  assert.match(client, /const leagueMatch = route\.match/);
  assert.match(client, /const leagueDetailMatch = route\.match/);
  assert.match(client, /data-action="create-league"/);
  assert.match(client, /data-action="join-league"/);
  assert.match(client, /JOIN LEAGUE|REQUEST TO JOIN/);
  assert.match(client, /NEXT LEAGUE ACTION/);
  assert.match(client, /YOUR POSITION/);
  assert.match(client, /leagueStandings/);
  assert.match(client, /leagueActivity/);
  assert.match(client, /leagueMembers/);
  assert.match(client, /STEP 1 OF 4/);
  assert.match(client, /YOUR CROWD/);
  assert.match(client, /Share via SMS/);
  assert.match(client, /league-mobile-action/);
  assert.match(client, /data-mode="discover"/);
});
