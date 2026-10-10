// Estado global: contenido (temas + extra + plan) y progreso (se guarda en el servidor y en el navegador).
import { review, today, isDue, mastery, daysBetween, addDays } from "./srs.js";

const LS = "llaves-progreso-v1";

export const S = {
  temas: [], byId: {}, items: {}, groups: [], plan: null, errors: [],
  prog: null, online: true,
  mode: "local", // "local" = servidor en el Mac · "web" = GitHub Pages (todo en el navegador)
};
const LS_EV = "llaves-eventos-v1";

// Contenido: primero el servidor local; si no hay, el JSON estático publicado.
export async function fetchContent() {
  if (!/github\.io$/.test(location.hostname)) try {
    const r = await fetch("api/content", { cache: "no-store" });
    if (r.ok && (r.headers.get("content-type") || "").includes("json")) { S.mode = "local"; return await r.json(); }
  } catch {}
  S.mode = "web";
  const r = await fetch("data/content.json", { cache: "no-cache" });
  return await r.json();
}

// Eventos guardados en el navegador (modo web): para el resumen que se pega en el chat.
export function localEvents() {
  try { return JSON.parse(localStorage.getItem(LS_EV) || "[]"); } catch { return []; }
}

const blankProgress = () => ({
  version: 1, creado: today(), items: {}, days: {}, codes: {}, xp: 0,
  streak: { current: 0, best: 0, last: null },
  settings: { sound: true, size: 20, theme: "auto", voice: "" },
});

export async function load() {
  let content = null;
  try { content = await fetchContent(); } catch { S.online = false; }
  S.online = S.mode === "local";
  if (!content) content = { temas: [], extra: [], plan: null, errors: [] };
  ingest(content);

  let prog = null;
  try {
    if (S.online) { const r = await fetch("api/progress", { cache: "no-store" }); prog = await r.json(); }
  } catch {}
  let local = null;
  try { local = JSON.parse(localStorage.getItem(LS) || "null"); } catch {}
  // Gana la copia con más respuestas (por si una quedó atrás).
  const count = p => p ? Object.values(p.days || {}).reduce((a, d) => a + (d.answers || 0), 0) : -1;
  S.prog = { ...blankProgress(), ...(count(local) > count(prog) ? local : prog || local || {}) };
  S.prog.settings = { ...blankProgress().settings, ...(S.prog.settings || {}) };
  rollStreak();
}

export function reingest(c) { ingest(c); }

function ingest({ temas, extra, plan, errors }) {
  S.errors = errors || [];
  const byId = {};
  for (const t of temas) {
    if (!t || !t.id) continue;
    t.ejercicios = (t.ejercicios || []).map(e => ({ ...e, tema: t.id }));
    byId[t.id] = t;
  }
  // Ejercicios extra que agrega Claude: { tema: "id", ejercicios: [...] } o un tema completo.
  for (const x of extra || []) {
    if (x.teoria && x.id && !byId[x.id]) { x.ejercicios = (x.ejercicios || []).map(e => ({ ...e, tema: x.id })); byId[x.id] = x; continue; }
    const tid = x.tema;
    if (!tid) continue;
    if (!byId[tid]) byId[tid] = { id: tid, titulo: x.titulo || tid, grupo: x.grupo || "Refuerzos", orden: 900, teoria: null, ejercicios: [] };
    const known = new Set(byId[tid].ejercicios.map(e => e.id));
    for (const e of x.ejercicios || []) if (!known.has(e.id)) byId[tid].ejercicios.push({ ...e, tema: tid, extra: true });
  }
  S.byId = byId;
  S.temas = Object.values(byId).sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
  S.items = {};
  for (const t of S.temas) for (const e of t.ejercicios) S.items[e.id] = e;
  const order = ["Tiempos verbales", "Modales", "Estructuras", "Inglés para el trabajo", "Vocabulario", "Errores típicos", "Refuerzos"];
  const gs = [...new Set(S.temas.map(t => t.grupo || "Otros"))];
  S.groups = gs.sort((a, b) => (order.indexOf(a) + 99) % 99 - (order.indexOf(b) + 99) % 99 || a.localeCompare(b));
  S.plan = plan;
}

// ---- guardado ----
let saveTimer = null;
export function save(now = false) {
  try { localStorage.setItem(LS, JSON.stringify(S.prog)); } catch {}
  clearTimeout(saveTimer);
  if (S.mode !== "local") return;
  const go = () => fetch("api/progress", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(S.prog) }).catch(() => {});
  if (now) go(); else saveTimer = setTimeout(go, 600);
}

let evQueue = [];
let evTimer = null;
export function logEvent(e) {
  evQueue.push({ ts: new Date().toISOString(), ...e });
  clearTimeout(evTimer);
  evTimer = setTimeout(flushEvents, 1500);
}
export async function flushEvents() {
  if (!evQueue.length) return;
  const batch = evQueue; evQueue = [];
  if (S.mode !== "local") {
    try { localStorage.setItem(LS_EV, JSON.stringify(localEvents().concat(batch).slice(-3000))); } catch {}
    return;
  }
  try {
    const r = await fetch("api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ events: batch }) });
    if (!r.ok) throw 0;
  } catch { evQueue = batch.concat(evQueue); }
}
addEventListener("pagehide", () => {
  if (evQueue.length && S.mode !== "local") flushEvents();
  else if (evQueue.length) navigator.sendBeacon?.("api/events", new Blob([JSON.stringify({ events: evQueue })], { type: "application/json" }));
  try { localStorage.setItem(LS, JSON.stringify(S.prog)); } catch {}
});

// ---- registrar una respuesta ----
export function record(item, correct, answer) {
  const d = today();
  const P = S.prog;
  if (!item.gen) P.items[item.id] = review(P.items[item.id], correct, d);
  const day = (P.days[d] ||= { answers: 0, correct: 0, xp: 0, ms: 0 });
  day.answers++; if (correct) day.correct++;
  const gain = correct ? (item.nivel === 3 ? 15 : item.nivel === 2 ? 12 : 10) : 2;
  day.xp += gain; P.xp += gain;
  if (item.code) {
    const c = ((P.codes[d] ||= {})[item.code] ||= [0, 0]);
    c[correct ? 0 : 1]++;
  }
  touchStreak(d);
  logEvent({ tema: item.tema, id: item.id, tipo: item.tipo, code: item.code, ok: correct, r: answer ?? null, gen: !!item.gen,
    q: item.gen ? (item.q || item.frase || item.en) : undefined });
  save();
  return gain;
}

export function addTime(ms) {
  const d = today(); const day = (S.prog.days[d] ||= { answers: 0, correct: 0, xp: 0, ms: 0 });
  day.ms = (day.ms || 0) + ms; save();
}

function touchStreak(d) {
  const st = S.prog.streak;
  if (st.last === d) return;
  st.current = st.last && daysBetween(st.last, d) === 1 ? st.current + 1 : 1;
  st.best = Math.max(st.best, st.current);
  st.last = d;
}
function rollStreak() {
  const st = S.prog.streak;
  if (st.last && daysBetween(st.last, today()) > 1) st.current = 0;
}

// ---- consultas ----
export const temaIds = t => (S.byId[t]?.ejercicios || []).filter(e => e.tipo !== "hablar").map(e => e.id);
export const temaMastery = t => mastery(temaIds(t), S.prog.items);
export const temaSeen = t => temaIds(t).filter(id => S.prog.items[id]?.seen).length;
export const dueIds = () => Object.entries(S.prog.items).filter(([id, r]) => S.items[id] && S.items[id].tipo !== "hablar" && isDue(r)).map(([id]) => id);

export function codeStats(days = 7, offset = 0) {
  const out = {};
  const end = addDays(today(), -offset), start = addDays(end, -(days - 1));
  for (const [d, m] of Object.entries(S.prog.codes)) {
    if (d < start || d > end) continue;
    for (const [code, [ok, fail]] of Object.entries(m)) {
      const o = (out[code] ||= { ok: 0, fail: 0 }); o.ok += ok; o.fail += fail;
    }
  }
  return out;
}

export function weakCodes(n = 3) {
  const s = codeStats(14);
  const plan = S.plan?.codigos || [];
  const scored = Object.entries(s).filter(([, v]) => v.ok + v.fail >= 3)
    .map(([c, v]) => [c, v.fail / (v.ok + v.fail)]).sort((a, b) => b[1] - a[1]).filter(([, r]) => r > 0.15).map(([c]) => c);
  return [...new Set([...scored, ...plan])].slice(0, n);
}

export const CODES = {
  SUJ: "Sujeto obligatorio (it / there)", "3S": "-s de he/she/it", LL: "La llave en preguntas y negativas",
  DM: "Doble marca (did + pasado, does + -s)", BE: "Be mezclado con verbo simple", WW: "Concordancia was/were, am/is/are",
  ING: "Be + -ing completo", EST: "Verbos de estado en continuo", IRR: "Verbos irregulares", MOD: "Modal + verbo base",
  TPO: "Elegir el tiempo correcto", UT: "Used to", PP: "Presente perfecto", FUT: "Futuro", CMP: "Comparativos",
  CUA: "Cuantificadores", PRO: "Pronombres indefinidos", CON: "Conectores", VOC: "Vocabulario", USO: "Frases hechas y calcos",
};
