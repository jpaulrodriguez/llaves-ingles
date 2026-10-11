// Arma las sesiones. Regla de la metodología: bloquear para aprender (un tema),
// mezclar para dominar (sesión de hoy), y siempre recuperar lo que toca repasar.
// v2: vocabulario que entra poco a poco y niveles que se abren con el dominio.
import { S, dueIds, temaMastery, temaSeen, weakCodes, nextWords, wordsIntroducedToday, wordItems } from "./store.js";
import { GYM, BY_CODE, generate, addVerbs } from "./generator.js";
import { introCard } from "./words.js";
import { isDue } from "./srs.js";

const shuffle = a => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
export const LONG = new Set(["texto", "lectura", "componer"]);
const SUPPORTED = new Set(["elegir", "escribir", "ordenar", "corregir", "transformar", "traducir", "emparejar", "escuchar", "identificar", "texto", "lectura", "componer"]);
// Las palabras solo se practican después de presentarlas.
const playable = e => e && SUPPORTED.has(e.tipo) && (!e.word || S.prog.words?.[e.word]);
const short = e => playable(e) && !LONG.has(e.tipo);

// Nivel que toca según el dominio del tema: 1 → reconocer, 2 → producir frases, 3 → textos.
export function levelTarget(temaId) {
  const m = temaMastery(temaId);
  return m < 25 ? 1 : m < 55 ? 2 : 3;
}
const fits = (e, target) => (e.nivel || 2) <= target || ((e.nivel || 2) === target + 1 && Math.random() < 0.2);

// Prioridad: vencidos > nuevos > caja baja.
function rank(ids) {
  const P = S.prog.items;
  return shuffle(ids).sort((a, b) => score(P[b]) - score(P[a]));
  function score(r) {
    if (!r) return 50 + Math.random() * 10;
    if (isDue(r)) return 80 - r.box * 5;
    return 20 - r.box * 4 + (r.fail > r.ok ? 15 : 0);
  }
}

// De lo fácil a lo difícil, sin dos tipos iguales seguidos; los extensos al final.
function arrange(list) {
  const longs = list.filter(e => LONG.has(e.tipo));
  const sorted = list.filter(e => !LONG.has(e.tipo)).sort((a, b) => (a.nivel || 2) - (b.nivel || 2) + (Math.random() - .5) * 1.2);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].tipo === sorted[i - 1].tipo) {
      const j = sorted.findIndex((x, k) => k > i && x.tipo !== sorted[i - 1].tipo);
      if (j > 0) [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
    }
  }
  return [...sorted, ...longs];
}

// Los verbos ya presentados entran al gimnasio.
function syncGym() {
  addVerbs(S.words.filter(w => S.prog.words?.[w.wid] && w.clase === "verbo" && w.formas?.pasado && w.comp?.length && !w.en.includes(" ")));
}

// Tarjeta + primer reconocimiento de cada palabra nueva.
function introBlock(words) {
  const out = [];
  for (const w of words) {
    out.push(introCard(w));
    const sig = S.items[`w:${w.wid}:sig`];
    if (sig) out.push({ ...sig, afterIntro: true });
  }
  return out;
}

const longPool = temaId => (S.byId[temaId]?.ejercicios || []).filter(e => LONG.has(e.tipo));

export function sessionTema(temaId, size = S.prog.settings.size) {
  syncGym();
  const t = S.byId[temaId];
  const target = levelTarget(temaId);
  const head = t.palabras ? introBlock(nextWords(Math.min(5, size / 4), temaId)) : [];
  const pool = [...t.ejercicios, ...(t.wordItems || [])].filter(short);
  const ids = rank(pool.filter(e => fits(e, target)).map(e => e.id));
  const gym = GYM[temaId];
  const nLong = target >= 3 ? 2 : target === 2 ? 1 : 0;
  const nGen = gym ? Math.round(size * 0.25) : 0;
  const room = Math.max(4, size - head.length - nGen - nLong);
  const list = ids.slice(0, room).map(id => S.items[id]);
  for (let i = 0; i < nGen; i++) list.push(gym());
  rank(longPool(temaId).map(e => e.id)).slice(0, nLong).forEach(id => list.push(S.items[id]));
  return { titulo: t.titulo, modo: "tema", items: [...head, ...arrange(list)] };
}

export function focusTemas() {
  const plan = (S.plan?.foco || []).filter(f => S.byId[f.tema]);
  if (plan.length) return plan;
  return S.temas.filter(t => temaSeen(t.id) > 0).sort((a, b) => temaMastery(a.id) - temaMastery(b.id)).slice(0, 3).map(t => ({ tema: t.id, peso: 1 }));
}

export const wordsLeftToday = () => Math.max(0, (S.prog.settings.wordsPerDay ?? 5) - wordsIntroducedToday());

export function sessionHoy(size = S.prog.settings.size) {
  syncGym();
  const used = new Set();
  const out = [];
  const take = (ids, n) => { for (const id of ids) { if (out.length >= n) break; if (!used.has(id) && short(S.items[id])) { used.add(id); out.push(S.items[id]); } } };

  // 0) Hasta 3 palabras nuevas (el resto de la cuota en «Palabras nuevas»)
  const head = introBlock(nextWords(Math.min(3, wordsLeftToday())));
  head.forEach(e => used.add(e.id));

  // 1) Repaso vencido (35 %): incluye palabras ya presentadas
  take(shuffle(dueIds()), Math.round(size * 0.35));

  // 2) Temas foco (45 %), al nivel que toca a cada uno
  const foco = focusTemas();
  const totalW = foco.reduce((a, f) => a + (f.peso || 1), 0) || 1;
  const target = out.length + Math.round(size * 0.45);
  for (const f of foco) {
    const lvl = levelTarget(f.tema);
    const n = Math.max(1, Math.round((size * 0.45 * (f.peso || 1)) / totalW));
    take(rank(S.byId[f.tema].ejercicios.filter(e => short(e) && fits(e, lvl)).map(e => e.id)), Math.min(target, out.length + n));
  }

  // 3) Gimnasio de las llaves rotas
  const codes = weakCodes(3);
  while (out.length < size - 1) {
    const c = codes.length ? codes[out.length % codes.length] : null;
    const g = (c && BY_CODE[c]) ? BY_CODE[c]() : null;
    if (g) { out.push(g); continue; }
    const pool = Object.values(S.items).filter(e => short(e) && e.code === c && !used.has(e.id));
    if (pool.length) { const e = pool[Math.floor(Math.random() * pool.length)]; used.add(e.id); out.push(e); continue; }
    out.push(generate());
  }

  // 4) Un ejercicio extenso del foco cuando el tema ya lo permite
  const ready = foco.filter(f => levelTarget(f.tema) >= 2).flatMap(f => longPool(f.tema));
  if (ready.length) out.push(S.items[rank(ready.map(e => e.id))[0]]);
  else out.push(generate());

  return { titulo: "Sesión de hoy", modo: "hoy", items: [...head, ...arrange(out)], foco: foco.map(f => f.tema), codes };
}

// Palabras nuevas de hoy + repaso de las que ya conoces.
export function sessionPalabras(n = wordsLeftToday() || 5) {
  const nuevas = nextWords(n);
  const head = introBlock(nuevas);
  const practice = shuffle(nuevas.flatMap(w => wordItems(w.wid).filter(e => !e.id.endsWith(":sig") && (e.nivel || 2) <= 2))).slice(0, nuevas.length * 2);
  const known = shuffle(Object.keys(S.prog.words || {})).flatMap(wid => wordItems(wid))
    .filter(e => short(e) && (!S.prog.items[e.id] || isDue(S.prog.items[e.id]))).slice(0, 8);
  return { titulo: "Palabras nuevas", modo: "palabras", items: [...head, ...shuffle([...practice, ...known.map(e => e)])] };
}

export function sessionExtensos(temaId = null, size = 4) {
  const temas = temaId ? [temaId] : focusTemas().map(f => f.tema);
  let pool = temas.flatMap(longPool);
  if (pool.length < size) pool = pool.concat(S.temas.flatMap(t => longPool(t.id)));
  const ids = [...new Set(rank(pool.map(e => e.id)))].slice(0, size);
  return { titulo: "Ejercicios extensos", modo: "extensos", items: ids.map(id => S.items[id]) };
}

export function sessionRepaso(size = S.prog.settings.size) {
  const ids = shuffle(dueIds()).slice(0, size);
  return { titulo: "Repaso pendiente", modo: "repaso", items: arrange(ids.map(id => S.items[id])) };
}

export function sessionErrores(size = S.prog.settings.size) {
  const P = S.prog.items;
  const ids = Object.keys(P).filter(id => S.items[id] && short(S.items[id]) && P[id].fail > 0 && P[id].box <= 2)
    .sort((a, b) => (P[b].fail - P[b].ok) - (P[a].fail - P[a].ok)).slice(0, size);
  return { titulo: "Mis errores", modo: "errores", items: arrange(ids.map(id => S.items[id])) };
}

export function sessionGym({ tenses, forms, size = S.prog.settings.size }) {
  syncGym();
  const items = Array.from({ length: size }, () => generate({ tenses, forms }));
  return { titulo: "Gimnasio de llaves", modo: "gym", items, gym: { tenses, forms } };
}
