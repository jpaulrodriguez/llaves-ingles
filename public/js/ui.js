// Utilidades de interfaz: DOM, íconos, piezas coloreadas, voz, sonidos y celebraciones.
import { S } from "./store.js";

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function h(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

const P = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  book: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><path d="M12 18v4"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8"/><path d="m16 7 3 3"/><path d="m18.5 4.5 2 2"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  vol: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  send: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  redo: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
  bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/>',
  turtle: '<path d="M12 6a6 6 0 0 0-6 6v2h12v-2a6 6 0 0 0-6-6z"/><path d="M4 14h16M7 14v3M17 14v3M18 12h2.5a1.5 1.5 0 0 0 0-3H19"/>',
};
export const icon = (name, size = 20, cls = "") =>
  `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ""}</svg>`;

// [[llave]] {{verbo}} ((marca)) → piezas coloreadas
export function pieces(text) {
  let s = esc(text);
  s = s.replace(/\[\[(.+?)\]\]/g, '<span class="pz pz-key">$1</span>')
       .replace(/\{\{(.+?)\}\}/g, (m, inner) => `<span class="pz pz-verb">${inner.replace(/\(\((.+?)\)\)/g, '<span class="pz-mark">$1</span>')}</span>`)
       .replace(/\(\((.+?)\)\)/g, '<span class="pz pz-mark-solo">$1</span>');
  return s;
}
export const plain = text => String(text ?? "").replace(/\[\[|\]\]|\{\{|\}\}|\(\(|\)\)/g, "");

// ---- voz (gratis, del navegador) ----
let voices = [];
function loadVoices() { voices = speechSynthesis?.getVoices?.().filter(v => /^en(-|_)/i.test(v.lang)) || []; }
if ("speechSynthesis" in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
export const englishVoices = () => voices;
export function speak(text, rate = 0.95) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(plain(text));
  const pref = S.prog?.settings?.voice;
  u.voice = voices.find(v => v.name === pref) || voices.find(v => /en-US/i.test(v.lang) && /Samantha|Ava|Allison|Google US/i.test(v.name)) || voices.find(v => /en-US/i.test(v.lang)) || voices[0] || null;
  u.lang = "en-US"; u.rate = rate;
  speechSynthesis.speak(u);
}

// ---- sonidos discretos (WebAudio, sin archivos) ----
let ctx;
function tone(freq, start, dur, type = "sine", gain = 0.06) {
  ctx ||= new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  const t0 = ctx.currentTime + start;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0); o.stop(t0 + dur + 0.05);
}
export const sfx = {
  ok() { if (!S.prog.settings.sound) return; tone(784, 0, .18); tone(1175, .08, .26); },
  bad() { if (!S.prog.settings.sound) return; tone(220, 0, .22, "triangle", .05); tone(185, .09, .26, "triangle", .04); },
  done() { if (!S.prog.settings.sound) return; [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .09, .3)); },
  tap() { if (!S.prog.settings.sound) return; tone(1400, 0, .04, "sine", .02); },
};

// ---- toast ----
export function toast(msg, kind = "") {
  let host = $("#toasts");
  if (!host) { host = h('<div id="toasts" aria-live="polite"></div>'); document.body.append(host); }
  const el = h(`<div class="toast ${kind}">${esc(msg)}</div>`);
  host.append(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 220); }, 2600);
}

// ---- anillo de progreso ----
export function ring(pct, size = 44, stroke = 4, label = true) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return `<span class="ring" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="ring-bg"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    </svg>${label ? `<b>${Math.round(pct)}</b>` : ""}</span>`;
}

// ---- confeti (solo al terminar sesión; respeta reduced-motion) ----
export function confetti() {
  if (reduced()) return;
  const cv = h('<canvas class="confetti" aria-hidden="true"></canvas>');
  document.body.append(cv);
  const dpr = devicePixelRatio || 1, W = innerWidth, H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext("2d"); g.scale(dpr, dpr);
  const css = getComputedStyle(document.documentElement);
  const cols = ["--primary", "--ok", "--key-ink", "--mark-ink"].map(v => css.getPropertyValue(v).trim() || "#6366f1");
  const N = 90, parts = Array.from({ length: N }, () => ({
    x: W / 2 + (Math.random() - .5) * 120, y: H * .35, vx: (Math.random() - .5) * 9, vy: -Math.random() * 9 - 4,
    r: Math.random() * Math.PI, vr: (Math.random() - .5) * .3, w: 6 + Math.random() * 6, h: 3 + Math.random() * 4, c: cols[Math.floor(Math.random() * cols.length)],
  }));
  const t0 = performance.now();
  (function frame(t) {
    const k = (t - t0) / 1400;
    g.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += .28; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      g.save(); g.globalAlpha = Math.max(0, 1 - k); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore();
    }
    if (k < 1) requestAnimationFrame(frame); else cv.remove();
  })(t0);
}

export const fmtDate = iso => new Date(iso + (iso.length === 10 ? "T12:00:00" : "")).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
