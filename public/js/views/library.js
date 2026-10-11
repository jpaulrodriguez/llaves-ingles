import { S, temaMastery, temaSeen, temaIds } from "../store.js";
import { h, esc, icon, ring, pieces, plain, speak, $, $$ } from "../ui.js";
import { sessionTema, sessionExtensos, LONG, levelTarget } from "../session.js";
import { play } from "../player.js";
import { route } from "../main.js";

const MAP = [
  { id: "presente-simple", ex: "I {{work((s))}}.", nm: "Presente simple", key: "do / does" },
  { id: "presente-continuo", ex: "I[['m]] {{work((ing))}}.", nm: "Presente continuo", key: "am / is / are" },
  { id: "pasado-simple", ex: "I {{work((ed))}}.", nm: "Pasado simple", key: "did" },
  { id: "pasado-continuo", ex: "I [[was]] {{work((ing))}}.", nm: "Pasado continuo", key: "was / were" },
];

function searchText(t) {
  const th = t.teoria || {};
  return [t.titulo, t.resumen, t.llave, th.paraQue, th.llave, ...(th.reglas || []), ...(th.senales || []),
    ...(th.frases || []).map(f => f.en + " " + f.es), ...(th.errores || []).map(e => e.mal + " " + e.bien)].map(plain).join(" ").toLowerCase();
}

export function viewLibrary() {
  const el = h(`<div>
    <p class="eyebrow">Teoría</p>
    <h1 class="display">Todas las reglas, <em>a mano</em>.</h1>
    <p class="sub">Entra a cualquier tema para repasar la llave, las fórmulas, las reglas, los usos y los errores típicos. Sin ejercicios, solo lo que necesitas tener fresco.</p>

    <section class="section card pad-lg">
      <div class="section-head"><div><h2 class="h2">Mapa de los tiempos</h2><p class="small muted">La fila dice cuándo; la columna, cómo se mira la acción.</p></div></div>
      <div class="tense-map">
        <span></span><span class="hd">Simple · hecho completo</span><span class="hd">Continuo · en progreso</span>
        <span class="rh">Presente</span>${cell(MAP[0])}${cell(MAP[1])}
        <span class="rh">Pasado</span>${cell(MAP[2])}${cell(MAP[3])}
      </div>
      <div class="legend" style="margin-top:14px">
        <span><i style="background:var(--key-bg)"></i>La llave (auxiliar o modal)</span>
        <span><i style="background:var(--verb-bg)"></i>El verbo</span>
        <span><i style="background:var(--mark-ink)"></i>La marca (-s, -ed, -ing)</span>
      </div>
    </section>

    <section class="section">
      <div class="search">${icon("search", 18)}<input class="input" type="search" placeholder="Busca un tema, una regla o una frase" aria-label="Buscar en la teoría" data-q></div>
      <div data-list></div>
    </section>
  </div>`);

  const list = $("[data-list]", el);
  const index = S.temas.filter(t => t.teoria).map(t => ({ t, txt: searchText(t) }));
  const draw = (q = "") => {
    const qq = q.trim().toLowerCase();
    const hits = index.filter(x => !qq || x.txt.includes(qq)).map(x => x.t);
    list.innerHTML = "";
    if (!hits.length) { list.append(h(`<p class="empty">Nada con «${esc(q)}». Prueba con una llave: <b>did</b>, <b>was</b>, <b>much</b>…</p>`)); return; }
    for (const g of S.groups) {
      const ts = hits.filter(t => (t.grupo || "Otros") === g);
      if (!ts.length) continue;
      list.append(h(`<h2 class="group-title">${esc(g)}</h2>`));
      const grid = h(`<div class="grid-3"></div>`);
      ts.forEach(t => grid.append(h(`<a class="topic-card" href="#/teoria/${t.id}">
        <div><b>${esc(t.titulo)}</b><div class="small muted" style="margin-top:2px">${esc(t.resumen || "")}</div></div>
        ${ring(temaMastery(t.id), 44, 4)}
        <div class="meta">${t.llave ? `<span class="chip key">${esc(t.llave)}</span>` : ""}<span class="small muted">${temaSeen(t.id)}/${temaIds(t.id).length} vistos</span></div>
      </a>`)));
      list.append(grid);
    }
  };
  draw();
  $("[data-q]", el).oninput = e => draw(e.target.value);
  return el;
}

function cell(m) {
  const exists = S.byId[m.id];
  return `<a class="tm-cell" href="${exists ? "#/teoria/" + m.id : "#/teoria"}"><span class="ex">${pieces(m.ex)}</span><span class="nm">${esc(m.nm)} · <b>${esc(m.key)}</b></span></a>`;
}

export function viewTopic(id) {
  const t = S.byId[id];
  if (!t) return h(`<div><a class="back" href="#/teoria">${icon("left", 18)} Teoría</a><p class="empty">Este tema todavía no existe.</p></div>`);
  const th = t.teoria || {};
  const n = temaIds(id).length;
  const secs = [];
  const add = (key, title, html) => { if (html) secs.push({ key, title, html }); };

  add("paraque", "Para qué sirve", th.paraQue ? `<p class="sub" style="font-size:18px">${pieces(th.paraQue)}</p>` : "");
  add("llave", "La llave", th.llave ? `<p class="sub">${pieces(th.llave)}</p>` : "");
  add("formulas", "Fórmulas", (th.formulas || []).length ? `<div class="grid-3">${th.formulas.map(f => {
    const k = /neg/i.test(f.tipo) ? "neg" : /preg|quest/i.test(f.tipo) ? "q" : "aff";
    return `<div class="card formula"><span class="lbl ${k}">${esc(f.tipo)}</span><code>${esc(f.formula)}</code>${f.ejemplo ? `<div class="ex">${pieces(f.ejemplo)}</div>` : ""}</div>`;
  }).join("")}</div>` : "");
  add("reglas", "Reglas que no se negocian", (th.reglas || []).length ? `<ol class="rules">${th.reglas.map(r => `<li><span>${pieces(r)}</span></li>`).join("")}</ol>` : "");
  add("senales", "Palabras señal", (th.senales || []).length ? `<div class="row wrap">${th.senales.map(s => `<span class="chip">${esc(s)}</span>`).join("")}</div>` : "");
  const usos = th.usos || [];
  add("usos", "Usos en la vida diaria y en el trabajo", usos.length ? `<div class="grid-2">${["diario", "trabajo"].map(ctx => {
    const us = usos.filter(u => (u.contexto || "diario") === ctx);
    if (!us.length) return "";
    return `<div class="grid" style="gap:10px"><p class="eyebrow">${ctx === "diario" ? "Vida diaria" : "Trabajo"}</p>${us.map(u => `<div class="usage"><span class="small muted">${esc(u.uso)}</span><span class="ex">${pieces(u.ejemplo)}</span></div>`).join("")}</div>`;
  }).join("")}${usos.filter(u => u.contexto && !["diario", "trabajo"].includes(u.contexto)).map(u => `<div class="usage"><span class="small muted">${esc(u.uso)}</span><span class="ex">${pieces(u.ejemplo)}</span></div>`).join("")}</div>` : "");
  add("contraste", "Contraste", (th.contraste || []).length ? `<div class="grid">${th.contraste.map(c => `<div class="card grid-2" style="align-items:center"><div class="ex" style="font-size:18px">${pieces(c.a)}</div><div class="ex" style="font-size:18px">${pieces(c.b)}</div>${c.nota ? `<div class="small muted" style="grid-column:1/-1">${pieces(c.nota)}</div>` : ""}</div>`).join("")}</div>` : "");
  add("errores", "Errores típicos", (th.errores || []).length ? `<div class="card">${th.errores.map(e => `<div class="err-row"><div class="row wrap"><span class="bad">${esc(e.mal)}</span>${icon("right", 16, "muted")}<span class="good">${esc(e.bien)}</span>${e.code ? `<span class="chip code">${esc(e.code)}</span>` : ""}</div><span class="small muted">${pieces(e.porque || "")}</span></div>`).join("")}</div>` : "");
  add("frases", "Frases útiles", (th.frases || []).length ? `<div class="card">${th.frases.map((f, i) => `<div class="phrase"><button class="icon-btn" data-say="${i}" aria-label="Escuchar">${icon("vol", 18)}</button><div><div class="en">${pieces(f.en)}</div><div class="es">${esc(f.es || "")}${f.ejemplo ? ` · <i>${esc(f.ejemplo)}</i>` : ""}</div></div>${f.contexto ? `<span class="chip">${esc(f.contexto)}</span>` : "<span></span>"}</div>`).join("")}</div>` : "");
  const words = S.words.filter(w => w.tema === id).sort((a, b) => a.orden - b.orden);
  const learned = words.filter(w => S.prog.words?.[w.wid]).length;
  add("palabras", `Palabras del capítulo · ${learned}/${words.length}`, words.length ? `<div class="card"><p class="small muted" style="margin:0 0 6px">Se presentan unas pocas cada día (en «Palabras nuevas» o al practicar este tema) y luego vuelven en tus repasos.</p>${words.map((w, i) => `
    <div class="phrase"><button class="icon-btn" data-sayw="${i}" aria-label="Escuchar">${icon("vol", 18)}</button>
      <div><div class="en"><b>${esc(w.en)}</b> <span class="muted small">${esc(w.ipa || "")}</span></div>
      <div class="es">${esc(w.es)}${w.formas ? ` · ${esc([w.formas.s, w.formas.pasado, w.formas.participio, w.formas.ing].filter(Boolean).join(" · "))}` : ""}${w.opuesto ? ` · ↔ ${esc(w.opuesto)}` : ""}</div></div>
      <span class="chip ${S.prog.words?.[w.wid] ? "ok" : ""}">${S.prog.words?.[w.wid] ? "aprendida" : "#" + w.orden}</span></div>`).join("")}</div>` : "");
  add("tip", "Truco", th.tip ? `<div class="tip">${icon("bulb", 20)}<div>${pieces(th.tip)}</div></div>` : "");

  const el = h(`<div>
    <div class="topic-head">
      <a class="back" href="#/teoria">${icon("left", 18)} Teoría</a>
      <p class="eyebrow" style="margin:0">${esc(t.grupo || "")}${t.nivel ? " · " + esc(t.nivel) : ""}</p>
      <h1 class="display" style="margin:0">${esc(t.titulo)}</h1>
      ${t.resumen ? `<p class="sub">${esc(t.resumen)}</p>` : ""}
      <div class="row wrap">${t.llave ? `<span class="big-key">${icon("key", 20)} ${esc(t.llave)}</span>` : ""}
        <span class="spacer"></span>${ring(temaMastery(id), 52, 5)}<span class="small muted">dominio<br>${temaSeen(id)}/${n} vistos</span></div>
      <div class="row wrap">
        <button class="btn lg" data-practice ${n ? "" : "disabled"}>${icon("zap", 18)} Practicar este tema</button>
        ${(t.ejercicios || []).some(e => LONG.has(e.tipo)) ? `<button class="btn ghost lg" data-long>${icon("book", 18)} Extensos</button>` : ""}
        <span class="small muted">Nivel ${levelTarget(id)} abierto · ${n} ejercicios${["presente-simple", "presente-continuo", "pasado-simple", "pasado-continuo", "contraste-presentes", "contraste-pasados"].includes(id) ? " + gimnasio infinito" : ""}</span>
      </div>
      <div class="legend"><span><i style="background:var(--key-bg)"></i>llave</span><span><i style="background:var(--verb-bg)"></i>verbo</span><span><i style="background:var(--mark-ink)"></i>marca</span></div>
    </div>
    ${secs.length > 2 ? `<nav class="toc" aria-label="Secciones">${secs.map(s => `<a href="#${s.key}" data-toc="${s.key}">${esc(s.title)}</a>`).join("")}</nav>` : ""}
    ${secs.map(s => `<section class="section th-sec" id="sec-${s.key}"><h2 class="h2" style="margin-bottom:12px">${esc(s.title)}</h2>${s.html}</section>`).join("")}
    <section class="section"><button class="btn lg block" data-practice2 ${n ? "" : "disabled"}>${icon("zap", 18)} Practicar ${esc(t.titulo.toLowerCase())}</button></section>
  </div>`);

  const go = () => play(sessionTema(id), { onExit: route });
  $("[data-practice]", el).onclick = go;
  $("[data-practice2]", el).onclick = go;
  $("[data-long]", el)?.addEventListener("click", () => play(sessionExtensos(id), { onExit: route }));
  $$("[data-sayw]", el).forEach(b => b.onclick = () => speak(words[Number(b.dataset.sayw)].en));
  $$("[data-toc]", el).forEach(a => a.onclick = e => { e.preventDefault(); document.getElementById("sec-" + a.dataset.toc)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); });
  $$("[data-say]", el).forEach(b => b.onclick = () => speak((th.frases[Number(b.dataset.say)].en || "").replace(/\s*\/[^/]+\/\s*/, " ")));
  return el;
}
