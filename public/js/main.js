// Arranque, navegación y tema.
import { S, load, flushEvents } from "./store.js";
import { $, $$, h, icon } from "./ui.js";
import { viewHome } from "./views/home.js";
import { viewLibrary, viewTopic } from "./views/library.js";
import { viewPractice } from "./views/practice.js";
import { viewVoice } from "./views/voice.js";
import { viewProgress } from "./views/progress.js";

const NAV = [
  { r: "hoy", label: "Hoy", ic: "home" },
  { r: "teoria", label: "Teoría", ic: "book" },
  { r: "practicar", label: "Practicar", ic: "zap" },
  { r: "voz", label: "Voz", ic: "mic" },
  { r: "avance", label: "Avance", ic: "chart" },
];

export function applyTheme() {
  const t = S.prog?.settings?.theme || "auto";
  if (t === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
}

function shell() {
  const app = $("#app");
  app.innerHTML = "";
  app.append(h(`
    <div class="shell">
      <aside class="side" aria-label="Navegación">
        <div class="brand"><span class="brand-mark">${icon("key", 18)}</span><b>Llaves</b></div>
        ${NAV.map(n => `<a class="nav-a" href="#/${n.r}" data-r="${n.r}">${icon(n.ic)}<span>${n.label}</span></a>`).join("")}
        <div class="side-foot">
          <div class="streak-mini" id="side-streak"></div>
          <div class="small muted" id="side-sync"></div>
        </div>
      </aside>
      <main class="main" id="main"><div class="wrap" id="view"></div></main>
      <nav class="tabbar" aria-label="Navegación">
        ${NAV.map(n => `<a href="#/${n.r}" data-r="${n.r}">${icon(n.ic, 22)}<span>${n.label}</span></a>`).join("")}
      </nav>
    </div>`));
}

export function refreshChrome() {
  const st = S.prog.streak;
  const el = $("#side-streak");
  if (el) el.innerHTML = `${icon("flame", 18)}<span><b>${st.current}</b> ${st.current === 1 ? "día" : "días"} de racha</span>`;
  const sy = $("#side-sync");
  if (sy) sy.textContent = S.mode === "local" ? "Guardando en tu Mac" : "Versión web · tu avance se guarda en este navegador";
}

export function route() {
  const [, r = "hoy", arg] = (location.hash || "#/hoy").split("/");
  $$("[data-r]").forEach(a => { if (a.dataset.r !== r) a.removeAttribute("aria-current"); else a.setAttribute("aria-current", "page"); });
  const view = $("#view");
  view.innerHTML = "";
  const node =
    r === "teoria" && arg ? viewTopic(decodeURIComponent(arg)) :
    r === "teoria" ? viewLibrary() :
    r === "practicar" ? viewPractice() :
    r === "voz" ? viewVoice() :
    r === "avance" ? viewProgress() :
    viewHome();
  node.classList.add("view");
  view.append(node);
  refreshChrome();
  if (!arg || r !== "teoria") scrollTo({ top: 0 });
}

async function reloadContent() {
  // Claude actualiza plan.json y data/extra entre sesiones: se recogen al volver a la app.
  try {
    const prev = JSON.stringify(S.plan) + Object.keys(S.items).length;
    const { reingest, fetchContent } = await import("./store.js");
    const c = await fetchContent();
    reingest(c);
    if (JSON.stringify(S.plan) + Object.keys(S.items).length !== prev && !document.querySelector(".player")) route();
  } catch {}
}

(async function boot() {
  await load();
  applyTheme();
  shell();
  route();
  addEventListener("hashchange", route);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") reloadContent();
    else flushEvents();
  });
  if (S.errors?.length) console.warn("Archivos de contenido con errores:", S.errors);
})();
