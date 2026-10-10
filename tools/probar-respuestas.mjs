// Comprueba que las respuestas correctas pasan y que las frases con error no se aceptan como corrección.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { matches } = await import(path.join(ROOT, "public/js/check.js"));
const bad = [];
for (const dir of ["temas", "extra"]) {
  const d = path.join(ROOT, "data", dir);
  for (const f of fs.readdirSync(d).filter(x => x.endsWith(".json"))) {
    const t = JSON.parse(fs.readFileSync(path.join(d, f), "utf8"));
    for (const e of t.ejercicios || []) {
      if (e.respuestas && !matches(e.respuestas[0], e.respuestas)) bad.push(`${e.id}: la respuesta no se acepta a sí misma`);
      if (e.tipo === "corregir" && e.correcta === false) {
        if (matches(e.frase, e.correccion)) bad.push(`${e.id}: la frase con error se acepta como corrección («${e.frase}»)`);
        if (!matches(e.correccion[0], e.correccion)) bad.push(`${e.id}: corrección no se acepta`);
      }
      if (e.tipo === "ordenar" && !matches(e.en, [e.en])) bad.push(`${e.id}: ordenar no se acepta`);
    }
  }
}
console.log(bad.length ? bad.join("\n") : "Todo bien");
