// Reproductor de ejercicios: una pantalla enfocada, revisión inmediata con la regla,
// los errores vuelven al final de la sesión (recuperar otra vez lo que falló).
import { S, record, addTime, logEvent, CODES, flushEvents, save, introduceWord } from "./store.js";
import { $, $$, h, esc, icon, speak, sfx, confetti, toast, pieces } from "./ui.js";
import { matches, wordDiff, tokens } from "./check.js";

const KIND = {
  elegir: "Elige la opción correcta", escribir: "Escribe la respuesta", ordenar: "Ordena la frase",
  corregir: "¿Correcta o incorrecta?", transformar: "Transforma la frase", traducir: "Traduce al inglés",
  emparejar: "Une las parejas", escuchar: "Escucha y escribe", identificar: "¿Qué es? Mira la llave",
  presentar: "Palabra nueva", texto: "Completa el texto", lectura: "Lee y responde", componer: "Escribe tú",
};
const shuffle = a => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const fillBlank = (q, ans) => String(q || "").replace(/_{2,}\s*(\([^)]*\))?/, ans);
const blankHTML = q => esc(q).replace(/_{2,}\s*(\([^)]*\))?/, (m, hint) => `<span class="blank"></span>${hint ? ` <span class="muted">${esc(hint)}</span>` : ""}`);

export function play(session, { onExit } = {}) {
  const items = session.items.filter(Boolean);
  if (!items.length) { toast("No hay ejercicios para esta sesión todavía."); return; }

  const queue = items.map(it => ({ it, retry: false }));
  const total = items.length;
  let idx = 0, done = 0, combo = 0, bestCombo = 0, xp = 0;
  const firstTry = new Map();       // id -> correcto en el primer intento
  const t0 = performance.now();
  let current = null;               // { it, getAnswer, ready, lock, check }

  const root = h(`
    <div class="player" role="dialog" aria-modal="true" aria-label="${esc(session.titulo)}">
      <div class="player-top">
        <button class="icon-btn" data-x aria-label="Salir de la sesión">${icon("x", 22)}</button>
        <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="0"><i style="transform:scaleX(0)"></i></div>
        <span class="combo zero" data-combo>${icon("flame", 18)}<span>0</span></span>
      </div>
      <div class="stage"><div class="stage-in" data-stage></div></div>
      <div class="player-foot"><div class="in">
        <button class="btn ghost" data-skip>No lo sé</button>
        <span class="spacer"></span>
        <button class="btn lg" data-check disabled>Comprobar</button>
      </div></div>
      <div class="sheet" data-sheet aria-live="polite"></div>
    </div>`);
  document.body.append(root);
  document.body.style.overflow = "hidden";
  const stage = $("[data-stage]", root), sheet = $("[data-sheet]", root);
  const btnCheck = $("[data-check]", root), btnSkip = $("[data-skip]", root);

  const setReady = ok => { btnCheck.disabled = !ok; };
  const progress = () => {
    const p = Math.min(1, done / total);
    $(".player-top .bar > i", root).style.transform = `scaleX(${p})`;
    $(".player-top .bar", root).setAttribute("aria-valuenow", String(done));
    const c = $("[data-combo]", root);
    c.classList.toggle("zero", combo < 2);
    $("span", c).textContent = String(combo);
  };

  function next() {
    sheet.classList.remove("open", "ok", "bad");
    if (idx >= queue.length) return finish();
    const { it, retry } = queue[idx];
    current = render(it, retry);
    if (it.tipo === "presentar") {
      btnSkip.hidden = true; btnCheck.hidden = false; btnCheck.textContent = "Entendido";
      setReady(true); stage.parentElement.scrollTop = 0;
      setTimeout(() => speak(it.w.en), 300);
      return;
    }
    btnSkip.hidden = it.tipo === "emparejar";
    btnCheck.hidden = it.tipo === "emparejar";
    btnCheck.textContent = "Comprobar";
    setReady(false);
    stage.parentElement.scrollTop = 0;
    if (it.tipo === "escuchar") setTimeout(() => speak(it.texto), 250);
    const f = $("input, textarea", stage);
    if (f && matchMedia("(pointer: fine)").matches) f.focus();
  }

  // ---------- render por tipo ----------
  function render(it, retry) {
    stage.innerHTML = "";
    const head = h(`<div class="q-kind">${icon(it.tipo === "escuchar" ? "vol" : it.tipo === "identificar" ? "key" : "spark", 16)}<span>${KIND[it.tipo] || "Ejercicio"}</span>${retry ? '<span class="chip bad">Otra vez</span>' : ""}${it.gen ? '<span class="chip">Gimnasio</span>' : ""}${it.tipo !== "presentar" ? `<span class="chip" title="Nivel">${["", "Nivel 1", "Nivel 2", "Nivel 3 · extenso"][it.nivel || 2]}</span>` : ""}</div>`);
    stage.append(head);
    const st = { it, answer: null };

    if (it.tipo === "elegir" || it.tipo === "identificar") {
      const text = it.tipo === "identificar" ? it.frase : it.q;
      stage.append(h(`<p class="q-text">${blankHTML(text)}</p>`));
      if (it.tipo === "identificar") stage.append(speakRow(text));
      const opts = h(`<div class="opts" role="group"></div>`);
      it.opciones.forEach((o, i) => {
        const b = h(`<button class="opt" aria-pressed="false"><span class="k">${i + 1}</span><span>${esc(o)}</span></button>`);
        b.onclick = () => { $$(".opt", opts).forEach(x => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true"); st.answer = i; sfx.tap(); setReady(true); };
        opts.append(b);
      });
      stage.append(opts);
      st.check = () => ({ ok: st.answer === it.a, given: it.opciones[st.answer], correct: it.opciones[it.a],
        full: it.tipo === "elegir" ? fillBlank(it.q, it.opciones[it.a]) : it.frase });
      st.reveal = (ok) => $$(".opt", opts).forEach((b, i) => { b.disabled = true; if (i === it.a) b.classList.add("right"); else if (i === st.answer && !ok) b.classList.add("wrong"); });
      st.key = k => { const n = Number(k) - 1; const b = $$(".opt", opts)[n]; if (b) b.click(); };
    }

    else if (["escribir", "transformar", "traducir", "escuchar"].includes(it.tipo)) {
      if (it.tipo === "escribir") stage.append(h(`<p class="q-text">${blankHTML(it.q)}</p>`));
      if (it.tipo === "transformar") { stage.append(h(`<p class="q-text">${esc(it.frase)}</p>`)); stage.append(h(`<div class="chip primary" style="width:fit-content">${esc(it.instruccion)}</div>`)); }
      if (it.tipo === "traducir") stage.append(h(`<p class="q-text">${esc(it.es)}</p>`));
      if (it.tipo === "escuchar") {
        const row = h(`<div class="speak-row">
          <button class="speak-big" aria-label="Escuchar">${icon("vol", 28)}</button>
          <button class="speak-big slow" aria-label="Escuchar despacio">${icon("turtle", 26)}</button></div>`);
        row.children[0].onclick = () => speak(it.texto);
        row.children[1].onclick = () => speak(it.texto, 0.65);
        stage.append(row);
      }
      const ph = it.tipo === "escribir" ? "Escribe solo lo que falta" : "Escribe en inglés";
      const inp = h(`<input class="input" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="${ph}" aria-label="${ph}">`);
      inp.oninput = () => { st.answer = inp.value; setReady(inp.value.trim().length > 0); };
      stage.append(inp);
      const accepted = it.respuestas || [];
      st.check = () => {
        const ok = matches(inp.value, accepted);
        const correct = accepted[0] || "";
        const full = it.tipo === "escribir" ? fillBlank(it.q, correct) : correct;
        return { ok, given: inp.value, correct, full, diff: !ok ? wordDiff(inp.value, correct) : null };
      };
      st.reveal = () => { inp.disabled = true; };
      st.input = inp;
    }

    else if (it.tipo === "corregir") {
      stage.append(h(`<p class="q-text">${esc(it.frase)}</p>`));
      stage.append(speakRow(it.frase));
      const tf = h(`<div class="tf"><button class="opt" aria-pressed="false">${icon("check", 18)} Correcta</button><button class="opt" aria-pressed="false">${icon("x", 18)} Incorrecta</button></div>`);
      const inp = h(`<input class="input" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Escribe la frase corregida" aria-label="Frase corregida" hidden>`);
      const [bOk, bBad] = tf.children;
      const pickTF = (v) => {
        st.answer = v; bOk.setAttribute("aria-pressed", String(v === true)); bBad.setAttribute("aria-pressed", String(v === false));
        inp.hidden = v !== false; sfx.tap();
        if (v === false) { inp.focus(); setReady(inp.value.trim().length > 0); } else setReady(true);
      };
      bOk.onclick = () => pickTF(true); bBad.onclick = () => pickTF(false);
      inp.oninput = () => setReady(st.answer === false && inp.value.trim().length > 0);
      stage.append(tf, inp);
      st.check = () => {
        const judged = st.answer === it.correcta;
        const fixOk = it.correcta ? true : matches(inp.value, it.correccion || []);
        const ok = judged && fixOk;
        const correct = it.correcta ? it.frase : (it.correccion || [])[0];
        return { ok, given: st.answer === false ? inp.value : "Correcta", correct, full: correct,
          note: it.correcta ? "La frase estaba bien." : (judged && !fixOk ? "Viste el error, pero la corrección no quedó bien." : null),
          diff: !it.correcta && st.answer === false && !fixOk ? wordDiff(inp.value, correct) : null };
      };
      st.reveal = () => { bOk.disabled = bBad.disabled = inp.disabled = true; };
      st.key = k => { if (k === "1") bOk.click(); if (k === "2") bBad.click(); };
    }

    else if (it.tipo === "ordenar") {
      if (it.es) stage.append(h(`<p class="q-text">${esc(it.es)}</p>`));
      const target = tokens(it.en);
      const bank = shuffle([...target, ...(it.extra || [])].map((w, i) => ({ w, i })));
      const ans = h(`<div class="tiles-answer" aria-label="Tu frase"></div>`);
      const bk = h(`<div class="tiles-bank" aria-label="Fichas"></div>`);
      const chosen = [];
      const sync = () => { st.answer = chosen.map(c => c.w).join(" "); setReady(chosen.length > 0); };
      bank.forEach(t => {
        const b = h(`<button class="tile-w">${esc(t.w)}</button>`);
        b.onclick = () => {
          if (b.classList.contains("used")) return;
          b.classList.add("used"); sfx.tap();
          const a = h(`<button class="tile-w">${esc(t.w)}</button>`);
          a.onclick = () => { a.remove(); b.classList.remove("used"); chosen.splice(chosen.indexOf(rec), 1); sync(); };
          const rec = { w: t.w, a, b };
          chosen.push(rec); ans.append(a); sync();
        };
        bk.append(b);
      });
      stage.append(ans, bk);
      st.check = () => {
        const given = chosen.map(c => c.w).join(" ");
        const ok = matches(given, [it.en, ...(it.aceptadas || [])]);
        return { ok, given, correct: it.en, full: it.en, diff: ok ? null : wordDiff(given, it.en) };
      };
      st.reveal = () => { $$("button", ans).concat($$("button", bk)).forEach(b => b.disabled = true); };
      st.backspace = () => { const last = chosen.at(-1); if (last) last.a.click(); };
    }

    else if (it.tipo === "emparejar") {
      const pairs = it.pares || [];
      const L = shuffle(pairs.map((p, i) => ({ t: p[0], i }))), R = shuffle(pairs.map((p, i) => ({ t: p[1], i })));
      const grid = h(`<div class="match"></div>`);
      let selL = null, selR = null, matched = 0, misses = 0;
      const mk = (o, side) => {
        const b = h(`<button class="opt" aria-pressed="false">${esc(o.t)}</button>`);
        b.onclick = () => {
          if (side === "L") { selL?.b.setAttribute("aria-pressed", "false"); selL = { ...o, b }; }
          else { selR?.b.setAttribute("aria-pressed", "false"); selR = { ...o, b }; }
          b.setAttribute("aria-pressed", "true"); sfx.tap();
          if (o.side === "L" && side === "L") speak(o.t);
          if (selL && selR) {
            if (selL.i === selR.i) {
              [selL.b, selR.b].forEach(x => { x.classList.add("done"); x.setAttribute("aria-pressed", "false"); });
              matched++; selL = selR = null;
              if (matched === pairs.length) { st.answer = misses; setTimeout(() => doCheck(), 250); }
            } else {
              misses++; sfx.bad();
              const a = selL.b, c = selR.b;
              [a, c].forEach(x => { x.classList.remove("shake"); void x.offsetWidth; x.classList.add("shake"); x.setAttribute("aria-pressed", "false"); });
              selL = selR = null;
            }
          }
        };
        return b;
      };
      for (let k = 0; k < pairs.length; k++) { grid.append(mk({ ...L[k], side: "L" }, "L")); grid.append(mk({ ...R[k], side: "R" }, "R")); }
      stage.append(grid);
      st.check = () => ({ ok: misses === 0, given: `${misses} ${misses === 1 ? "error" : "errores"}`, correct: "", full: null,
        note: misses ? `Uniste todo, con ${misses} ${misses === 1 ? "intento fallido" : "intentos fallidos"}. Volverá más adelante.` : null });
      st.reveal = () => {};
    }
    else if (it.tipo === "presentar") {
      const w = it.w, f = w.formas;
      const row = (k, v) => v ? `<div class="wf"><span class="small muted">${k}</span><b>${esc(v)}</b></div>` : "";
      stage.append(h(`<div class="card pad-lg word-card">
        <div class="row wrap"><span class="chip primary">${esc(w.clase || "palabra")}</span>${w.irregular ? '<span class="chip key">irregular</span>' : ""}<span class="spacer"></span>
          <button class="icon-btn" data-say aria-label="Escuchar">${icon("vol")}</button></div>
        <div class="word-en">${esc(w.en)}</div>
        ${w.ipa ? `<div class="muted">${esc(w.ipa)}</div>` : ""}
        <div class="word-es">${esc(w.es)}</div>
        ${f ? `<div class="wforms">${row("base", w.en)}${row("he/she/it", f.s)}${row("pasado", f.pasado)}${row("participio", f.participio)}${row("-ing", f.ing)}</div>` : ""}
        ${w.opuesto || w.comparativo ? `<div class="row wrap">${w.opuesto ? `<span class="chip">opuesto: ${esc(w.opuesto)}</span>` : ""}${w.comparativo ? `<span class="chip">${esc(w.comparativo)} · ${esc(w.superlativo || "")}</span>` : ""}</div>` : ""}
        ${w.ejemplo ? `<div class="usage"><span class="small muted">Ejemplo</span><span class="ex">${esc(w.ejemplo)} <button class="icon-btn" data-ex aria-label="Escuchar el ejemplo" style="vertical-align:middle">${icon("vol", 16)}</button></span></div>` : ""}
        ${w.nota ? `<p class="small muted" style="margin:0">${esc(w.nota)}</p>` : ""}
      </div>`));
      $("[data-say]", stage).onclick = () => speak(w.en);
      $("[data-ex]", stage)?.addEventListener("click", () => speak(w.ejemplo));
      st.check = () => ({ ok: true }); st.reveal = () => {};
    }

    else if (it.tipo === "texto") {
      if (it.titulo) stage.append(h(`<h3 class="h2" style="margin:0">${esc(it.titulo)}</h3>`));
      if (it.instruccion) stage.append(h(`<p class="q-es" style="margin:0">${esc(it.instruccion)}</p>`));
      const huecos = it.huecos || [];
      const box = h(`<div class="card pad-lg long-text"></div>`);
      box.innerHTML = esc(it.texto).replace(/\{(\d+)\}/g, (m, n) => {
        const hz = huecos[Number(n) - 1]; if (!hz) return m;
        if (hz.opciones) return `<select class="gap" data-gap="${n}" aria-label="Hueco ${n}"><option value="">…</option>${hz.opciones.map((o, i) => `<option value="${i}">${esc(o)}</option>`).join("")}</select>`;
        return `<input class="gap" data-gap="${n}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Hueco ${n}">`;
      });
      stage.append(box);
      const gaps = $$(".gap", box);
      const sync = () => setReady(gaps.every(g => g.value.trim() !== ""));
      gaps.forEach(g => { g.oninput = sync; g.onchange = sync; });
      st.check = () => {
        let okN = 0; const given = [];
        gaps.forEach(g => {
          const hz = huecos[Number(g.dataset.gap) - 1];
          const ok = hz.opciones ? Number(g.value) === hz.a : matches(g.value, hz.respuestas || []);
          g.dataset.res = ok ? "ok" : "bad"; if (ok) okN++;
          given.push(hz.opciones ? hz.opciones[Number(g.value)] : g.value);
          if (!ok) g.insertAdjacentHTML("afterend", `<span class="gap-fix">${esc(hz.opciones ? hz.opciones[hz.a] : (hz.respuestas || [])[0])}</span>`);
        });
        return { ok: okN === gaps.length, given: given.join(" | "), correct: "", full: null, score: `${okN}/${gaps.length} huecos`,
          note: okN === gaps.length ? `Todos los huecos (${gaps.length}/${gaps.length}).` : `${okN} de ${gaps.length} huecos. En el texto verás la forma correcta al lado de cada error.` };
      };
      st.reveal = () => gaps.forEach(g => g.disabled = true);
    }

    else if (it.tipo === "lectura") {
      const box = h(`<div class="card pad-lg long-text">
        <div class="row" style="margin-bottom:8px">${it.titulo ? `<b>${esc(it.titulo)}</b>` : ""}<span class="spacer"></span>
          <button class="icon-btn" data-play aria-label="Escuchar el texto">${icon("vol")}</button><button class="icon-btn" data-slow aria-label="Escuchar despacio">${icon("turtle")}</button></div>
        <p style="margin:0">${esc(it.texto)}</p></div>`);
      $("[data-play]", box).onclick = () => speak(it.texto);
      $("[data-slow]", box).onclick = () => speak(it.texto, 0.7);
      stage.append(box);
      const answers = {};
      const qs = h(`<div class="grid" style="gap:16px"></div>`);
      (it.preguntas || []).forEach((p, qi) => {
        const block = h(`<div class="grid" style="gap:8px"><b style="font-weight:600">${qi + 1}. ${esc(p.q)}</b><div class="opts"></div></div>`);
        const opts = $(".opts", block);
        p.opciones.forEach((o, i) => {
          const b = h(`<button class="opt" aria-pressed="false" style="min-height:48px;font-size:16px"><span class="k">${"abcd"[i]}</span><span>${esc(o)}</span></button>`);
          b.onclick = () => { $$(".opt", opts).forEach(x => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true"); answers[qi] = i; sfx.tap(); setReady(Object.keys(answers).length === it.preguntas.length); };
          opts.append(b);
        });
        qs.append(block);
      });
      stage.append(qs);
      st.check = () => {
        let okN = 0;
        it.preguntas.forEach((p, qi) => { if (answers[qi] === p.a) okN++; });
        return { ok: okN === it.preguntas.length, given: it.preguntas.map((p, qi) => p.opciones[answers[qi]]).join(" | "), correct: "", full: null,
          note: `${okN} de ${it.preguntas.length} preguntas.` };
      };
      st.reveal = () => it.preguntas.forEach((p, qi) => $$(".opt", qs.children[qi]).forEach((b, i) => { b.disabled = true; if (i === p.a) b.classList.add("right"); else if (answers[qi] === i) b.classList.add("wrong"); }));
    }

    else if (it.tipo === "componer") {
      stage.append(h(`<p class="q-text" style="font-size:22px">${esc(it.consigna)}</p>`));
      const reqs = (it.requisitos || []).map(r => { let re = null; try { re = new RegExp(r.patron, "i"); } catch {} return { ...r, re }; });
      const list = h(`<div class="grid" style="gap:6px">${reqs.map((r, i) => `<div class="req" data-req="${i}">${icon("check", 16)}<span>${esc(r.texto)}</span></div>`).join("")}
        <div class="req" data-words>${icon("check", 16)}<span>Mínimo ${it.minPalabras || 20} palabras · <b data-count>0</b></span></div></div>`);
      const ta = h(`<textarea class="input" rows="6" placeholder="Escribe en inglés…" spellcheck="false" autocapitalize="sentences"></textarea>`);
      stage.append(list, ta);
      const words = () => ta.value.trim().split(/\s+/).filter(Boolean).length;
      const sync = () => {
        const v = ta.value.toLowerCase();
        reqs.forEach((r, i) => $(`[data-req="${i}"]`, list).classList.toggle("met", !!(r.re && r.re.test(v))));
        const n = words(); $("[data-count]", list).textContent = String(n);
        $("[data-words]", list).classList.toggle("met", n >= (it.minPalabras || 20));
        setReady(n >= Math.min(8, it.minPalabras || 8));
      };
      ta.oninput = sync;
      st.check = () => {
        const v = ta.value.toLowerCase();
        const met = reqs.filter(r => r.re && r.re.test(v)).length;
        const ok = met === reqs.length && words() >= (it.minPalabras || 20);
        return { ok, given: ta.value, correct: "", full: null,
          note: `${met}/${reqs.length} requisitos · ${words()} palabras. ${ok ? "" : "Revisa lo que falta en la lista."} Claude revisará la gramática en tu resumen.`,
          modelo: it.ejemplo };
      };
      st.reveal = () => { ta.disabled = true; };
      st.input = ta;
    }

    else {
      stage.append(h(`<p class="q-text">Tipo de ejercicio desconocido: ${esc(it.tipo)}</p>`));
      st.check = () => ({ ok: true }); st.reveal = () => {};
      setReady(true);
    }
    return st;
  }

  function speakRow(text) {
    const b = h(`<button class="btn soft sm" style="width:fit-content">${icon("vol", 16)} Escuchar</button>`);
    b.onclick = () => speak(text);
    return b;
  }

  // ---------- comprobar y retroalimentación ----------
  let checked = false;
  function doCheck(skipped = false) {
    if (checked || !current) return;
    if (queue[idx].it.tipo === "presentar") {
      introduceWord(queue[idx].it.word);
      done = Math.min(total, done + 1); progress(); sfx.tap();
      idx++; next(); return;
    }
    checked = true;
    const { it, retry } = queue[idx];
    const res = skipped ? { ...current.check(), ok: false, given: null } : current.check();
    current.reveal(res.ok);
    if (!retry) {
      firstTry.set(it.id, res.ok);
      xp += record(it, res.ok, skipped ? "(no lo sé)" : res.given);
    } else {
      logEvent({ tema: it.tema, id: it.id, tipo: it.tipo, code: it.code, ok: res.ok, r: res.given ?? null, retry: true });
      if (res.ok) xp += 3;
    }
    if (res.ok) { combo++; bestCombo = Math.max(bestCombo, combo); sfx.ok(); }
    else { combo = 0; sfx.bad(); if (!retry && !["emparejar", "texto", "lectura", "componer"].includes(it.tipo)) queue.push({ it, retry: true }); }
    if (!retry || res.ok) done = Math.min(total, done + (retry ? 0 : 1));
    progress();
    showSheet(it, res, skipped);
  }

  function showSheet(it, res, skipped) {
    const ok = res.ok;
    const code = it.code && CODES[it.code] ? `<span class="chip code ${ok ? "ok" : "bad"}">${esc(it.code)}</span><span class="small muted">${esc(CODES[it.code])}</span>` : "";
    let answer = "";
    if (!ok && res.correct) {
      const ansHTML = res.diff ? res.diff.map(d => d.same ? esc(d.w) : `<span class="df">${esc(d.w)}</span>`).join(" ") : esc(res.correct);
      answer = `<div class="answer"><span class="muted small">Respuesta correcta</span><br>${ansHTML}</div>`;
      if (res.full && res.full !== res.correct) answer += `<div class="small muted">${esc(res.full)}</div>`;
    } else if (ok && res.full && it.tipo !== "identificar") {
      answer = `<div class="answer">${esc(res.full)}</div>`;
    }
    const praise = ["¡Bien!", "¡Exacto!", "¡Eso es!", "¡Muy bien!", "¡Perfecto!"];
    sheet.className = `sheet ${ok ? "ok" : "bad"}`;
    sheet.innerHTML = `<div class="in">
      <div class="verdict"><span class="badge">${icon(ok ? "check" : "x", 20)}</span>${ok ? praise[Math.floor(Math.random() * praise.length)] : skipped ? "Así se dice" : "Casi"}</div>
      ${answer}
      ${res.note ? `<div class="why">${esc(res.note)}</div>` : ""}
      ${res.modelo ? `<div class="answer"><span class="muted small">Un modelo</span><br>${esc(res.modelo)}</div>` : ""}
      ${it.explica ? `<div class="why">${icon("key", 15, "inline")} ${pieces(it.explica)}</div>` : ""}
      <div class="actions">
        <div class="row wrap">${code}</div>
        <div class="row">
          ${res.full ? `<button class="icon-btn" data-say aria-label="Escuchar la frase">${icon("vol")}</button>` : ""}
          <button class="icon-btn" data-flag aria-label="Reportar un error en este ejercicio" title="¿Este ejercicio está mal? Repórtalo">${icon("alert", 18)}</button>
          <button class="btn lg ${ok ? "ok" : "bad"}" data-next>Continuar</button>
        </div>
      </div></div>`;
    void sheet.offsetHeight; sheet.classList.add("open");
    $("[data-next]", sheet).onclick = advance;
    $("[data-say]", sheet)?.addEventListener("click", () => speak(res.full));
    $("[data-flag]", sheet).onclick = (e) => {
      logEvent({ tema: it.tema, id: it.id, flag: true, r: res.given ?? null, q: it.q || it.frase || it.en || it.es || it.texto });
      e.currentTarget.disabled = true; toast("Reportado. Claude lo revisará.");
    };
    btnCheck.hidden = true; btnSkip.hidden = true;
    setTimeout(() => $("[data-next]", sheet)?.focus({ preventScroll: true }), 50);
  }

  function advance() {
    checked = false; idx++;
    btnCheck.hidden = false; btnSkip.hidden = false;
    next();
  }

  // ---------- final ----------
  function finish() {
    const ms = performance.now() - t0;
    addTime(ms);
    flushEvents(); save(true);
    const n = firstTry.size, okN = [...firstTry.values()].filter(Boolean).length;
    const acc = n ? Math.round((100 * okN) / n) : 0;
    const failed = [...firstTry.entries()].filter(([, v]) => !v).map(([id]) => queue.find(q => q.it.id === id)?.it).filter(Boolean);
    const byCode = {};
    failed.forEach(it => { if (it.code) byCode[it.code] = (byCode[it.code] || 0) + 1; });
    const min = Math.max(1, Math.round(ms / 60000));
    root.querySelector(".player-foot").remove();
    sheet.remove();
    stage.innerHTML = `
      <div class="done-screen">
        <div class="tile-ic ${acc >= 80 ? "ok" : "key"}" style="width:72px;height:72px;border-radius:22px">${icon(acc >= 80 ? "spark" : "key", 34)}</div>
        <div>
          <p class="eyebrow">${esc(session.titulo)}</p>
          <h2 class="display" style="font-size:44px">${acc >= 90 ? "Impecable." : acc >= 75 ? "Muy buena sesión." : acc >= 50 ? "Vas abriendo la llave." : "Hoy se aprendió mucho."}</h2>
          <p class="sub" style="margin:0 auto">${acc >= 75 ? "Lo que fallaste volverá en unos días, cuando esté a punto de olvidarse." : "Los errores son la parte útil: ya quedaron en tu repaso de mañana."}</p>
        </div>
        <div class="done-stats">
          <div class="card stat"><b>${acc}%</b><span>precisión</span></div>
          <div class="card stat"><b>+${xp}</b><span>XP</span></div>
          <div class="card stat"><b>${min}′</b><span>minutos</span></div>
        </div>
        ${Object.keys(byCode).length ? `<div class="card" style="width:100%;max-width:520px;text-align:left">
          <p class="eyebrow">Llaves para revisar</p>
          <div class="grid" style="gap:8px">${Object.entries(byCode).sort((a, b) => b[1] - a[1]).map(([c, k]) => `<div class="row"><span class="chip code bad">${c}</span><span class="small">${esc(CODES[c] || "")}</span><span class="spacer"></span><b class="small">${k}</b></div>`).join("")}</div>
        </div>` : ""}
        <div class="row wrap" style="justify-content:center">
          ${failed.length ? `<button class="btn ghost lg" data-again>${icon("redo", 18)} Repetir lo que fallé</button>` : ""}
          <button class="btn lg dark" data-close>Terminar</button>
        </div>
        ${bestCombo >= 5 ? `<p class="small muted">${icon("flame", 14, "inline")} Mejor racha de aciertos: ${bestCombo}</p>` : ""}
      </div>`;
    sfx.done();
    if (acc >= 80) confetti();
    $("[data-close]", stage).onclick = () => close();
    $("[data-again]", stage)?.addEventListener("click", () => { close(true); play({ titulo: "Repetir errores", modo: "errores", items: shuffle(failed) }, { onExit }); });
    $("[data-close]", stage).focus();
  }

  function close(silent) {
    document.removeEventListener("keydown", onKey);
    root.remove();
    document.body.style.overflow = "";
    if (!silent) onExit?.();
  }

  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const typing = e.target.matches?.("input, textarea");
    if (e.key === "Escape") { e.preventDefault(); askExit(); return; }
    if (e.key === "Enter") {
      if (e.target.matches?.("textarea") && !sheet.classList.contains("open")) return;
      e.preventDefault();
      if (sheet.classList.contains("open")) advance();
      else if (!btnCheck.disabled && !btnCheck.hidden) doCheck();
      return;
    }
    if (!typing && !checked && current) {
      if (/^[1-9]$/.test(e.key) && current.key) current.key(e.key);
      if (e.key === "Backspace" && current.backspace) { e.preventDefault(); current.backspace(); }
    }
  }
  function askExit() {
    if (!$("[data-check]", root)) return close();
    const d = h(`<dialog class="modal"><div class="modal-in">
      <h3 class="h2">¿Salir de la sesión?</h3>
      <p class="sub">Lo que ya respondiste quedó guardado en tu avance.</p>
      <div class="row" style="justify-content:flex-end"><button class="btn ghost" value="no">Seguir</button><button class="btn dark" value="si">Salir</button></div>
    </div></dialog>`);
    root.append(d); d.showModal();
    d.addEventListener("click", e => { const v = e.target.closest("button")?.value; if (v) { d.close(); d.remove(); if (v === "si") { addTime(performance.now() - t0); flushEvents(); save(true); close(); } } });
  }

  $("[data-x]", root).onclick = askExit;
  btnCheck.onclick = () => doCheck();
  btnSkip.onclick = () => doCheck(true);
  document.addEventListener("keydown", onKey);
  progress();
  next();
}
