// Palmera Bay — tiny static server for the game folder.
// Serves game/ on 127.0.0.1:8080 by default, or --port <n>.
import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { join, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const gameDir = resolve(join(here, "game"));

let port = 8080;
const portFlag = process.argv.indexOf("--port");
if (portFlag >= 0) {
  const n = Number(process.argv[portFlag + 1]);
  if (Number.isInteger(n) && n >= 1 && n <= 65535) port = n;
}

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".bin": "application/octet-stream",
  ".wasm": "application/wasm",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".txt": "text/plain",
};

const server = createServer((req, res) => {
  let path;
  try {
    path = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
  } catch (e) {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }
  if (path.endsWith("/")) path += "index.html";
  const file = resolve(join(gameDir, path));
  if (file !== gameDir && !file.startsWith(gameDir + sep)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  let stat;
  try {
    stat = statSync(file);
    if (!stat.isFile()) throw new Error("not a file");
  } catch (e) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const type = MIME[extname(file).toLowerCase()] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": type,
    "Content-Length": stat.size,
    "Cache-Control": "no-store",
  });
  createReadStream(file).pipe(res);
});

server.listen(port, "127.0.0.1", () => {
  console.log("Palmera Bay game folder on http://127.0.0.1:" + port + "/");
});
