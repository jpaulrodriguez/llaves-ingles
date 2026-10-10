// Revisión de respuestas escritas: normaliza mayúsculas, puntuación y contracciones
// para que «doesn't» = «does not», pero nunca perdona la gramática (go ≠ goes).

const NEG = {
  "won't": "will not", "can't": "can not", "cannot": "can not", "shan't": "shall not",
  "ain't": "is not",
};
const FIXED = { "let's": "let's" };

function baseNormalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”«»"]/g, "")
    .replace(/[.,!?;:¡¿()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Devuelve todas las lecturas posibles (por la ambigüedad de 's y 'd).
export function variants(s) {
  const words = baseNormalize(s).split(" ").filter(Boolean);
  let outs = [[]];
  for (const w of words) {
    let opts;
    if (FIXED[w]) opts = [w];
    else if (NEG[w]) opts = [NEG[w]];
    else if (/^[a-z]+n't$/.test(w)) opts = [w.replace(/n't$/, "") + " not"];
    else if (w === "i'm") opts = ["i am"];
    else if (/^[a-z]+'re$/.test(w)) opts = [w.replace(/'re$/, " are")];
    else if (/^[a-z]+'ve$/.test(w)) opts = [w.replace(/'ve$/, " have")];
    else if (/^[a-z]+'ll$/.test(w)) opts = [w.replace(/'ll$/, " will")];
    else if (/^[a-z]+'d$/.test(w)) opts = [w.replace(/'d$/, " would"), w.replace(/'d$/, " had"), w];
    else if (/^[a-z]+'s$/.test(w)) opts = [w.replace(/'s$/, " is"), w.replace(/'s$/, " has"), w];
    else opts = [w];
    const next = [];
    for (const o of outs) for (const v of opts) { if (next.length < 64) next.push([...o, v]); }
    outs = next;
  }
  return new Set(outs.map(a => a.join(" ").replace(/\s+/g, " ").trim()));
}

export function matches(answer, accepted) {
  const va = variants(answer);
  for (const acc of accepted || []) {
    for (const v of variants(acc)) if (va.has(v)) return true;
  }
  return false;
}

// Diferencias palabra por palabra entre lo escrito y la respuesta correcta (LCS).
export function wordDiff(answer, correct) {
  const a = String(answer || "").trim().split(/\s+/).filter(Boolean);
  const b = String(correct || "").trim().split(/\s+/).filter(Boolean);
  const k = w => baseNormalize(w);
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = k(a[i]) === k(b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (j < m) {
    if (i < n && k(a[i]) === k(b[j])) { out.push({ w: b[j], same: true }); i++; j++; }
    else if (i < n && dp[i + 1][j] >= dp[i][j + 1]) { i++; }
    else { out.push({ w: b[j], same: false }); j++; }
  }
  return out;
}

export function tokens(sentence) {
  return String(sentence || "").trim().split(/\s+/).filter(Boolean);
}
