import { S, temaMastery, temaSeen, temaIds, codeStats, CODES, save, localEvents, flushEvents, wordsLearned } from "../store.js";
import { h, esc, icon, $, $$, englishVoices, speak, toast } from "../ui.js";
import { today, addDays } from "../srs.js";
import { applyTheme } from "../main.js";

export function viewProgress() {
  const P = S.prog;
  const days = Object.values(P.days);
  const answers = days.reduce((a, d) => a + d.answers, 0);
  const minutes = Math.round(days.reduce((a, d) => a + (d.ms || 0), 0) / 60000);
  const c7 = codeStats(7), c14 = codeStats(14), cPrev = codeStats(14, 14);
  const sum = s => Object.values(s).reduce((a, v) => ({ ok: a.ok + v.ok, n: a.n + v.ok + v.fail }), { ok: 0, n: 0 });
  const a7 = sum(c7);
  const base = S.plan?.lineaBase;

  const el = h(`<div>
    <p class="eyebrow">Avance</p>
    <h1 class="display">Lo que ya <em>abres</em> sin pensar.</h1>
    <p class="sub">Tu racha, cuánto dominas cada tema y qué llaves se siguen rompiendo. Claude usa estos mismos datos para ajustar tus sesiones.</p>

    ${S.mode !== "local" ? `<section class="section card pad-lg row wrap" style="justify-content:space-between">
      <div><h2 class="h2">Envía tu avance a Claude</h2><p class="small muted">Copia un resumen de tus últimos 14 días (aciertos, errores escritos y llaves rotas) y pégalo en el chat para que ajuste tu plan.</p></div>
      <button class="btn" data-summary>${icon("send", 18)} Copiar resumen para Claude</button>
    </section>` : ""}

    <section class="section grid-3">
      <div class="card stat"><b>${P.streak.current}</b><span>${icon("flame", 14, "inline")} días de racha · mejor ${P.streak.best}</span></div>
      <div class="card stat"><b>${answers}</b><span>respuestas · ${minutes} min de práctica</span></div>
      <div class="card stat"><b>${a7.n ? Math.round(100 * a7.ok / a7.n) + "%" : "—"}</b><span>precisión últimos 7 días</span></div>
      <div class="card stat"><b>${P.xp}</b><span>XP acumulados</span></div>
      ${S.words.length ? `<div class="card stat"><b>${wordsLearned()}<span class="muted" style="font-size:18px">/${S.words.length}</span></b><span>palabras aprendidas</span><div class="bar" style="margin-top:8px"><i style="transform:scaleX(${wordsLearned() / S.words.length})"></i></div></div>` : ""}
    </section>

    <section class="section card pad-lg">
      <div class="section-head"><div><h2 class="h2">Constancia</h2><p class="small muted">Respuestas por día · últimas 18 semanas</p></div>
        <div class="legend"><span>menos</span>${[0, 1, 2, 3, 4].map(l => `<i data-l="${l}" style="width:12px;height:12px;border-radius:3px;background:${l ? "" : "var(--line)"}" class="lg-${l}"></i>`).join("")}<span>más</span></div></div>
      <div class="heat" data-heat></div>
    </section>

    <section class="section grid-2" style="align-items:start">
      <div class="card pad-lg">
        <div class="section-head"><div><h2 class="h2">Llaves rotas</h2><p class="small muted">% de error por código, últimos 14 días (vs. 14 anteriores)</p></div></div>
        <div data-codes></div>
      </div>
      <div class="card pad-lg">
        <div class="section-head"><div><h2 class="h2">Línea base</h2><p class="small muted">${base ? esc(base.fuente || "Diagnóstico") : "Diagnóstico inicial"}</p></div></div>
        ${base ? `<div>${(base.areas || []).map(a => `<div class="hbar"><span class="n">${esc(a.area)}</span><div class="bar"><i style="transform:scaleX(${a.pct / 100});background:var(--ink-2)"></i></div><span class="v">${a.pct}%</span></div>`).join("")}</div>` : `<p class="small muted">Sin línea base todavía.</p>`}
      </div>
    </section>

    <section class="section card pad-lg">
      <div class="section-head"><div><h2 class="h2">Dominio por tema</h2><p class="small muted">Sube cuando aciertas en días distintos; un acierto el mismo día no basta.</p></div></div>
      <div data-mastery></div>
    </section>

    <section class="section card pad-lg">
      <div class="section-head"><div><h2 class="h2">${icon("sliders", 20, "inline")} Ajustes</h2></div></div>
      <div class="grid-3">
        <div class="field"><label>Ejercicios por sesión</label><div class="seg" data-size>${[10, 20, 30].map(n => `<button data-v="${n}" aria-pressed="${P.settings.size === n}">${n}</button>`).join("")}</div></div>
        <div class="field"><label>Palabras nuevas por día</label><div class="seg" data-wpd>${[3, 5, 8, 12].map(n => `<button data-v="${n}" aria-pressed="${(P.settings.wordsPerDay ?? 5) === n}">${n}</button>`).join("")}</div></div>
        <div class="field"><label>Sonidos</label><div class="seg" data-sound><button data-v="1" aria-pressed="${!!P.settings.sound}">Sí</button><button data-v="0" aria-pressed="${!P.settings.sound}">No</button></div></div>
        <div class="field"><label>Apariencia</label><div class="seg" data-theme>${[["auto", "Auto"], ["light", "Claro"], ["dark", "Oscuro"]].map(([v, l]) => `<button data-v="${v}" aria-pressed="${P.settings.theme === v}">${l}</button>`).join("")}</div></div>
        <div class="field"><label for="voice">Voz en inglés</label><select class="input" id="voice"></select></div>
        <div class="field"><label>Copia de seguridad</label><button class="btn soft" data-export>Descargar mi progreso</button></div>
      </div>
    </section>
  </div>`);

  // heatmap
  const heat = $("[data-heat]", el);
  const tip = h(`<div class="tooltip" role="tooltip"></div>`); document.body.append(tip);
  const end = today(); const weeks = 18;
  const startD = new Date(addDays(end, -(weeks * 7 - 1)) + "T12:00:00");
  const offset = (startD.getDay() + 6) % 7; // lunes primero
  const first = addDays(end, -(weeks * 7 - 1) - offset);
  const max = Math.max(10, ...days.map(d => d.answers));
  for (let i = 0; i < weeks * 7 + offset; i++) {
    const d = addDays(first, i); if (d > end) break;
    const v = P.days[d]?.answers || 0;
    const l = v === 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4));
    const cell = h(`<i data-l="${l}" class="${d === end ? "today" : ""}"></i>`);
    cell.onmouseenter = e => {
      const dd = P.days[d];
      tip.innerHTML = `<b>${new Date(d + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</b> · ${dd ? `${dd.answers} respuestas · ${Math.round(100 * dd.correct / Math.max(1, dd.answers))}%` : "sin práctica"}`;
      const r = e.target.getBoundingClientRect();
      tip.style.left = Math.min(innerWidth - 220, r.left - 20) + "px"; tip.style.top = (r.top - 40) + "px"; tip.classList.add("on");
    };
    cell.onmouseleave = () => tip.classList.remove("on");
    heat.append(cell);
  }
  $$(".legend i", el).forEach(i => { const l = i.dataset.l; if (l !== "0") i.style.background = `color-mix(in oklab, var(--primary) ${[0, 25, 50, 75, 100][l]}%, var(--surface))`; });
  addEventListener("hashchange", () => tip.remove(), { once: true });

  // códigos
  const codesBox = $("[data-codes]", el);
  const rows = Object.entries(c14).filter(([, v]) => v.ok + v.fail >= 2)
    .map(([c, v]) => ({ c, r: v.fail / (v.ok + v.fail), n: v.ok + v.fail, prev: cPrev[c] ? cPrev[c].fail / (cPrev[c].ok + cPrev[c].fail) : null }))
    .sort((a, b) => b.r - a.r);
  codesBox.innerHTML = rows.length ? rows.map(x => {
    const delta = x.prev === null ? "" : Math.round((x.r - x.prev) * 100);
    const dTxt = delta === "" ? "" : delta < 0 ? `<span style="color:var(--ok)">↓ ${-delta}</span>` : delta > 0 ? `<span style="color:var(--bad)">↑ ${delta}</span>` : "=";
    return `<div class="hbar" title="${esc(CODES[x.c] || x.c)} · ${x.n} respuestas"><span class="n"><span class="chip code">${x.c}</span> <span class="small">${esc(CODES[x.c] || "")}</span></span><div class="bar"><i style="transform:scaleX(${x.r});background:var(--bad)"></i></div><span class="v">${Math.round(x.r * 100)}% ${dTxt}</span></div>`;
  }).join("") : `<p class="small muted">Aparecerán cuando tengas al menos dos respuestas por código.</p>`;

  // dominio
  const mBox = $("[data-mastery]", el);
  for (const g of S.groups) {
    const ts = S.temas.filter(t => (t.grupo || "Otros") === g && temaIds(t.id).length);
    if (!ts.length) continue;
    mBox.append(h(`<p class="eyebrow" style="margin-top:16px">${esc(g)}</p>`));
    ts.forEach(t => {
      const m = temaMastery(t.id);
      mBox.append(h(`<a class="hbar" href="#/teoria/${t.id}" style="text-decoration:none" title="${temaSeen(t.id)}/${temaIds(t.id).length} vistos"><span class="n">${esc(t.titulo)}</span><div class="bar"><i style="transform:scaleX(${m / 100})"></i></div><span class="v">${m}%</span></a>`));
    });
  }

  // ajustes
  const seg = (sel, fn) => $$(`${sel} button`, el).forEach(b => b.onclick = () => {
    $$(`${sel} button`, el).forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    fn(b.dataset.v); save();
  });
  seg("[data-size]", v => P.settings.size = Number(v));
  seg("[data-sound]", v => P.settings.sound = v === "1");
  seg("[data-wpd]", v => P.settings.wordsPerDay = Number(v));
  seg("[data-theme]", v => { P.settings.theme = v; applyTheme(); });
  const vs = $("#voice", el);
  const fillVoices = () => {
    const list = englishVoices();
    vs.innerHTML = `<option value="">Automática</option>` + list.map(v => `<option ${v.name === P.settings.voice ? "selected" : ""}>${esc(v.name)}</option>`).join("");
  };
  fillVoices(); setTimeout(fillVoices, 600);
  vs.onchange = () => { P.settings.voice = vs.value; save(); speak("Hi! This is how I sound."); };
  $("[data-export]", el).onclick = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(P, null, 2)], { type: "application/json" }));
    a.download = `llaves-progreso-${today()}.json`; a.click();
  };
  $("[data-summary]", el)?.addEventListener("click", async () => {
    await flushEvents();
    const t = summary();
    try { await navigator.clipboard.writeText(t); toast("Resumen copiado. Pégalo en el chat con Claude."); }
    catch { const ta = document.createElement("textarea"); ta.value = t; document.body.append(ta); ta.select(); document.execCommand("copy"); ta.remove(); toast("Resumen copiado."); }
  });
  return el;
}

function summary() {
  const since = addDays(today(), -13);
  const ev = localEvents().filter(e => (e.ts || "").slice(0, 10) >= since && !e.retry && !e.flag);
  const by = (k) => { const o = {}; ev.forEach(e => { const key = e[k] || "—"; (o[key] ||= [0, 0])[e.ok ? 0 : 1]++; }); return o; };
  const fmt = o => Object.entries(o).sort((a, b) => b[1][1] - a[1][1]).map(([k, [ok, f]]) => `- ${k}: ${ok}/${ok + f} (${Math.round(100 * ok / (ok + f))} %)`).join("\n");
  const wrong = ev.filter(e => !e.ok && e.r).slice(-40).map(e => `- [${e.code || "?"}] ${e.id}${e.q ? ` «${e.q}»` : ""} → escribió: ${e.r}`).join("\n");
  const flags = localEvents().filter(e => e.flag).slice(-20).map(e => `- ${e.id}: «${e.q || ""}» (respondió: ${e.r ?? "—"})`).join("\n");
  const P = S.prog;
  return [
    "AVANCE PARA CLAUDE · Llaves (versión web)",
    `Del ${since} al ${today()} · racha ${P.streak.current} días · ${ev.length} respuestas`,
    "", "## Por tema", fmt(by("tema")) || "- sin datos",
    "", "## Por código", fmt(by("code")) || "- sin datos",
    "", "## Errores escritos recientes", wrong || "- ninguno",
    flags ? "\n## Ejercicios reportados como malos\n" + flags : "",
    "", "Ajusta mi plan con el protocolo de Llaves (COACH.md).",
  ].join("\n");
}
