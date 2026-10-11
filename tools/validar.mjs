// Valida el contenido: node tools/validar.mjs  (sale con código 1 si hay errores)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data");
const TIPOS = ["elegir", "escribir", "ordenar", "corregir", "transformar", "traducir", "emparejar", "escuchar", "identificar", "hablar", "texto", "lectura", "componer"];
const CODES = ["SUJ", "3S", "LL", "DM", "BE", "WW", "ING", "EST", "IRR", "MOD", "TPO", "UT", "PP", "FUT", "CMP", "CUA", "PRO", "CON", "VOC", "USO"];
const errs = [], warns = [];
const seen = new Map();
let total = 0;
const rows = [];

function checkItem(e, where) {
  const E = m => errs.push(`${where} ${e.id || "?"}: ${m}`);
  const W = m => warns.push(`${where} ${e.id || "?"}: ${m}`);
  if (!e.id) E("sin id");
  if (seen.has(e.id)) E(`id repetido (también en ${seen.get(e.id)})`); else seen.set(e.id, where);
  if (!TIPOS.includes(e.tipo)) E(`tipo desconocido «${e.tipo}»`);
  if (e.code && !CODES.includes(e.code)) W(`code desconocido «${e.code}»`);
  if (e.tipo !== "hablar" && !e.explica) W("sin explica");
  const arr = (k, min = 1) => { if (!Array.isArray(e[k]) || e[k].length < min || e[k].some(x => typeof x !== "string" || !x.trim())) E(`${k} inválido`); };
  switch (e.tipo) {
    case "elegir": case "identificar":
      if (e.tipo === "elegir" && !e.q) E("sin q");
      if (e.tipo === "identificar" && !e.frase) E("sin frase");
      arr("opciones", 2);
      if (!(Number.isInteger(e.a) && e.a >= 0 && e.a < (e.opciones || []).length)) E("a fuera de rango");
      if (new Set((e.opciones || []).map(o => o.trim().toLowerCase())).size !== (e.opciones || []).length) E("opciones repetidas");
      break;
    case "escribir": if (!e.q) E("sin q"); else if (!/_{2,}/.test(e.q)) W("q sin ___"); arr("respuestas"); break;
    case "transformar": if (!e.frase || !e.instruccion) E("falta frase o instruccion"); arr("respuestas"); break;
    case "traducir": if (!e.es) E("sin es"); arr("respuestas"); break;
    case "escuchar": if (!e.texto) E("sin texto"); arr("respuestas"); break;
    case "corregir":
      if (!e.frase || typeof e.correcta !== "boolean") E("falta frase o correcta");
      if (e.correcta === false) arr("correccion");
      break;
    case "ordenar": {
      if (!e.en) { E("sin en"); break; }
      const toks = e.en.trim().split(/\s+/);
      for (const x of e.extra || []) { if (/\s/.test(x)) E(`ficha extra con espacio «${x}»`); if (toks.includes(x)) E(`ficha extra «${x}» ya está en la frase`); }
      if (toks.length > 14) W(`frase larga para ordenar (${toks.length} fichas)`);
      break;
    }
    case "emparejar":
      if (!Array.isArray(e.pares) || e.pares.length < 3) E("pares insuficientes");
      else {
        const L = e.pares.map(p => p[0]), R = e.pares.map(p => p[1]);
        if (new Set(L).size !== L.length || new Set(R).size !== R.length) E("pares repetidos");
      }
      break;
    case "hablar": if (!e.consigna) E("sin consigna"); break;
    case "texto": {
      const ns = [...String(e.texto || "").matchAll(/\{(\d+)\}/g)].map(m => Number(m[1]));
      const H = e.huecos || [];
      if (!ns.length) E("texto sin huecos {n}");
      if (ns.length !== H.length) E(`texto: ${ns.length} marcas {n} pero ${H.length} huecos`);
      ns.forEach((n, i) => { if (n !== i + 1) E(`texto: marcas fuera de orden ({${n}})`); });
      H.forEach((hz, i) => {
        if (hz.opciones) { if (!(Number.isInteger(hz.a) && hz.a >= 0 && hz.a < hz.opciones.length)) E(`hueco ${i + 1}: a fuera de rango`); }
        else if (!Array.isArray(hz.respuestas) || !hz.respuestas.length) E(`hueco ${i + 1}: sin respuestas`);
      });
      break;
    }
    case "lectura":
      if (!e.texto) E("lectura sin texto");
      if (!Array.isArray(e.preguntas) || !e.preguntas.length) E("lectura sin preguntas");
      (e.preguntas || []).forEach((p, i) => { if (!p.q || !Array.isArray(p.opciones) || !(Number.isInteger(p.a) && p.a >= 0 && p.a < p.opciones.length)) E(`pregunta ${i + 1} inválida`); });
      break;
    case "componer":
      if (!e.consigna || !Array.isArray(e.requisitos) || !e.requisitos.length) E("componer sin consigna o requisitos");
      for (const r of e.requisitos || []) {
        let re; try { re = new RegExp(r.patron, "i"); } catch { E(`regex inválida «${r.patron}»`); continue; }
        if (e.ejemplo && !re.test(e.ejemplo.toLowerCase())) W(`el ejemplo no cumple «${r.texto}»`);
      }
      if (e.ejemplo && e.minPalabras && e.ejemplo.split(/\s+/).length < e.minPalabras) W("el ejemplo tiene menos palabras que minPalabras");
      break;
  }
}

for (const dir of ["temas", "extra"]) {
  const d = path.join(ROOT, dir);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).filter(x => x.endsWith(".json")).sort()) {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(d, f), "utf8")); } catch (e) { errs.push(`${dir}/${f}: JSON inválido · ${e.message}`); continue; }
    const where = `${dir}/${f}`;
    if (dir === "temas") {
      for (const k of ["id", "titulo", "grupo", "teoria", "ejercicios"]) if (!data[k]) errs.push(`${where}: falta «${k}»`);
      if (data.id && data.id + ".json" !== f) warns.push(`${where}: id «${data.id}» no coincide con el archivo`);
    }
    for (const [i, w] of (data.palabras || []).entries()) {
      const where2 = `${where} palabra ${w.id || w.en || i}`;
      if (!w.en || !w.es) errs.push(`${where2}: falta en o es`);
      if ((w.clase === "verbo") && (!w.formas || !["s", "pasado", "participio", "ing"].every(k => w.formas[k]))) errs.push(`${where2}: verbo sin las cuatro formas`);
      if (w.hueco && (!/_{2,}/.test(w.hueco.frase || "") || !w.hueco.respuestas?.length)) warns.push(`${where2}: hueco incompleto`);
    }
    const wids = (data.palabras || []).map(w => (w.id || w.en || "").toLowerCase());
    if (new Set(wids).size !== wids.length) errs.push(`${where}: palabras con id repetido`);
    const items = data.ejercicios || [];
    items.forEach(e => checkItem(e, where));
    total += items.length;
    const tipos = {};
    items.forEach(e => tipos[e.tipo] = (tipos[e.tipo] || 0) + 1);
    rows.push(`${String(items.length).padStart(4)}${data.palabras ? ` +${data.palabras.length}p` : ""}  ${where}  ${Object.entries(tipos).map(([k, v]) => `${k}:${v}`).join(" ")}`);
  }
}

console.log(rows.join("\n"));
console.log(`\nTotal: ${total} ejercicios · ${errs.length} errores · ${warns.length} avisos`);
if (warns.length) console.log("\nAvisos:\n" + warns.slice(0, 60).join("\n") + (warns.length > 60 ? `\n… y ${warns.length - 60} más` : ""));
if (errs.length) { console.log("\nErrores:\n" + errs.join("\n")); process.exit(1); }
