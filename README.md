# Llaves · tu app de inglés

**Versión web:** https://jpaulrodriguez.github.io/llaves-ingles/ (el avance se guarda en el navegador de cada dispositivo).

App personal para practicar lo que ves en el Colombo: teoría siempre a mano, ejercicios tipo Duolingo con repetición espaciada, avance medible y grabaciones de voz que Claude evalúa en la conversación.

## Abrirla en el Mac (versión completa)

Doble clic en **`abrir-llaves.command`** (en esta carpeta). Arranca el servidor si no está corriendo y abre `http://localhost:8811`.

La primera vez, macOS puede pedir permiso para abrir el archivo (clic derecho → Abrir) y el navegador te pedirá permiso para el micrófono cuando grabes. Para grabar con transcripción en vivo, usa **Chrome o Safari**.

## Qué hay dentro

| Pestaña | Para qué |
|---|---|
| **Hoy** | La sesión del día (repaso + foco de la semana + tus llaves rotas), el mensaje de Claude y tus números |
| **Teoría** | 34 capítulos (tiempos, modales, estructuras, adverbios y preposiciones, trabajo, vocabulario, errores típicos): llave, fórmulas, reglas, palabras señal, usos diarios y de trabajo, errores típicos, frases con audio |
| **Practicar** | Sesión de hoy, **palabras nuevas** (697 palabras que entran poco a poco: verbos con sus cinco formas, adjetivos, adverbios, preposiciones, phrasal verbs), **ejercicios extensos** (textos, lecturas y redacción), repaso pendiente, mis errores, **gimnasio de llaves** (frases infinitas de los 4 tiempos) y práctica por tema |
| **Voz** | Grabas con una consigna, se transcribe gratis en el navegador y queda en la bandeja para Claude |
| **Avance** | Racha, constancia, llaves rotas por código, línea base del diagnóstico, dominio por tema y ajustes |

**Niveles:** 1 reconocer · 2 producir frases · 3 textos, lecturas y redacción. Cada tema abre el siguiente nivel cuando subes su dominio (25 % y 55 %).

Atajos en los ejercicios: **1–4** para elegir, **Enter** para comprobar y continuar, **Esc** para salir, **Borrar** quita la última ficha.

## Cómo trabajamos con Claude

1. Practicas en la app (tus respuestas se guardan en `data/progreso/`).
2. Grabas en **Voz** y envías a la bandeja (`data/bandeja/`).
3. En el chat le dices a Claude: **«revisa mi bandeja»** o **«atiende Llaves»**.
4. Claude lee tus respuestas y grabaciones, te deja la corrección en la pestaña Voz, ajusta tu plan y agrega ejercicios sobre tus errores reales. Al volver a la app, todo aparece solo.

¿Un ejercicio está mal? Toca el ícono **(!)** en la hoja de respuesta: Claude lo revisa en la siguiente sesión.

## Versión web (GitHub Pages)

La carpeta `docs/` es la versión estática. Se regenera con `node tools/publicar.mjs` y se sube con git. Diferencias con la versión del Mac: el avance vive en el navegador; las grabaciones se copian para pegarlas en el chat (y el audio se puede descargar); en **Avance** está el botón «Copiar resumen para Claude».

## Archivos

- `data/temas/` — teoría y banco de ejercicios (uno por tema)
- `data/extra/` — refuerzos que agrega Claude
- `data/plan.json` — foco de la semana, mensaje y consignas de voz
- `data/progreso/` — tu avance (no lo borres; la app también guarda una copia en el navegador)
- `COACH.md` — el protocolo que sigue Claude en cada revisión
- `data/ESQUEMA.md` — formato del contenido
