# Esquema de contenido · Llaves

Cada tema es un archivo `data/temas/<id>.json`. La app los carga todos y los combina con `data/extra/*.json` (ejercicios que Claude agrega en cada sesión) y `data/plan.json` (el foco de la semana).

Idioma: la **teoría y las explicaciones van en español** (tuteo, claro y breve); **las frases y los ejercicios van en inglés**. El estudiante es un adulto colombiano, director en una agencia de publicidad en Bogotá, nivel A2.1 → B1. Contextos: vida diaria (familia, gimnasio, viajes, comida, fin de semana) y trabajo (clientes, campañas, reuniones, presentaciones, emails, equipo, deadlines).

## Marcado de piezas (para colorear las frases)

En cualquier texto en inglés de la teoría (ejemplos, fórmulas) se pueden marcar las piezas:

- `[[...]]` la **llave**: auxiliar o modal (*do, does, did, am, is, are, was, were, will, can, could, may, have, has, used to*)
- `{{...}}` el **verbo principal**
- `((...))` la **marca**: terminación o pieza que cambia (*-s, -ed, -ing, -er, the most, not*)

Ejemplo: `"She [[does]]n't {{work}} on Sundays."` · `"They [[were]] {{work((ing))}} late."` · `"My boss {{work((s))}} from home."`

En los ejercicios **no** se usa el marcado (salvo en `explica`, opcional).

## Estructura de un tema

```json
{
  "id": "presente-simple",
  "titulo": "Presente simple",
  "grupo": "Tiempos verbales",
  "orden": 10,
  "nivel": "A1–A2",
  "resumen": "Hábitos, rutinas, hechos y gustos.",
  "llave": "do / does",
  "teoria": {
    "paraQue": "Una o dos frases: para qué sirve.",
    "llave": "Explicación corta de la llave y qué hace (negativa, pregunta, respuesta corta).",
    "formulas": [
      { "tipo": "Afirmativa", "formula": "Sujeto + verbo (+s con he/she/it)", "ejemplo": "She {{work((s))}} in Bogotá." },
      { "tipo": "Negativa",   "formula": "Sujeto + don't / doesn't + verbo base", "ejemplo": "She [[does]]n't {{work}} on Sundays." },
      { "tipo": "Pregunta",   "formula": "Do / Does + sujeto + verbo base?", "ejemplo": "[[Does]] she {{work}} here?" }
    ],
    "reglas": ["Regla 1 en una frase.", "Regla 2..."],
    "senales": ["always", "every day", "on Mondays"],
    "usos": [
      { "uso": "Rutinas", "contexto": "diario", "ejemplo": "I {{go}} to the gym three times a week." },
      { "uso": "Lo que haces en tu trabajo", "contexto": "trabajo", "ejemplo": "I {{lead}} a team of six people." }
    ],
    "errores": [
      { "mal": "She work in an agency.", "bien": "She works in an agency.", "porque": "He/she/it → verbo + s.", "code": "3S" }
    ],
    "contraste": [
      { "a": "I {{work}} at VML.", "b": "I[['m]] {{work((ing))}} from home this week.", "nota": "General vs. temporal." }
    ],
    "frases": [
      { "en": "What do you do?", "es": "¿A qué te dedicas?", "contexto": "trabajo" }
    ],
    "tip": "Un truco memorable (opcional)."
  },
  "ejercicios": [ ... ]
}
```

`contraste`, `frases` y `tip` son opcionales. `usos`: al menos 2 diarios y 2 de trabajo. `errores`: 4–8. `frases`: 6–12 frases útiles hechas (chunks).

## Tipos de ejercicio

Todos llevan: `id` único (`<idTema>-001`…), `tipo`, `nivel` (1 fácil · 2 medio · 3 difícil), `code` (código de error que entrena, ver abajo) y `explica` (en español, una o dos frases: **la regla**, no solo la respuesta).

| tipo | Campos | Qué hace la app |
|---|---|---|
| `elegir` | `q` (frase con `___` o pregunta), `opciones` (3–4), `a` (índice de la correcta) | Botones; teclas 1–4 |
| `escribir` | `q` (frase con `___`; puede llevar el verbo base entre paréntesis: `"She ___ (work) here."`), `respuestas` (todas las aceptadas) | Campo de texto |
| `ordenar` | `es` (la frase en español), `en` (la frase correcta en inglés), `extra` (1–3 fichas distractoras) , `aceptadas` (opcional: otros órdenes válidos) | Fichas tipo Duolingo |
| `corregir` | `frase`, `correcta` (true/false), `correccion` (array de versiones aceptadas; vacío si es correcta) | Marcar correcta o incorrecta y escribir la corrección |
| `transformar` | `frase`, `instruccion` ("Pásala a negativa", "Pásala a pregunta", "Pásala a pasado"…), `respuestas` | Campo de texto |
| `traducir` | `es`, `respuestas` (varias formas válidas, con y sin contracción no hace falta: la app las normaliza) | Campo de texto |
| `emparejar` | `pares`: `[["talkative","conversador"], …]` (4–6 pares) | Unir columnas |
| `escuchar` | `texto` (la app lo lee en voz alta), `respuestas` (lo que debe escribir: normalmente `[texto]`) | Dictado |
| `identificar` | `frase`, `opciones` (nombres de tiempos o usos), `a` | Igual que elegir; entrena reconocer la llave |
| `hablar` | `consigna` (en español), `objetivo` (estructura que debe usar), `ejemplo` (respuesta modelo en inglés) | Graba audio para que Claude lo evalúe |

### Reglas de calidad (obligatorias)

1. **Una sola respuesta correcta** en `elegir` / `identificar`. Nada de opciones que sean correctas en otro registro.
2. En `escribir`, `transformar`, `traducir` y `escuchar`, poner en `respuestas` **todas** las variantes razonables (orden de adverbios, *someone/somebody*, *a lot of/lots of*). No hace falta duplicar contracciones: la app trata *doesn't = does not*, *I'm = I am*, *I'll = I will*, etc. Tampoco importan mayúsculas ni el punto final.
3. En `ordenar`, `en` se divide por espacios en fichas: escribe la puntuación pegada a la palabra (`"Does she work here?"`). Las `extra` deben ser trampas del error que se entrena (*works* si la respuesta es *work*).
4. Los distractores salen de **errores reales de hispanohablantes**, no de basura evidente.
5. Mezclar contextos: ~50 % vida diaria, ~50 % trabajo (clientes, campañas, reuniones, equipo, deadlines, emails).
6. Inglés estadounidense natural. Nombres colombianos y anglos mezclados (Laura, Andrés, Camila, Mike, Sarah).
7. Nada de ejercicios cuya respuesta dependa de un tema que no es el del archivo, salvo en temas de contraste.
8. Distribución de niveles aprox.: 35 % nivel 1, 45 % nivel 2, 20 % nivel 3.

### Códigos de error (`code`)

| code | Qué entrena |
|---|---|
| SUJ | sujeto obligatorio (it / there) |
| 3S | -s de he/she/it |
| LL | la llave en preguntas y negativas |
| DM | doble marca (did + pasado, does + -s) |
| BE | mezclar be con verbo simple (*I am work*, *I am agree*) |
| WW | concordancia was/were, am/is/are |
| ING | be + -ing completo |
| EST | verbos de estado en continuo |
| IRR | verbos irregulares |
| MOD | modal + verbo base (sin to, sin -s, sin do) |
| TPO | elegir el tiempo correcto |
| UT | used to |
| PP | presente perfecto |
| FUT | futuro (will / going to / presente continuo) |
| CMP | comparativos y superlativos |
| CUA | cuantificadores |
| PRO | pronombres indefinidos |
| CON | conectores |
| VOC | vocabulario |
| USO | frases hechas y calcos del español |

## plan.json (lo escribe Claude)

```json
{
  "actualizado": "2026-10-10",
  "mensaje": "Texto corto para el inicio.",
  "foco": [{ "tema": "pasado-continuo", "peso": 3 }],
  "codigos": ["ING", "WW", "MOD"],
  "consignas": [{ "id": "v-001", "consigna": "...", "objetivo": "...", "ejemplo": "..." }]
}
```

## Datos que escribe la app (los lee Claude)

- `data/progreso/progreso.json` — estado de repetición espaciada por ejercicio, racha y XP.
- `data/progreso/eventos.jsonl` — cada respuesta: fecha, tema, ejercicio, código, si acertó y qué escribió.
- `data/bandeja/<id>.json` + audio — cada grabación con su consigna y la transcripción del navegador.
- `data/feedback/<id>.json` — la evaluación de Claude de cada grabación (la app la muestra).
