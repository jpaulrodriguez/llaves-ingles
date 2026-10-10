// Voz: grabas con una consigna, el navegador transcribe gratis y todo cae en data/bandeja,
// donde Claude lo lee y deja su evaluación en data/feedback (sin APIs de pago).
import { S } from "../store.js";
import { h, esc, icon, toast, $, $$, speak, fmtDate } from "../ui.js";

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

function consignas() {
  const out = [];
  for (const c of S.plan?.consignas || []) out.push({ ...c, origen: "Claude" });
  for (const t of S.temas) for (const e of t.ejercicios) if (e.tipo === "hablar") out.push({ id: e.id, consigna: e.consigna, objetivo: e.objetivo, ejemplo: e.ejemplo, tema: t.id, origen: t.titulo });
  return out;
}

export function viewVoice() {
  const all = consignas();
  let sel = all[0] || { id: "libre", consigna: "Habla libremente 1–2 minutos sobre tu semana: qué hiciste, qué estás haciendo y qué vas a hacer.", objetivo: "Pasado simple, presente continuo y will", origen: "Libre" };
  const temasCon = [...new Set(all.map(c => c.origen))];

  const el = h(`<div>
    <p class="eyebrow">Voz</p>
    <h1 class="display">Habla. <em>Claude</em> escucha.</h1>
    <p class="sub">${S.mode === "local"
      ? "Graba con una consigna. La grabación y su transcripción quedan en la bandeja de tu Mac; cuando quieras, dile a Claude en el chat <b>«revisa mi bandeja»</b> y te deja la corrección aquí mismo."
      : "Graba con una consigna. Al terminar, la transcripción se copia lista para pegarla en el chat con Claude, que te devuelve la corrección. Si quieres, descarga también el audio."}</p>

    <section class="section grid-2" style="align-items:start">
      <div class="card pad-lg">
        <div class="section-head" style="margin-bottom:8px"><h2 class="h2">Elige una consigna</h2></div>
        <div class="field" style="margin-bottom:12px"><label for="vfilter">Origen</label>
          <select class="input" id="vfilter"><option value="">Todas (${all.length})</option>${temasCon.map(t => `<option>${esc(t)}</option>`).join("")}</select></div>
        <div class="grid" style="gap:8px;max-height:420px;overflow:auto" data-list></div>
      </div>
      <div class="card pad-lg" data-rec></div>
    </section>

    <section class="section">
      <div class="section-head"><div><h2 class="h2">Tus grabaciones</h2><p class="small muted">Las revisadas traen la corrección de Claude.</p></div><button class="btn soft sm" data-refresh>${icon("redo", 16)} Actualizar</button></div>
      <div class="grid" data-history><p class="muted small">Cargando…</p></div>
    </section>
  </div>`);

  const list = $("[data-list]", el);
  const drawList = (f = "") => {
    list.innerHTML = "";
    all.filter(c => !f || c.origen === f).forEach(c => {
      const b = h(`<button class="tile" style="padding:12px" aria-pressed="${c.id === sel.id}"><span class="t"><span class="chip ${c.origen === "Claude" ? "primary" : ""}" style="width:fit-content">${esc(c.origen)}</span><b style="font-weight:500">${esc(c.consigna)}</b></span></button>`);
      if (c.id === sel.id) b.style.borderColor = "var(--primary)";
      b.onclick = () => { sel = c; drawList($("#vfilter", el).value); drawRec(); };
      list.append(b);
    });
  };
  $("#vfilter", el).onchange = e => drawList(e.target.value);

  // ---------- grabadora ----------
  const rec = $("[data-rec]", el);
  let media = null, recorder = null, chunks = [], recog = null, timer = null, raf = null, audioCtx = null;
  let finalText = "", startedAt = 0, blob = null, mime = "";

  function drawRec() {
    stopAll();
    blob = null; finalText = "";
    rec.innerHTML = `
      <div class="prompt-card">
        <p class="eyebrow" style="margin:0">Consigna</p>
        <h3 class="h2" style="font-weight:500">${esc(sel.consigna)}</h3>
        ${sel.objetivo ? `<div class="row wrap"><span class="chip key">${icon("key", 14)} ${esc(sel.objetivo)}</span></div>` : ""}
        ${sel.ejemplo ? `<details class="small"><summary class="muted" style="cursor:pointer">Ver un ejemplo</summary><p style="margin:8px 0 0">${esc(sel.ejemplo)} <button class="icon-btn" data-ex aria-label="Escuchar el ejemplo">${icon("vol", 16)}</button></p></details>` : ""}
      </div>
      <div class="rec-stage">
        <canvas class="wave" width="1040" height="128" aria-hidden="true"></canvas>
        <div class="timer" data-timer>0:00</div>
        <button class="rec-btn" data-go aria-label="Empezar a grabar">${icon("mic", 34)}</button>
        <div class="small muted" data-hint>${SR ? "Toca para grabar. Verás la transcripción en vivo." : "Toca para grabar. Este navegador no transcribe en vivo: Claude escuchará el audio."}</div>
        <div class="transcript" data-tr hidden></div>
        <div class="grid" style="width:100%;gap:10px" data-after hidden>
          <audio controls style="width:100%" data-audio></audio>
          <div class="field"><label for="vnote">Nota para Claude (opcional)</label><textarea class="input" id="vnote" placeholder="Ej.: no supe cómo decir «plazo»…"></textarea></div>
          <div class="row wrap"><button class="btn ghost" data-redo>${icon("redo", 16)} Repetir</button><span class="spacer"></span><button class="btn lg" data-send>${icon("send", 18)} ${S.mode === "local" ? "Enviar a la bandeja" : "Copiar para Claude"}</button></div>
        </div>
      </div>`;
    $("[data-ex]", rec)?.addEventListener("click", () => speak(sel.ejemplo));
    $("[data-go]", rec).onclick = () => (recorder?.state === "recording" ? stop() : start());
    $("[data-redo]", rec).onclick = () => drawRec();
    $("[data-send]", rec).onclick = send;
  }

  async function start() {
    try { media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch { toast("No pude usar el micrófono. Revisa el permiso del navegador.", "bad"); return; }
    mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg"].find(m => window.MediaRecorder?.isTypeSupported?.(m)) || "";
    recorder = new MediaRecorder(media, mime ? { mimeType: mime } : undefined);
    chunks = [];
    recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      blob = new Blob(chunks, { type: recorder.mimeType || mime || "audio/webm" });
      const a = $("[data-audio]", rec); a.src = URL.createObjectURL(blob);
      $("[data-after]", rec).hidden = false;
      $("[data-hint]", rec).textContent = "Escúchate antes de enviar. ¿Usaste la llave del objetivo?";
    };
    recorder.start(250);
    startedAt = Date.now();
    const go = $("[data-go]", rec); go.classList.add("on"); go.innerHTML = icon("stop", 30); go.setAttribute("aria-label", "Detener la grabación");
    $("[data-hint]", rec).textContent = "Grabando… toca para terminar (máximo 3 minutos).";
    timer = setInterval(() => {
      const s = Math.floor((Date.now() - startedAt) / 1000);
      $("[data-timer]", rec).textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
      if (s >= 180) stop();
    }, 250);
    wave();
    if (SR) {
      const tr = $("[data-tr]", rec); tr.hidden = false; tr.innerHTML = '<span class="interim">Escuchando…</span>';
      recog = new SR(); recog.lang = "en-US"; recog.continuous = true; recog.interimResults = true;
      recog.onresult = e => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i]; if (r.isFinal) finalText += r[0].transcript.trim() + " "; else interim += r[0].transcript;
        }
        tr.innerHTML = `${esc(finalText)}<span class="interim">${esc(interim)}</span>`;
      };
      recog.onend = () => { if (recorder?.state === "recording") { try { recog.start(); } catch {} } };
      try { recog.start(); } catch {}
    }
  }

  function wave() {
    const cv = $("canvas.wave", rec); if (!cv) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const an = audioCtx.createAnalyser(); an.fftSize = 512;
    audioCtx.createMediaStreamSource(media).connect(an);
    const data = new Uint8Array(an.fftSize), g = cv.getContext("2d");
    const col = getComputedStyle(document.documentElement).getPropertyValue("--bad").trim();
    const draw = () => {
      an.getByteTimeDomainData(data);
      g.clearRect(0, 0, cv.width, cv.height);
      const bars = 64, w = cv.width / bars;
      g.fillStyle = col;
      for (let i = 0; i < bars; i++) {
        let m = 0; for (let j = 0; j < 8; j++) m = Math.max(m, Math.abs(data[i * 8 + j] - 128));
        const bh = Math.max(4, (m / 128) * cv.height * 1.6);
        g.globalAlpha = .35 + .65 * Math.min(1, m / 50);
        g.beginPath(); g.roundRect?.(i * w + 3, (cv.height - bh) / 2, w - 6, bh, 4); g.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
  }

  function stop() {
    clearInterval(timer); cancelAnimationFrame(raf);
    try { recog?.stop(); } catch {}
    if (recorder?.state === "recording") recorder.stop();
    media?.getTracks().forEach(t => t.stop());
    audioCtx?.close().catch(() => {});
    const go = $("[data-go]", rec); if (go) { go.classList.remove("on"); go.innerHTML = icon("mic", 34); go.hidden = true; }
  }
  function stopAll() { if (recorder?.state === "recording") stop(); recorder = null; recog = null; }

  async function send() {
    if (!blob) return;
    const btn = $("[data-send]", rec); btn.disabled = true; btn.textContent = "Enviando…";
    const b64 = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(",")[1]); fr.readAsDataURL(blob); });
    const now = new Date();
    const id = "rec-" + now.toISOString().replace(/[-:T]/g, "").slice(0, 14) + "-" + Math.random().toString(36).slice(2, 6);
    if (S.mode !== "local") return sendWeb(id, now);
    const body = { id, fecha: now.toISOString(), consignaId: sel.id, consigna: sel.consigna, objetivo: sel.objetivo || "", ejemplo: sel.ejemplo || "",
      tema: sel.tema || null, transcripcion: finalText.trim(), transcriptor: SR ? "navegador (en-US)" : "ninguno",
      nota: $("#vnote", rec)?.value || "", duracionSeg: Math.round((Date.now() - startedAt) / 1000), mime: blob.type, audio: b64 };
    try {
      const r = await fetch("api/recordings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw 0;
      toast("En la bandeja. Dile a Claude: «revisa mi bandeja».");
      drawRec(); loadHistory();
    } catch { btn.disabled = false; btn.textContent = "Reintentar"; toast("No se pudo enviar. ¿Está corriendo el servidor?", "bad"); }
  }

  async function sendWeb(id, now) {
    const r = { id, fecha: now.toISOString(), consigna: sel.consigna, objetivo: sel.objetivo || "", transcripcion: finalText.trim(),
      transcriptor: SR ? "navegador en-US" : "ninguno", nota: $("#vnote", rec)?.value || "", duracionSeg: Math.round((Date.now() - startedAt) / 1000) };
    await copyText(chatBlock(r));
    const ext = /mp4/.test(blob.type) ? "m4a" : /ogg/.test(blob.type) ? "ogg" : "webm";
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${id}.${ext}`;
    let list = []; try { list = JSON.parse(localStorage.getItem(LS_REC) || "[]"); } catch {}
    try { localStorage.setItem(LS_REC, JSON.stringify([r, ...list].slice(0, 60))); } catch {}
    const btn = $("[data-send]", rec);
    btn.disabled = false; btn.innerHTML = `${icon("check", 18)} Copiado`;
    const dl = h(`<button class="btn ghost">Descargar el audio</button>`);
    dl.onclick = () => a.click();
    btn.parentElement.insertBefore(dl, btn);
    loadHistory();
  }

  // ---------- historial ----------
  const hist = $("[data-history]", el);
  async function loadHistory() {
    let recs = [];
    if (S.mode === "local") { try { recs = await (await fetch("api/recordings", { cache: "no-store" })).json(); } catch {} }
    else { try { recs = JSON.parse(localStorage.getItem(LS_REC) || "[]"); } catch {} }
    hist.innerHTML = "";
    if (!recs.length) { hist.append(h(`<div class="card empty">${icon("inbox", 28)}<p>Todavía no hay grabaciones. La primera es la más difícil.</p></div>`)); return; }
    recs.forEach(r => {
      const f = r.feedback;
      const card = h(`<details class="card"${f && recs.indexOf(r) === 0 ? " open" : ""}>
        <summary class="row wrap" style="cursor:pointer;list-style:none">
          <span class="chip ${f ? "ok" : "key"}">${f ? "Revisada" : S.mode === "local" ? "En la bandeja" : "Copiada"}</span>
          <b style="font-weight:600">${esc(r.consigna || "Grabación libre")}</b>
          <span class="spacer"></span><span class="small muted">${esc(fmtDate((r.fecha || r.recibido).slice(0, 10)))} · ${r.duracionSeg || "?"} s</span>
        </summary>
        <div class="grid" style="margin-top:14px;gap:12px">
          ${r.audioFile ? `<audio controls preload="none" src="api/audio/${encodeURIComponent(r.audioFile)}" style="width:100%"></audio>` : ""}
          ${r.transcripcion ? `<div class="transcript">${esc(r.transcripcion)}</div>` : ""}
          ${f ? feedbackHTML(f) : S.mode === "local" ? `<p class="small muted">Cuando Claude la revise, aquí verás qué dijiste bien, qué corregir y qué practicar después.</p>` : `<button class="btn soft sm" data-copy="${esc(r.id)}" style="width:fit-content">Copiar otra vez para Claude</button>`}
        </div>
      </details>`);
      hist.append(card);
      card.querySelector("[data-copy]")?.addEventListener("click", () => copyText(chatBlock(r)));
    });
  }
  $("[data-refresh]", el).onclick = loadHistory;

  drawList(); drawRec(); loadHistory();
  return el;
}

const LS_REC = "llaves-grabaciones-v1";

function chatBlock(r) {
  return [
    "GRABACIÓN PARA CLAUDE · Llaves",
    `Fecha: ${new Date(r.fecha).toLocaleString("es-CO")}`,
    `Consigna: ${r.consigna}`,
    r.objetivo ? `Objetivo: ${r.objetivo}` : "",
    `Duración: ${r.duracionSeg} s`,
    `Transcripción (${r.transcriptor}): ${r.transcripcion || "(sin transcripción: este navegador no transcribe en vivo)"}`,
    r.nota ? `Nota: ${r.nota}` : "",
    "",
    "Evalúala con el protocolo de Llaves: correcciones con código, lo que salió bien, cómo sonaría y qué practicar después.",
  ].filter(x => x !== "").join("\n");
}

async function copyText(t) {
  try { await navigator.clipboard.writeText(t); toast("Copiado. Pégalo en el chat con Claude."); }
  catch {
    const ta = document.createElement("textarea"); ta.value = t; document.body.append(ta); ta.select();
    try { document.execCommand("copy"); toast("Copiado. Pégalo en el chat con Claude."); } catch { toast("No se pudo copiar.", "bad"); }
    ta.remove();
  }
}

function feedbackHTML(f) {
  const pts = typeof f.puntaje === "number" ? `<span class="chip primary">${f.puntaje}/100</span>` : "";
  return `<div class="fb">
    <div class="row wrap">${pts}${(f.codigos || []).map(c => `<span class="chip code bad">${esc(c)}</span>`).join("")}</div>
    ${f.resumen ? `<p style="margin:0">${esc(f.resumen)}</p>` : ""}
    ${(f.correcciones || []).length ? `<p class="eyebrow" style="margin:6px 0 0">Correcciones</p>${f.correcciones.map(c => `<div class="fb-line"><span class="o">${esc(c.original)}</span><span class="c">${esc(c.correcta)}</span>${c.nota ? `<span class="small muted">${c.code ? `<b>${esc(c.code)}</b> · ` : ""}${esc(c.nota)}</span>` : ""}</div>`).join("")}` : ""}
    ${(f.bien || []).length ? `<p class="eyebrow" style="margin:6px 0 0">Lo que salió bien</p><ul style="margin:0;padding-left:18px">${f.bien.map(b => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
    ${(f.pronunciacion || []).length ? `<p class="eyebrow" style="margin:6px 0 0">Pronunciación</p><ul style="margin:0;padding-left:18px">${f.pronunciacion.map(b => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
    ${f.version ? `<p class="eyebrow" style="margin:6px 0 0">Así sonaría</p><div class="fb-line"><span>${esc(f.version)}</span></div>` : ""}
    ${f.siguiente ? `<div class="tip">${icon("bulb", 18)}<div>${esc(f.siguiente)}</div></div>` : ""}
  </div>`;
}
