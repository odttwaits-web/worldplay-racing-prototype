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

test("the stakeholder dashboard includes the personalised home modules", async () => {
  const client = await readFile(join(root, "dist/client/app.js"), "utf8");
  for (const moduleName of ["YOUR GAMES", "COMING UP", "MY LEAGUES", "LATEST ACTIVITY", "WHAT TO KNOW"]) {
    assert.match(client, new RegExp(moduleName));
  }
});
