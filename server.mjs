import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const previewPassword = process.env.PREVIEW_PASSWORD || "";
const previewUser = process.env.PREVIEW_USER || "worldplay";

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

function isAuthorised(req) {
  if (!previewPassword) return true;
  const expected = `Basic ${Buffer.from(`${previewUser}:${previewPassword}`).toString("base64")}`;
  return req.headers.authorization === expected;
}

function sharedHeaders() {
  return {
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY"
  };
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const clean = normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
  return join(root, clean === "/" ? "index.html" : clean);
}

const server = createServer(async (req, res) => {
  try {
    if (req.url === "/health") {
      res.writeHead(200, { ...sharedHeaders(), "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }
    if (!isAuthorised(req)) {
      res.writeHead(401, {
        ...sharedHeaders(),
        "Content-Type": "text/plain; charset=utf-8",
        "WWW-Authenticate": 'Basic realm="WorldPlay private preview", charset="UTF-8"'
      });
      res.end("Private preview — sign in required");
      return;
    }
    let file = safePath(req.url || "/");
    const info = await stat(file).catch(() => null);
    if (!info || info.isDirectory()) file = join(root, "index.html");
    const body = await readFile(file);
    res.writeHead(200, {
      ...sharedHeaders(),
      "Content-Type": types[extname(file)] || "application/octet-stream",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { ...sharedHeaders(), "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});

server.listen(port, host, () => {
  console.log(`WorldPlay Racing prototype: http://${host}:${port}${previewPassword ? " (protected)" : ""}`);
});
