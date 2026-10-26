#!/usr/bin/env node
/**
 * Preview the built site on http://localhost:5181.
 *
 * A static file server with directory-index resolution and a 404 page, small
 * enough to read in one sitting. `dist/` itself is what a static host serves,
 * so nothing here is required in production.
 */
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, sep } from "node:path";

const root = normalize(
  join(new URL("../", import.meta.url).pathname, "site", "public"),
);
const port = Number(process.env.PORT ?? 5181);
const host = process.env.HOST ?? "0.0.0.0";

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".zip": "application/zip",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const safePath = (urlPath) => {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const resolved = normalize(join(root, decoded));
  if (resolved !== root && !resolved.startsWith(`${root}${sep}`)) return null;
  return resolved;
};

const server = createServer(async (request, response) => {
  const target = safePath(request.url ?? "/");
  if (target === null) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  let file = target;
  try {
    const info = await stat(file);
    if (info.isDirectory()) file = join(file, "index.html");
    await stat(file);
  } catch {
    file = join(root, "404.html");
    try {
      await stat(file);
      response.writeHead(404, { "content-type": types[".html"] });
      createReadStream(file).pipe(response);
    } catch {
      response
        .writeHead(404, { "content-type": "text/plain" })
        .end("Not found");
    }
    return;
  }
  response.writeHead(200, {
    "content-type": types[extname(file)] ?? "application/octet-stream",
    "cache-control": "no-store",
  });
  createReadStream(file).pipe(response);
});

server.listen(port, host, () => {
  console.log(`REA site preview on http://${host}:${port}`);
});
