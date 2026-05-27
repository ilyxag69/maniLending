import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { createServer } from "node:http";

const root = process.cwd();
const port = Number(process.env.PORT || 4179);

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
};

function resolvePath(urlPath) {
  if (urlPath === "/") return "index.html";
  if (urlPath === "/privacy") return "privacy.html";
  if (urlPath === "/cookie") return "cookie.html";
  return urlPath.replace(/^\/+/, "");
}

createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);

  if (url.pathname === "/privacy.html") {
    response.writeHead(301, { Location: "/privacy" });
    response.end();
    return;
  }

  if (url.pathname === "/cookie.html") {
    response.writeHead(301, { Location: "/cookie" });
    response.end();
    return;
  }

  const relativePath = normalize(resolvePath(url.pathname));
  if (relativePath.startsWith("..")) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  const filePath = join(root, relativePath);
  if (!existsSync(filePath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const stats = statSync(filePath);
  response.writeHead(200, {
    "Content-Type": types[extname(filePath)] || "application/octet-stream",
    "Content-Length": stats.size,
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  createReadStream(filePath).pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`Local Mani.ai server: http://127.0.0.1:${port}`);
});
