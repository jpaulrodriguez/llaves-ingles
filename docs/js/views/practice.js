import { S, dueIds, temaMastery, temaIds, wordsLearned } from "../store.js";
import { h, esc, icon, ring, $, $$ } from "../ui.js";
import { sessionHoy, sessionRepaso, sessionErrores, sessionTema, sessionGym, sessionPalabras, sessionExtensos, wordsLeftToday, LONG } from "../session.js";
import { TENSES, FORMS } from "../generator.js";
import { play } from "../player.js";
import { route } from "../main.js";

const gymState = { tenses: ["ps", "pc", "pas", "pac"], forms: ["aff", "neg", "q"] };

export function viewPractice() {
  const P = S.prog.items;
  const due = dueIds().length;
  const errs = Object.keys(P).filter(id => S.items[id] && P[id].fail > 0 && P[id].box <= 2).length;
  const el = h(`<div>
    <p class="eyebrow">Practicar</p>
    <h1 class="display">Repetir hasta que <em>salga solo</em>.</h1>
    <p class="sub">Primero un tema a la vez para entender la forma; después, mezclado para aprender a elegir. Lo que falles vuelve al final y otra vez en unos días.</p>

    <section class="section mode-grid">
      <button class="tile" data-m="hoy"><span class="tile-ic">${icon("spark")}</span><span class="t"><b>Sesión de hoy</b><span>Repaso + foco + llaves rotas, mezclado</span></span><span class="go">${icon("right")}</span></button>
      <button class="tile" data-m="repaso" ${due ? "" : "disabled"}><span class="tile-ic key">${icon("redo")}</span><span class="t"><b>Repaso pendiente</b><span>${due ? due + " ejercicios vencidos" : "Nada vencido"}</span></span><span class="go">${icon("right")}</span></button>
      ${S.words.length ? `<button class="tile" data-m="palabras"><span class="tile-ic ok">${icon("layers")}</span><span class="t"><b>Palabras nuevas</b><span>${wordsLeftToday() || "Más"} por hoy · ${wordsLearned()}/${S.words.length} aprendidas</span></span><span class="go">${icon("right")}</span></button>` : ""}
      <button class="tile" data-m="extensos"><span class="tile-ic ink">${icon("book")}</span><span class="t"><b>Ejercicios extensos</b><span>Textos, lecturas y redacción · nivel 3</span></span><span class="go">${icon("right")}</span></button>
      <button class="tile" data-m="errores" ${errs ? "" : "disabled"}><span class="tile-ic bad">${icon("target")}</span><span class="t"><b>Mis errores</b><span>${errs ? errs + " ejercicios que fallaste" : "Todavía sin errores guardados"}</span></span><span class="go">${icon("right")}</span></button>
    </section>

    <section class="section card pad-lg">
      <div class="section-head"><div><h2 class="h2">${icon("key", 20, "inline")} Gimnasio de llaves</h2><p class="small muted">Frases nuevas cada vez, con los cuatro tiempos. Elige qué entrenar.</p></div></div>
      <div class="grid" style="gap:14px">
        <div><p class="small muted" style="margin:0 0 6px">Tiempos</p><div class="seg" data-tenses>${Object.entries(TENSES).map(([k, v]) => `<button data-k="${k}" aria-pressed="${gymState.tenses.includes(k)}">${esc(v.nombre)}</button>`).join("")}</div></div>
        <div><p class="small muted" style="margin:0 0 6px">Formas</p><div class="seg" data-forms>${Object.entries(FORMS).map(([k, v]) => `<button data-k="${k}" aria-pressed="${gymState.forms.includes(k)}">${esc(v)}</button>`).join("")}</div></div>
        <div><button class="btn lg dark" data-gym>${icon("play", 18)} Entrenar</button></div>
      </div>
    </section>

    <section class="section">
      <div class="section-head"><div><h2 class="h2">Por tema</h2><p class="small muted">Práctica concentrada en uno solo.</p></div></div>
      <div data-temas></div>
    </section>
  </div>`);

  const go = s => play(s, { onExit: route });
  const MODES = { hoy: sessionHoy, repaso: sessionRepaso, errores: sessionErrores, palabras: () => sessionPalabras(), extensos: () => sessionExtensos() };
  $$("[data-m]", el).forEach(b => b.onclick = () => go(MODES[b.dataset.m]()));

  const toggle = (box, key) => $$("button", box).forEach(b => b.onclick = () => {
    const arr = gymState[key]; const k = b.dataset.k;
    const on = arr.includes(k);
    if (on && arr.length === 1) return;
    gymState[key] = on ? arr.filter(x => x !== k) : [...arr, k];
    b.setAttribute("aria-pressed", String(!on));
  });
  toggle($("[data-tenses]", el), "tenses");
  toggle($("[data-forms]", el), "forms");
  $("[data-gym]", el).onclick = () => go(sessionGym({ tenses: gymState.tenses, forms: gymState.forms }));

  const box = $("[data-temas]", el);
  for (const g of S.groups) {
    const ts = S.temas.filter(t => (t.grupo || "Otros") === g && temaIds(t.id).length);
    if (!ts.length) continue;
    box.append(h(`<p class="eyebrow" style="margin-top:22px">${esc(g)}</p>`));
    const grid = h(`<div class="grid-3"></div>`);
    ts.forEach(t => {
      const b = h(`<button class="tile">${ring(temaMastery(t.id), 44, 4)}<span class="t"><b>${esc(t.titulo)}</b><span>${temaIds(t.id).length} ejercicios${t.palabras ? ` · ${t.palabras.length} palabras` : ""}${t.llave ? " · " + esc(t.llave) : ""}</span></span></button>`);
      b.onclick = () => go(sessionTema(t.id));
      grid.append(b);
    });
    box.append(grid);
  }
  return el;
}
