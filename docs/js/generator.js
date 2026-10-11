// Gimnasio de llaves: genera ejercicios infinitos y correctos por construcción
// para los cuatro tiempos (presente/pasado × simple/continuo).

const V = [
  // b, 3s, pasado, -ing, complementos
  ["work", "works", "worked", "working", ["from home", "at the office", "with the creative team", "on the new campaign"]],
  ["go", "goes", "went", "going", ["to the gym", "to the office by bus", "to the supermarket"]],
  ["have", "has", "had", "having", ["lunch with the team", "a meeting with the client", "breakfast at home"]],
  ["send", "sends", "sent", "sending", ["the report to the client", "emails to the team"]],
  ["write", "writes", "wrote", "writing", ["the brief", "emails in English", "a proposal"]],
  ["call", "calls", "called", "calling", ["the client", "my mom", "the account manager"]],
  ["drive", "drives", "drove", "driving", ["to work", "to the airport"]],
  ["take", "takes", "took", "taking", ["the bus", "notes in the meeting", "a taxi"]],
  ["make", "makes", "made", "making", ["coffee for the team", "dinner", "a presentation"]],
  ["cook", "cooks", "cooked", "cooking", ["dinner", "breakfast for the family"]],
  ["study", "studies", "studied", "studying", ["English", "the client's data"]],
  ["watch", "watches", "watched", "watching", ["a series", "the news", "a football match"]],
  ["play", "plays", "played", "playing", ["football", "video games", "tennis"]],
  ["meet", "meets", "met", "meeting", ["the client", "friends for dinner", "the creative team"]],
  ["prepare", "prepares", "prepared", "preparing", ["the presentation", "the budget", "dinner"]],
  ["check", "checks", "checked", "checking", ["emails", "the campaign results"]],
  ["finish", "finishes", "finished", "finishing", ["the report", "the project"]],
  ["visit", "visits", "visited", "visiting", ["the client", "my parents"]],
  ["buy", "buys", "bought", "buying", ["groceries", "coffee", "new shoes"]],
  ["eat", "eats", "ate", "eating", ["lunch at the office", "healthy food"]],
  ["drink", "drinks", "drank", "drinking", ["coffee", "a lot of water"]],
  ["speak", "speaks", "spoke", "speaking", ["English with the client", "to the team"]],
  ["leave", "leaves", "left", "leaving", ["the office", "home"]],
  ["run", "runs", "ran", "running", ["in the park", "five kilometers"]],
  ["review", "reviews", "reviewed", "reviewing", ["the campaign", "the proposal", "the numbers"]],
  ["teach", "teaches", "taught", "teaching", ["the new designers", "English"]],
  ["read", "reads", "read", "reading", ["the news", "a book"]],
  ["fly", "flies", "flew", "flying", ["to Medellín", "to Miami"]],
  ["listen", "listens", "listened", "listening", ["to podcasts", "to music"]],
  ["plan", "plans", "planned", "planning", ["the launch", "the team trip"]],
].map(([b, s, p, ing, c]) => ({ b, s, p, ing, c, irr: p !== b + "ed" && p !== b + "d" && !/ied$|pped$|nned$|tted$/.test(p) }));

// p: 1 = I · 3 = he/she/it · 2 = you/we/they
const SUBJ = [
  { t: "I", p: 1 }, { t: "You", p: 2 }, { t: "She", p: 3 }, { t: "He", p: 3 }, { t: "We", p: 2 },
  { t: "They", p: 2 }, { t: "My boss", p: 3 }, { t: "The client", p: 3 }, { t: "Laura", p: 3, name: 1 },
  { t: "Andrés", p: 3, name: 1 }, { t: "My colleagues", p: 2 }, { t: "Camila and I", p: 2, name: 1 },
];

const MARK = {
  ps: ["every day", "every week", "on Mondays", "twice a week", "every morning"],
  pc: ["right now", "at the moment", "this week", "today"],
  pas: ["yesterday", "last week", "two days ago", "last night", "on Monday"],
  pac: ["at 8 pm yesterday", "at 10 am yesterday", "all morning yesterday", "when the phone rang"],
};

export const TENSES = {
  ps: { nombre: "Presente simple", llave: "do / does" },
  pc: { nombre: "Presente continuo", llave: "am / is / are" },
  pas: { nombre: "Pasado simple", llave: "did" },
  pac: { nombre: "Pasado continuo", llave: "was / were" },
};
export const FORMS = { aff: "Afirmativa", neg: "Negativa", q: "Pregunta" };

const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const low = (subj) => (subj.p === 1 || subj.name) ? subj.t : subj.t.charAt(0).toLowerCase() + subj.t.slice(1);

const bePres = s => s.p === 1 ? "am" : s.p === 3 ? "is" : "are";
const bePast = s => (s.p === 1 || s.p === 3) ? "was" : "were";
const doAux = s => s.p === 3 ? "does" : "do";

// Construye las tres piezas: sujeto, verbo (con llave) y resto.
function build(t, f, s, v, comp, mark) {
  const S = s.t, sl = low(s);
  const tail = `${comp} ${mark}`;
  let aff, neg, q, auxQ, rest;
  if (t === "ps") {
    aff = `${S} ${s.p === 3 ? v.s : v.b} ${tail}.`;
    neg = `${S} ${doAux(s)}n't ${v.b} ${tail}.`;
    auxQ = cap(doAux(s)); q = `${auxQ} ${sl} ${v.b} ${tail}?`;
  } else if (t === "pc") {
    const be = bePres(s);
    aff = `${S} ${be} ${v.ing} ${tail}.`;
    neg = `${S} ${be} not ${v.ing} ${tail}.`.replace(/^I am not/, "I'm not").replace(/ (is|are) not /, " $1n't ");
    auxQ = cap(be); q = `${auxQ} ${sl} ${v.ing} ${tail}?`;
  } else if (t === "pas") {
    aff = `${S} ${v.p} ${tail}.`;
    neg = `${S} didn't ${v.b} ${tail}.`;
    auxQ = "Did"; q = `Did ${sl} ${v.b} ${tail}?`;
  } else {
    const be = bePast(s);
    aff = `${S} ${be} ${v.ing} ${tail}.`;
    neg = `${S} ${be}n't ${v.ing} ${tail}.`;
    auxQ = cap(be); q = `${auxQ} ${sl} ${v.ing} ${tail}?`;
  }
  return { aff, neg, q, auxQ, tail };
}

// La forma verbal sola (para huecos), con distractores de errores reales.
function verbPhrase(t, f, s, v) {
  if (t === "ps") {
    if (f === "aff") return s.p === 3 ? { ok: v.s, bad: [v.b, `is ${v.b}`], code: "3S" } : { ok: v.b, bad: [v.s, `${bePres(s)} ${v.b}`], code: "BE" };
    if (f === "neg") return s.p === 3 ? { ok: `doesn't ${v.b}`, bad: [`don't ${v.b}`, `doesn't ${v.s}`], code: "DM" } : { ok: `don't ${v.b}`, bad: [`doesn't ${v.b}`, `${bePres(s) === "am" ? "am not" : bePres(s) + "n't"} ${v.b}`], code: "LL" };
  }
  if (t === "pc") {
    const be = bePres(s);
    if (f === "aff") return { ok: `${be} ${v.ing}`, bad: [v.ing, `${be} ${v.b}`], code: "ING" };
    if (f === "neg") { const n = be === "am" ? "am not" : be + "n't"; return { ok: `${n} ${v.ing}`, bad: [`${doAux(s)}n't ${v.ing}`, `${n} ${v.b}`], code: "ING" }; }
  }
  if (t === "pas") {
    if (f === "aff") return { ok: v.p, bad: [v.b, v.irr ? v.b + "ed" : `did ${v.b}`].filter(x => x !== v.p), code: v.irr ? "IRR" : "TPO" };
    if (f === "neg") return { ok: `didn't ${v.b}`, bad: [`didn't ${v.p}`, `${bePast(s)}n't ${v.b}`].filter(x => x !== `didn't ${v.b}`), code: "DM" };
  }
  const be = bePast(s), wrong = be === "was" ? "were" : "was";
  if (f === "aff") return { ok: `${be} ${v.ing}`, bad: [`${wrong} ${v.ing}`, v.p], code: "WW" };
  return { ok: `${be}n't ${v.ing}`, bad: [`didn't ${v.ing}`, `${wrong}n't ${v.ing}`], code: "WW" };
}

const AUX_BAD = {
  ps: s => s.p === 3 ? ["Do", "Is"] : ["Does", s.p === 1 ? "Am" : "Are"],
  pc: s => [cap(doAux(s)), bePres(s) === "is" ? "Are" : "Is"],
  pas: s => ["Do", cap(bePast(s))],
  pac: s => ["Did", bePast(s) === "was" ? "Were" : "Was"],
};

const RULE = {
  ps: { aff: "Presente simple: he/she/it lleva -s; I/you/we/they, verbo base.", neg: "Negativa: don't/doesn't + verbo base. La -s se la lleva la llave.", q: "Pregunta: Do/Does + sujeto + verbo base." },
  pc: { aff: "Presente continuo: am/is/are + verbo-ing. Las dos piezas van juntas.", neg: "Negativa: am not / isn't / aren't + verbo-ing.", q: "Pregunta: Am/Is/Are + sujeto + verbo-ing." },
  pas: { aff: "Pasado simple: verbo en pasado (-ed o irregular), igual para todas las personas.", neg: "Negativa: didn't + verbo base. El pasado se marca una sola vez.", q: "Pregunta: Did + sujeto + verbo base." },
  pac: { aff: "Pasado continuo: was (I/he/she/it) o were (you/we/they) + verbo-ing.", neg: "Negativa: wasn't/weren't + verbo-ing.", q: "Pregunta: Was/Were + sujeto + verbo-ing." },
};

let seq = 0;
const gid = (t, f, k) => `gen:${t}:${f}:${k}:${Date.now().toString(36)}${(seq++).toString(36)}`;
const TEMA = { ps: "presente-simple", pc: "presente-continuo", pas: "pasado-simple", pac: "pasado-continuo" };

function blankSentence(t, f, s, v, comp, mark) {
  return `${s.t} ___ ${comp} ${mark}.`;
}

export function generate({ tenses = ["ps", "pc", "pas", "pac"], forms = ["aff", "neg", "q"], kinds } = {}) {
  const t = pick(tenses), f = pick(forms);
  const s = pick(SUBJ), v = pick(V), comp = pick(v.c), mark = pick(MARK[t]);
  const B = build(t, f, s, v, comp, mark);
  const target = B[f];
  const all = kinds || ["elegir", "escribir", "transformar", "ordenar", "identificar"];
  let kind = pick(all);
  if (kind === "transformar" && f === "aff") kind = "elegir";
  const base = { gen: true, tema: TEMA[t], nivel: f === "aff" ? 1 : 2, explica: RULE[t][f] };

  if (kind === "identificar") {
    const opts = shuffle(Object.keys(TENSES));
    return { ...base, id: gid(t, f, "id"), tipo: "identificar", code: "TPO", frase: target,
      opciones: opts.map(k => TENSES[k].nombre), a: opts.indexOf(t),
      explica: `La llave lo delata: ${TENSES[t].llave} → ${TENSES[t].nombre.toLowerCase()}. Marcador: «${mark}».` };
  }
  if (kind === "transformar") {
    return { ...base, id: gid(t, f, "tr"), tipo: "transformar", code: f === "q" ? "LL" : (t === "pas" || t === "ps" ? "DM" : "ING"),
      frase: B.aff, instruccion: f === "neg" ? "Pásala a negativa" : "Pásala a pregunta", respuestas: [target] };
  }
  if (kind === "ordenar") {
    const vp = verbPhrase(t, f === "q" ? "aff" : f, s, v);
    const extra = shuffle([...new Set(f === "q" ? AUX_BAD[t](s) : vp.bad.flatMap(x => x.split(" ")).filter(x => !target.split(" ").includes(x)))]).slice(0, 2);
    return { ...base, id: gid(t, f, "or"), tipo: "ordenar", code: f === "q" ? "LL" : vp.code,
      es: `${TENSES[t].nombre} · ${FORMS[f].toLowerCase()}`, en: target, extra };
  }
  if (f === "q") {
    const opts = shuffle([B.auxQ, ...AUX_BAD[t](s)]);
    const verbPart = t === "ps" || t === "pas" ? v.b : v.ing;
    return { ...base, id: gid(t, f, "q"), tipo: "elegir", code: "LL",
      q: `___ ${low(s)} ${verbPart} ${B.tail}?`, opciones: opts, a: opts.indexOf(B.auxQ) };
  }
  const vp = verbPhrase(t, f, s, v);
  if (kind === "escribir") {
    const hint = f === "neg" ? `${v.b} · negativa` : v.b;
    return { ...base, id: gid(t, f, "es"), tipo: "escribir", code: vp.code,
      q: `${blankSentence(t, f, s, v, comp, mark).replace(" ___", " ___ (" + hint + ")")}`, respuestas: [vp.ok] };
  }
  const opts = shuffle([vp.ok, ...vp.bad.slice(0, 2)]);
  return { ...base, id: gid(t, f, "el"), tipo: "elegir", code: vp.code,
    q: blankSentence(t, f, s, v, comp, mark), opciones: opts, a: opts.indexOf(vp.ok) };
}

// Contraste: elegir el tiempo por el marcador.
export function generateContrast(pair = ["ps", "pc"]) {
  const t = pick(pair), s = pick(SUBJ), v = pick(V), comp = pick(v.c), mark = pick(MARK[t]);
  const forms = pair.map(k => verbPhrase(k, "aff", s, v).ok);
  const ok = verbPhrase(t, "aff", s, v).ok;
  const extra = verbPhrase(t, "aff", s, v).bad[0];
  const opts = shuffle([...new Set([...forms, extra])]);
  return { gen: true, tema: pair.join("+") === "ps+pc" ? "contraste-presentes" : "contraste-pasados", nivel: 2,
    id: gid(t, "aff", "cx"), tipo: "elegir", code: "TPO",
    q: `${s.t} ___ ${comp} ${mark}.`, opciones: opts, a: opts.indexOf(ok),
    explica: `«${mark}» pide ${TENSES[t].nombre.toLowerCase()} (${TENSES[t].llave}).` };
}

// Qué temas tienen gimnasio y con qué configuración.
export const GYM = {
  "presente-simple": () => generate({ tenses: ["ps"] }),
  "presente-continuo": () => generate({ tenses: ["pc"] }),
  "pasado-simple": () => generate({ tenses: ["pas"] }),
  "pasado-continuo": () => generate({ tenses: ["pac"] }),
  "contraste-presentes": () => Math.random() < .6 ? generateContrast(["ps", "pc"]) : generate({ tenses: ["ps", "pc"], kinds: ["identificar", "elegir"] }),
  "contraste-pasados": () => Math.random() < .6 ? generateContrast(["pas", "pac"]) : generate({ tenses: ["pas", "pac"], kinds: ["identificar", "elegir"] }),
};

// Por código de error: qué generar para entrenarlo.
export const BY_CODE = {
  "3S": () => generate({ tenses: ["ps"], forms: ["aff"], kinds: ["elegir", "escribir"] }),
  LL: () => generate({ tenses: ["ps", "pas"], forms: ["q", "neg"] }),
  DM: () => generate({ tenses: ["ps", "pas"], forms: ["neg", "q"], kinds: ["elegir", "escribir", "transformar"] }),
  ING: () => generate({ tenses: ["pc", "pac"] }),
  WW: () => generate({ tenses: ["pac"] }),
  IRR: () => generate({ tenses: ["pas"], forms: ["aff"], kinds: ["elegir", "escribir"] }),
  TPO: () => Math.random() < .5 ? generateContrast(["ps", "pc"]) : generateContrast(["pas", "pac"]),
  BE: () => generate({ tenses: ["ps", "pc"], forms: ["aff"], kinds: ["elegir"] }),
};

// Los verbos que vas aprendiendo (vocabulario progresivo) también entran al gimnasio.
const known = new Set(V.map(v => v.b));
export function addVerbs(words) {
  for (const w of words) {
    if (known.has(w.en)) continue;
    const f = w.formas;
    V.push({ b: w.en, s: f.s, p: f.pasado, ing: f.ing, c: w.comp.slice(0, 3), irr: !!w.irregular });
    known.add(w.en);
  }
}
