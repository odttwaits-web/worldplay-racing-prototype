import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const client = join(dist, "client");
const server = join(dist, "server");

await rm(dist, { recursive: true, force: true });
await mkdir(client, { recursive: true });
await mkdir(server, { recursive: true });

for (const file of ["index.html", "app.js", "data.js", "game-logic.js", "styles.css"]) {
  await cp(join(root, file), join(client, file));
}
await cp(join(root, "assets"), join(client, "assets"), { recursive: true });

const worker = `
const securityHeaders = {
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { ...securityHeaders, "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const response = await env.ASSETS.fetch(request);
    const resolved = response.status === 404
      ? await env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request))
      : response;
    const headers = new Headers(resolved.headers);
    for (const [name, value] of Object.entries(securityHeaders)) headers.set(name, value);
    return new Response(resolved.body, { status: resolved.status, statusText: resolved.statusText, headers });
  }
};
`.trimStart();

await writeFile(join(server, "index.js"), worker);
console.log(`Built WorldPlay preview in ${dist}`);
