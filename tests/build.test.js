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
