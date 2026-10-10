// Genera la versión web estática en docs/ (GitHub Pages): copia public/ y empaqueta el contenido.
// Uso: node tools/publicar.mjs   → luego git add docs && git commit && git push
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "docs");
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, "public"), OUT, { recursive: true });

const readDir = d => fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith(".json")).sort().map(f => ({ f, data: JSON.parse(fs.readFileSync(path.join(d, f), "utf8")) })) : [];
const temas = readDir(path.join(ROOT, "data", "temas")).map(x => x.data);
const extra = readDir(path.join(ROOT, "data", "extra")).map(x => ({ ...x.data, _file: x.f }));
let plan = null;
try { plan = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "plan.json"), "utf8")); } catch {}

fs.mkdirSync(path.join(OUT, "data"), { recursive: true });
fs.writeFileSync(path.join(OUT, "data", "content.json"), JSON.stringify({ temas, extra, plan, errors: [], publicado: new Date().toISOString() }));
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
const n = temas.reduce((a, t) => a + (t.ejercicios || []).length, 0) + extra.reduce((a, x) => a + (x.ejercicios || []).length, 0);
console.log(`docs/ listo · ${temas.length} temas · ${n} ejercicios · ${(fs.statSync(path.join(OUT, "data", "content.json")).size / 1024).toFixed(0)} KB`);
