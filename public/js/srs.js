// Repetición espaciada tipo Leitner. Caja 0 = nuevo/fallado; caja 6 = dominado.
// Intervalos cortos al principio (2–4 días) y largos después (Cepeda 2008; Suzuki 2017).
export const INTERVALS = [0, 1, 2, 4, 8, 16, 32];
export const MAX_BOX = INTERVALS.length - 1;

export const today = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
export const addDays = (iso, n) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return today(d);
};
export const daysBetween = (a, b) =>
  Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);

export function review(rec, correct, now = today()) {
  const r = rec ? { ...rec } : { box: 0, seen: 0, ok: 0, fail: 0 };
  r.seen++;
  if (correct) {
    r.ok++;
    r.box = Math.min(MAX_BOX, (r.box || 0) + 1);
  } else {
    r.fail++;
    r.box = Math.max(0, Math.min(1, (r.box || 0) - 2));
  }
  r.due = addDays(now, correct ? INTERVALS[r.box] : 1);
  r.last = now;
  return r;
}

export const isDue = (rec, now = today()) => rec && rec.due && rec.due <= now;

// Dominio de un conjunto de ejercicios: 0–100.
export function mastery(ids, items) {
  if (!ids.length) return 0;
  let s = 0;
  for (const id of ids) s += Math.min(items[id]?.box || 0, 5) / 5;
  return Math.round((100 * s) / ids.length);
}
