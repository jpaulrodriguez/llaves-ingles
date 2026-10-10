import { S, dueIds, temaMastery, codeStats, CODES, weakCodes } from "../store.js";
import { h, esc, icon, ring, fmtDate, pieces } from "../ui.js";
import { today } from "../srs.js";
import { sessionHoy, sessionRepaso, focusTemas } from "../session.js";
import { play } from "../player.js";
import { route } from "../main.js";

export function viewHome() {
  const P = S.prog, d = P.days[today()] || { answers: 0, correct: 0 };
  const foco = focusTemas();
  const focoT = foco.map(f => S.byId[f.tema]).filter(Boolean);
  const lead = focoT[0];
  const due = dueIds().length;
  const size = P.settings.size;
  const s7 = codeStats(7);
  let ok7 = 0, all7 = 0; Object.values(s7).forEach(v => { ok7 += v.ok; all7 += v.ok + v.fail; });
  const acc7 = all7 ? Math.round(100 * ok7 / all7) : null;
  const goal = size;
  const weak = weakCodes(4);
  const s14 = codeStats(14);
  const hablar = S.plan?.consignas?.[0];
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  const el = h(`<div class="stagger">
    <section class="hero">
      <div class="hero-keys" aria-hidden="true"><span>do / does</span><span>was / were</span><span>will · can</span></div>
      <p class="eyebrow" style="color:rgba(255,255,255,.6)">${esc(fmtDate(today()))}</p>
      <h1 class="display">${hello}.<br>Hoy abrimos <em>${esc(lead ? lead.titulo.toLowerCase() : "tus llaves")}</em>.</h1>
      <p class="sub">${size} ejercicios · unos ${Math.round(size * 0.6)} minutos · repaso, foco de la semana y tus llaves rotas.</p>
      <div class="row wrap" style="margin-top:14px">${focoT.map(t => `<span class="chip">${esc(t.titulo)}</span>`).join("")}</div>
      <div class="row wrap" style="margin-top:20px">
        <button class="btn lg" data-start>${icon("play", 18)} Empezar sesión</button>
      </div>
      ${S.plan?.mensaje ? `<div class="coach">${icon("spark", 18)}<div><b style="color:#fff">Claude</b> · <span class="small" style="opacity:.7">${esc(S.plan.actualizado || "")}</span><br>${pieces(S.plan.mensaje)}</div></div>` : ""}
    </section>

    <section class="section grid-3">
      <div class="card stat"><b>${P.streak.current}</b><span>${icon("flame", 14, "inline")} días de racha · mejor ${P.streak.best}</span></div>
      <div class="card stat"><b>${d.answers}<span class="muted" style="font-size:18px">/${goal}</span></b><span>respuestas hoy</span><div class="bar" style="margin-top:8px"><i style="transform:scaleX(${Math.min(1, d.answers / goal)})"></i></div></div>
      <div class="card stat"><b>${acc7 === null ? "—" : acc7 + "%"}</b><span>precisión de los últimos 7 días</span></div>
    </section>

    <section class="section grid-2">
      <button class="tile" data-repaso ${due ? "" : "disabled"}>
        <span class="tile-ic key">${icon("redo")}</span>
        <span class="t"><b>Repaso pendiente</b><span>${due ? `${due} ejercicios a punto de olvidarse` : "Nada vencido hoy"}</span></span>
        <span class="go">${icon("right")}</span>
      </button>
      <a class="tile" href="#/practicar">
        <span class="tile-ic ink">${icon("key")}</span>
        <span class="t"><b>Gimnasio de llaves</b><span>Frases infinitas con los cuatro tiempos</span></span>
        <span class="go">${icon("right")}</span>
      </a>
      <a class="tile" href="#/voz">
        <span class="tile-ic bad">${icon("mic")}</span>
        <span class="t"><b>Graba y envía a Claude</b><span>${hablar ? esc(hablar.consigna) : "Habla 1–2 minutos con una consigna"}</span></span>
        <span class="go">${icon("right")}</span>
      </a>
      ${lead ? `<a class="tile" href="#/teoria/${lead.id}">
        <span class="tile-ic">${icon("book")}</span>
        <span class="t"><b>Repasa la teoría</b><span>${esc(lead.titulo)} · ${esc(lead.llave || "")}</span></span>
        <span class="go">${icon("right")}</span>
      </a>` : ""}
    </section>

    <section class="section grid-2">
      <div class="card pad-lg">
        <div class="section-head" style="margin-bottom:10px"><div><h2 class="h2">Tus llaves rotas</h2><p class="small muted">Error por código, últimos 14 días</p></div></div>
        ${weak.length ? `<div class="broken">${weak.map(c => {
          const v = s14[c]; const n = v ? v.ok + v.fail : 0; const r = n ? v.fail / n : 0;
          return `<div class="broken-row"><span class="chip code bad">${c}</span><div><div class="small" style="margin-bottom:4px">${esc(CODES[c] || c)}</div><div class="bar"><i style="transform:scaleX(${r})"></i></div></div><span class="small muted">${n ? Math.round(r * 100) + "%" : "foco"}</span></div>`;
        }).join("")}</div>` : `<p class="muted small">Cuando practiques, aquí verás qué llaves fallan más.</p>`}
      </div>
      <div class="card pad-lg">
        <div class="section-head" style="margin-bottom:10px"><div><h2 class="h2">Foco de la semana</h2><p class="small muted">Dominio de cada tema</p></div></div>
        <div class="grid" style="gap:12px">${focoT.length ? focoT.map(t => `
          <a class="row" href="#/teoria/${t.id}" style="text-decoration:none">${ring(temaMastery(t.id), 42, 4)}<div><b class="h3">${esc(t.titulo)}</b><div class="small muted">${esc(t.llave || "")}</div></div><span class="spacer"></span>${icon("right", 18, "muted")}</a>`).join("") : `<p class="muted small">Aún no hay foco: practica un tema y aparecerá aquí.</p>`}
        </div>
      </div>
    </section>
  </div>`);

  el.querySelector("[data-start]").onclick = () => play(sessionHoy(), { onExit: route });
  el.querySelector("[data-repaso]").onclick = () => play(sessionRepaso(), { onExit: route });
  return el;
}
