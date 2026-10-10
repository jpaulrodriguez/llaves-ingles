// Arma las sesiones. Regla de la metodología: bloquear para aprender (un tema),
// mezclar para dominar (sesión de hoy), y siempre recuperar lo que toca repasar.
import { S, dueIds, temaMastery, temaSeen, weakCodes } from "./store.js";
import { GYM, BY_CODE, generate } from "./generator.js";
import { isDue } from "./srs.js";

const shuffle = a => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const playable = e => e && e.tipo !== "hablar";

// Prioridad de un ejercicio dentro de un tema: vencidos > nuevos > caja baja.
function rank(ids) {
  const P = S.prog.items;
  return shuffle(ids).sort((a, b) => score(P[b]) - score(P[a]));
  function score(r) {
    if (!r) return 50 + Math.random() * 10;            // nuevo
    if (isDue(r)) return 80 - r.box * 5;               // vencido
    return 20 - r.box * 4 + (r.fail > r.ok ? 15 : 0);  // ya visto, no toca
  }
}

// Dentro de una sesión, de lo fácil a lo difícil, sin dos tipos iguales seguidos si se puede.
function arrange(list) {
  const sorted = [...list].sort((a, b) => (a.nivel || 2) - (b.nivel || 2) + (Math.random() - .5) * 1.2);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].tipo === sorted[i - 1].tipo) {
      const j = sorted.findIndex((x, k) => k > i && x.tipo !== sorted[i - 1].tipo);
      if (j > 0) [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
    }
  }
  return sorted;
}

export function sessionTema(temaId, size = S.prog.settings.size) {
  const t = S.byId[temaId];
  const ids = rank(t.ejercicios.filter(playable).map(e => e.id));
  const gym = GYM[temaId];
  const nGen = gym ? Math.round(size * 0.3) : 0;
  const list = ids.slice(0, size - nGen).map(id => S.items[id]);
  for (let i = 0; i < nGen; i++) list.push(gym());
  return { titulo: t.titulo, modo: "tema", items: arrange(list) };
}

export function focusTemas() {
  const plan = (S.plan?.foco || []).filter(f => S.byId[f.tema]);
  if (plan.length) return plan;
  // Sin plan: los temas vistos con menor dominio.
  return S.temas.filter(t => temaSeen(t.id) > 0).sort((a, b) => temaMastery(a.id) - temaMastery(b.id)).slice(0, 3).map(t => ({ tema: t.id, peso: 1 }));
}

export function sessionHoy(size = S.prog.settings.size) {
  const used = new Set();
  const out = [];
  const take = (ids, n) => { for (const id of ids) { if (out.length >= n) break; if (!used.has(id) && playable(S.items[id])) { used.add(id); out.push(S.items[id]); } } };

  // 1) Repaso vencido (35 %)
  const due = shuffle(dueIds());
  take(due, Math.round(size * 0.35));

  // 2) Temas foco (45 %), repartidos por peso
  const foco = focusTemas();
  const totalW = foco.reduce((a, f) => a + (f.peso || 1), 0) || 1;
  const target = out.length + Math.round(size * 0.45);
  for (const f of foco) {
    const n = Math.max(1, Math.round((size * 0.45 * (f.peso || 1)) / totalW));
    take(rank(S.byId[f.tema].ejercicios.filter(playable).map(e => e.id)), Math.min(target, out.length + n));
  }

  // 3) Gimnasio de las llaves rotas (el resto)
  const codes = weakCodes(3);
  while (out.length < size) {
    const c = codes.length ? codes[out.length % codes.length] : null;
    const g = (c && BY_CODE[c]) ? BY_CODE[c]() : null;
    if (g) { out.push(g); continue; }
    // si el código no tiene generador, un ejercicio escrito de ese código
    const pool = Object.values(S.items).filter(e => playable(e) && e.code === c && !used.has(e.id));
    if (pool.length) { const e = pool[Math.floor(Math.random() * pool.length)]; used.add(e.id); out.push(e); continue; }
    out.push(generate());
  }
  return { titulo: "Sesión de hoy", modo: "hoy", items: arrange(out), foco: foco.map(f => f.tema), codes };
}

export function sessionRepaso(size = S.prog.settings.size) {
  const ids = shuffle(dueIds()).slice(0, size);
  return { titulo: "Repaso pendiente", modo: "repaso", items: arrange(ids.map(id => S.items[id])) };
}

export function sessionErrores(size = S.prog.settings.size) {
  const P = S.prog.items;
  const ids = Object.keys(P).filter(id => S.items[id] && playable(S.items[id]) && P[id].fail > 0 && P[id].box <= 2)
    .sort((a, b) => (P[b].fail - P[b].ok) - (P[a].fail - P[a].ok)).slice(0, size);
  return { titulo: "Mis errores", modo: "errores", items: arrange(ids.map(id => S.items[id])) };
}

export function sessionGym({ tenses, forms, size = S.prog.settings.size }) {
  const items = Array.from({ length: size }, () => generate({ tenses, forms }));
  return { titulo: "Gimnasio de llaves", modo: "gym", items, gym: { tenses, forms } };
}
