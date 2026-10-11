// Vocabulario progresivo: de cada palabra salen sus ejercicios (significado, escribirla,
// completar la frase, formas del verbo, opuesto, comparativo, dictado). Ids estables
// para que la repetición espaciada siga cada palabra por separado.

const slug = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
// Elige n distractores distintos de forma determinista (mismo ejercicio = mismas opciones).
function pickDet(pool, n, seed, exclude) {
  const out = [], seen = new Set([String(exclude).toLowerCase()]);
  const arr = pool.filter(Boolean);
  if (!arr.length) return out;
  let k = hash(seed);
  for (let i = 0; i < arr.length * 3 && out.length < n; i++) {
    k = Math.imul(k ^ (k >>> 15), 2246822507) >>> 0;
    const v = arr[k % arr.length];
    const key = String(v).toLowerCase();
    if (!seen.has(key)) { seen.add(key); out.push(v); }
  }
  return out;
}
const placeAt = (correct, others, seed) => {
  const opts = [...others]; const pos = hash(seed + "pos") % (opts.length + 1);
  opts.splice(pos, 0, correct); return { opciones: opts, a: pos };
};
const typeable = en => !/[+…/]|\.\.\./.test(en);
const CODE = { verbo: "IRR", adjetivo: "VOC", adverbio: "VOC", preposición: "USO", "phrasal verb": "VOC", expresión: "USO", pronombre: "PRO", sustantivo: "VOC" };

export function wordId(temaId, p) { return `${temaId}:${p.id ? slug(p.id) : slug(p.en)}`; }

export function buildWords(tema) {
  const list = (tema.palabras || []).filter(p => p && p.en && p.es);
  const words = list.map((p, i) => ({ ...p, wid: wordId(tema.id, p), tema: tema.id, orden: p.orden ?? i + 1 }));
  const esPool = words.map(w => w.es);
  const enPool = words.map(w => w.en);
  const items = [];
  for (const w of words) {
    const base = { tema: tema.id, word: w.wid, code: CODE[w.clase] && w.clase !== "verbo" ? CODE[w.clase] : "VOC" };
    const explain = `${w.en}${w.ipa ? " " + w.ipa : ""} = ${w.es}.${w.nota ? " " + w.nota : ""}`;
    // 1. Significado (reconocer)
    const sig = placeAt(w.es, pickDet(esPool, 3, w.wid + "sig", w.es), w.wid);
    items.push({ ...base, id: `w:${w.wid}:sig`, tipo: "elegir", nivel: 1, q: `¿Qué significa «${w.en}»?`, ...sig, explica: explain, palabra: w.en });
    // 2. Escribirla en inglés (producir)
    if (typeable(w.en)) items.push({ ...base, id: `w:${w.wid}:en`, tipo: "traducir", nivel: 2, es: `${w.es}${w.clase ? ` (${w.clase})` : ""}`, respuestas: [w.en, ...(w.en.startsWith("to ") ? [w.en.slice(3)] : [])], explica: explain });
    // 3. Completar la frase
    if (w.hueco?.frase && w.hueco?.respuestas?.length) items.push({ ...base, id: `w:${w.wid}:hueco`, tipo: "escribir", nivel: 2, q: w.hueco.frase, respuestas: w.hueco.respuestas, explica: `${explain}${w.ejemplo ? ` Ejemplo: ${w.ejemplo}` : ""}` });
    // 4. Formas del verbo
    const f = w.formas;
    if (w.clase === "verbo" || w.clase === "phrasal verb") {
      if (f?.pasado) items.push({ ...base, code: "IRR", id: `w:${w.wid}:pas`, tipo: "escribir", nivel: w.irregular ? 1 : 2, q: `${w.en} → pasado: ___`, respuestas: [f.pasado, ...f.pasado.split("/").map(x => x.trim())], explica: `${w.en} · ${f.s || ""} · ${f.pasado} · ${f.participio || ""} · ${f.ing || ""}` });
      if (f?.participio && (w.irregular || f.participio !== f.pasado)) items.push({ ...base, code: "IRR", id: `w:${w.wid}:pp`, tipo: "escribir", nivel: 2, q: `I have ___ (${w.en}) · participio`, respuestas: [f.participio, ...f.participio.split("/").map(x => x.trim())], explica: `Participio de ${w.en}: ${f.participio} (presente perfecto: have/has + participio).` });
      if (f?.s && f.s !== w.en + "s") items.push({ ...base, code: "3S", id: `w:${w.wid}:s`, tipo: "escribir", nivel: 1, q: `She ___ (${w.en}) · presente simple`, respuestas: [f.s], explica: `He/she/it: ${f.s}. Ortografía: ${w.en} → ${f.s}.` });
      if (f?.ing && f.ing !== w.en + "ing") items.push({ ...base, code: "ING", id: `w:${w.wid}:ing`, tipo: "escribir", nivel: 1, q: `They are ___ (${w.en}) · -ing`, respuestas: [f.ing], explica: `Forma -ing: ${f.ing}.` });
    }
    // 5. Opuesto y comparativo
    if (w.opuesto) {
      const op = placeAt(w.opuesto, pickDet(enPool, 3, w.wid + "op", w.opuesto).filter(x => x !== w.en), w.wid + "o");
      items.push({ ...base, id: `w:${w.wid}:op`, tipo: "elegir", nivel: 1, q: `Lo contrario de «${w.en}»`, ...op, explica: `${w.en} ↔ ${w.opuesto}.` });
    }
    if (w.comparativo) items.push({ ...base, code: "CMP", id: `w:${w.wid}:cmp`, tipo: "escribir", nivel: 2, q: `${w.en} → comparativo: ___`, respuestas: [w.comparativo], explica: `${w.en} → ${w.comparativo}${w.superlativo ? " → " + w.superlativo : ""}.` });
    // 6. Dictado de la frase de ejemplo
    if (w.ejemplo && w.ejemplo.split(" ").length <= 16) items.push({ ...base, id: `w:${w.wid}:dict`, tipo: "escuchar", nivel: 3, texto: w.ejemplo, respuestas: [w.ejemplo], explica: explain });
  }
  return { words, items };
}

// Tarjeta de presentación (no se califica).
export const introCard = w => ({ id: `intro:${w.wid}`, tipo: "presentar", tema: w.tema, word: w.wid, w, nivel: 1 });
