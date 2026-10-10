# Protocolo de Claude · «atiende Llaves»

Cuando el usuario diga **«revisa mi bandeja»**, **«revisa mi sesión»** o **«atiende Llaves»**, Claude sigue estos pasos en la conversación. Todo pasa por archivos en disco, sin APIs de pago.

## 1. Leer qué pasó desde la última revisión

- `data/progreso/eventos.jsonl` — una línea por respuesta: `ts, tema, id, tipo, code, ok, r` (lo que escribió). `retry: true` = segundo intento en la misma sesión. `gen: true` = gimnasio (trae `q`). `flag: true` = **el usuario reportó que el ejercicio está mal**.
- `data/progreso/ultima-revision.txt` — fecha ISO de la última revisión. Solo se analizan los eventos posteriores.
- `data/progreso/progreso.json` — cajas de repetición espaciada por ejercicio, racha y códigos por día.

Resumen mínimo: precisión por tema y por código (primeros intentos), los 3 códigos que más fallan, los errores escritos que se repiten (mirar `r`) y los ejercicios reportados.

## 2. Arreglar los ejercicios reportados

Para cada `flag: true`: abrir el ítem en `data/temas/<tema>.json`, decidir si estaba mal (ambiguo, respuesta faltante, error de inglés) y corregirlo. Si la respuesta del usuario era válida, agregarla a `respuestas`. Validar después.

## 3. Evaluar las grabaciones

`data/bandeja/<id>.json` sin su `data/feedback/<id>.json`. Cada una trae `consigna`, `objetivo`, `transcripcion` (del navegador, en-US), `nota` y `audioFile`.

> **Límite honesto:** la transcripción del navegador tiende a «arreglar» la gramática (puede poner una -s que no se dijo). Hay que evaluar sobre ella, pero sin afirmar errores de pronunciación que el texto no muestre. Para pronunciación real haría falta transcribir el audio con Whisper; solo con el permiso explícito del usuario (cuesta centavos).

Escribir `data/feedback/<id>.json`:

```json
{
  "id": "rec-20261011…",
  "fecha": "2026-10-11",
  "puntaje": 78,
  "resumen": "Dos o tres frases: qué logró y qué le falta.",
  "codigos": ["ING", "3S"],
  "correcciones": [
    { "original": "I working on the campaign", "correcta": "I'm working on the campaign", "code": "ING", "nota": "Sin am no hay continuo." }
  ],
  "bien": ["Usó when + pasado simple para la interrupción."],
  "pronunciacion": [],
  "version": "Así sonaría todo el texto corregido y natural.",
  "siguiente": "Una acción concreta para la próxima sesión."
}
```

Puntaje: precisión gramatical de lo que sí dijo (60 %), uso del objetivo (25 %), fluidez y extensión (15 %).

## 4. Ajustar el plan

Reescribir `data/plan.json` (formato en `data/ESQUEMA.md`): `actualizado`, `mensaje` (corto, concreto, con el dato que lo justifica), `foco` (temas y pesos según lo que falla), `codigos` (los 3–4 que más fallan) y `consignas` (2–4 grabaciones nuevas, ligadas a su vida y a su trabajo). Mantener `lineaBase`.

## 5. Agregar ejercicios de refuerzo

Crear `data/extra/<fecha>-<tema>.json` con `{ "tema": "<id>", "ejercicios": [...] }`: entre 10 y 20 ítems sobre **sus errores reales** (usar sus frases de `r` y de las grabaciones como material), con ids `<tema>-x<fecha>-001`. La app los mezcla con el banco y los prioriza por ser nuevos.

## 6. Validar y cerrar

```bash
node tools/validar.mjs && node tools/probar-respuestas.mjs
```

Escribir la fecha en `data/progreso/ultima-revision.txt`. La app recoge los cambios sola al volver a la pestaña. Contarle al usuario en el chat: qué mejoró, qué sigue fallando, qué cambió en su plan.
