// Zero-dependency app shell server. No framework — this is a shell, not the
// studio. Serves the settings screen and three API routes: save the BYOK
// key, check whether one is configured, and run Heimdall's test call.
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { saveKey, keyConfigured } from "./portunus.js";
import { testCall } from "./heimdall.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/") {
        const html = await readFile(path.join(PUBLIC_DIR, "index.html"));
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(html);
        return;
      }

      if (req.method === "GET" && req.url === "/api/status") {
        const configured = await keyConfigured().catch(() => false);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ configured }));
        return;
      }

      if (req.method === "POST" && req.url === "/api/key") {
        const body = await readBody(req);
        const { value } = JSON.parse(body || "{}");
        await saveKey(value);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (req.method === "POST" && req.url === "/api/test-call") {
        const configured = await keyConfigured().catch(() => false);
        if (!configured) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "Configure a key first" }));
          return;
        }
        const result = await testCall();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "not found" }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.PORT || 4173;
  createServer().listen(port, () => {
    console.log(`DT Forge app shell listening on http://localhost:${port}`);
  });
}
