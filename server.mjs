// Llaves · servidor local sin dependencias.
// Sirve la app y guarda progreso, eventos y grabaciones en ./data para que Claude los lea.
import http from "node:http";
import fs from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(ROOT, "public");
const DATA = path.join(ROOT, "data");
const DIRS = {
  temas: path.join(DATA, "temas"),
  extra: path.join(DATA, "extra"),
  prog: path.join(DATA, "progreso"),
  bandeja: path.join(DATA, "bandeja"),
  feedback: path.join(DATA, "feedback"),
};
const PORT = Number(process.env.PORT || 8811);
const HOST = process.env.HOST || "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon",
  ".webm": "audio/webm", ".mp4": "audio/mp4", ".m4a": "audio/mp4", ".ogg": "audio/ogg", ".wav": "audio/wav",
  ".webmanifest": "application/manifest+json",
};

for (const d of Object.values(DIRS)) await fs.mkdir(d, { recursive: true });

const send = (res, code, body, type = "application/json; charset=utf-8") => {
  res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};

async function readBody(req, limit = 40 * 1024 * 1024) {
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > limit) throw new Error("body too large"); chunks.push(c); }
  return Buffer.concat(chunks).toString("utf8");
}

async function readJsonDir(dir) {
  const out = [], errors = [];
  let files = [];
  try { files = (await fs.readdir(dir)).filter(f => f.endsWith(".json")).sort(); } catch { return { out, errors }; }
  for (const f of files) {
    try { out.push({ file: f, data: JSON.parse(await fs.readFile(path.join(dir, f), "utf8")) }); }
    catch (e) { errors.push({ file: f, error: String(e.message || e) }); }
  }
  return { out, errors };
}

async function writeAtomic(file, text) {
  const tmp = file + ".tmp-" + process.pid;
  await fs.writeFile(tmp, text);
  await fs.rename(tmp, file);
}

const safeId = s => String(s || "").replace(/[^a-zA-Z0-9_\-]/g, "").slice(0, 80);

async function api(req, res, url) {
  const p = url.pathname;

  if (p === "/api/content" && req.method === "GET") {
    const temas = await readJsonDir(DIRS.temas);
    const extra = await readJsonDir(DIRS.extra);
    let plan = null;
    try { plan = JSON.parse(await fs.readFile(path.join(DATA, "plan.json"), "utf8")); } catch {}
    return send(res, 200, {
      temas: temas.out.map(x => x.data),
      extra: extra.out.map(x => ({ ...x.data, _file: x.file })),
      plan,
      errors: [...temas.errors, ...extra.errors],
    });
  }

  if (p === "/api/progress") {
    const file = path.join(DIRS.prog, "progreso.json");
    if (req.method === "GET") {
      try { return send(res, 200, await fs.readFile(file, "utf8")); } catch { return send(res, 200, "null"); }
    }
    if (req.method === "PUT") {
      const body = await readBody(req);
      JSON.parse(body); // valida
      await writeAtomic(file, body);
      return send(res, 200, { ok: true });
    }
  }

  if (p === "/api/events" && req.method === "POST") {
    const { events = [] } = JSON.parse(await readBody(req));
    if (events.length) {
      await fs.appendFile(path.join(DIRS.prog, "eventos.jsonl"), events.map(e => JSON.stringify(e)).join("\n") + "\n");
    }
    return send(res, 200, { ok: true, n: events.length });
  }

  if (p === "/api/recordings" && req.method === "POST") {
    const body = JSON.parse(await readBody(req));
    const id = safeId(body.id) || ("rec-" + Date.now());
    const ext = /mp4|m4a|aac/.test(body.mime || "") ? ".m4a" : /ogg/.test(body.mime || "") ? ".ogg" : ".webm";
    if (body.audio) await fs.writeFile(path.join(DIRS.bandeja, id + ext), Buffer.from(body.audio, "base64"));
    const meta = { ...body, id, audio: undefined, audioFile: body.audio ? id + ext : null, recibido: new Date().toISOString() };
    await writeAtomic(path.join(DIRS.bandeja, id + ".json"), JSON.stringify(meta, null, 2));
    return send(res, 200, { ok: true, id });
  }

  if (p === "/api/recordings" && req.method === "GET") {
    const recs = (await readJsonDir(DIRS.bandeja)).out.map(x => x.data);
    const fbs = (await readJsonDir(DIRS.feedback)).out.map(x => x.data);
    const byId = Object.fromEntries(fbs.map(f => [f.id, f]));
    recs.sort((a, b) => String(b.fecha || b.recibido).localeCompare(String(a.fecha || a.recibido)));
    return send(res, 200, recs.map(r => ({ ...r, feedback: byId[r.id] || null })));
  }

  if (p.startsWith("/api/audio/") && req.method === "GET") {
    const name = path.basename(p.slice("/api/audio/".length));
    const file = path.join(DIRS.bandeja, name);
    if (!existsSync(file)) return send(res, 404, { error: "no existe" });
    res.writeHead(200, { "Content-Type": MIME[path.extname(name)] || "application/octet-stream" });
    return createReadStream(file).pipe(res);
  }

  return send(res, 404, { error: "ruta desconocida" });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    let rel = decodeURIComponent(url.pathname);
    if (rel === "/" || !path.extname(rel)) rel = "/index.html";
    const file = path.join(PUB, path.normalize(rel));
    if (!file.startsWith(PUB) || !existsSync(file)) return send(res, 404, "No encontrado", "text/plain");
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    createReadStream(file).pipe(res);
  } catch (e) {
    send(res, 500, { error: String(e.message || e) });
  }
});

server.listen(PORT, HOST, () => console.log(`Llaves en http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`));
