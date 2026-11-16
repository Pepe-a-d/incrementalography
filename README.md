# Incrementalography

Incremental de mecanografía, en inglés. Atrapas tecleando las palabras que cruzan la página y avanzas por cuatro eras de la escritura (Scriptorium, Typewriter, Computer y Future). Cada era tiene su propio aspecto, su árbol de 10 mejoras y su libro: un jefe con reglas y música propias. Vencerlo deja un trofeo y te lleva a la era siguiente. Después de la última viene la segunda edición (Nueva partida+). Hecho con el skill `incremental-pixel`, aunque sin pixel art.

```bash
npm install
npm run dev      # http://localhost:5197
npm run build    # genera dist/ (base relativa: vale para GitHub Pages)
npm run sim      # bots mecanógrafos (35, 55 y 80 WPM) compran el árbol de cada era y miden cuánto dura cada una
node sim/bosses.mjs     # cada jefe contra bots de 30–80 WPM: cuántas veces gana cada uno y en cuánto tiempo (MERCY=0.55: tras 3 derrotas)
node sim/ladder.mjs 55  # calcula los precios de cada árbol a partir del ritmo que se quiere
npm run humo     # juega y dibuja un draft y un jefe en cada era sobre un canvas falso, sin navegador
```

## App de escritorio (Electron)

```bash
npm run app        # compila el juego y lo abre en una ventana de Electron
npm run build:app  # instaladores en release/: Mac (.dmg, Apple Silicon) y Windows (instalador y portable)
npm run build:mac  # solo Mac
npm run build:win  # solo Windows (se hace desde el Mac, sin Wine)
npm run icon       # vuelve a dibujar build/icon.png desde build/icon.svg
```

- `electron/main.cjs` sirve `dist/` desde `app://game/`. Así la partida (localStorage) se guarda en la carpeta de datos de la app (`~/Library/Application Support/Incrementalography` en el Mac, `%APPDATA%\Incrementalography` en Windows).
- Las fuentes van dentro (`src/fonts.js`, paquetes `@fontsource`): el juego funciona sin internet.
- Sin firma de Apple ni de Microsoft: el Mac lleva firma ad-hoc. La primera vez, macOS pide abrirla desde Ajustes → Privacidad y seguridad → «Abrir igualmente», y Windows SmartScreen pide «Más información» → «Ejecutar de todas formas».
- `INCR_SHOT=/ruta/captura.png` al lanzar la app guarda una captura de la ventana, imprime el estado del juego y cierra (para pruebas).
- `.claude/launch.json` sigue arrancando el servidor de Vite para jugar en el navegador.

## Página de descarga (`site/`)

```bash
npm run site       # la página en http://localhost:5199 (en local no descarga nada: solo enseña qué pasaría)
npm run release    # compila los instaladores y los sube a GitHub Releases (sube antes la versión en package.json)
```

- **Cómo es:** la pantalla de título del juego. El título se escribe solo, pasan palabras de las cuatro eras y hay dos palabras para teclear: «mac» o «windows». Al completarla empieza la descarga. Solo con el teclado: hacer clic no descarga nada. La versión portable de Windows se baja tecleando «portable» en el pie.
- **Debajo:**
  - Qué es el juego, en tres ideas.
  - Las cuatro eras, cada una con su letra.
  - Tres capturas reales (`site/shots/`, hechas con `INCR_URL` + `INCR_JS` + `INCR_SHOT`).
- **Enlaces:** apuntan a `github.com/Pepe-a-d/incrementalography/releases/latest/download/…`, con nombres fijos.
- **Publicar:** el workflow de Pages publica `site/` en la raíz y el juego para el navegador en `/play/`.

Opciones del simulador: `node sim/balance.mjs <min> <wpm,…>`, más `SEEDS=2`, `ERR=0.06`, `QUIET=1`, `SNAP=600`, `NOPUB=1` (sin publicar) y `CHAL_MIN=90` (minutos de desafíos tras el Magnum Opus).

| Archivo | Qué hace |
| --- | --- |
| `src/data.js` | Eras (aspecto, recurso, jefe, trofeo), base del draft y los cuatro árboles con sus precios (`LADDER`) |
| `src/words.js` | Palabras de cada era y cómo se transforman (mayúsculas, símbolos, frases) |
| `src/game.js` | Partida: el árbol de la era, compras, `computeStats`, trofeos, ganar o perder un jefe, pasar de era, ediciones y guardado (con la migración de partidas antiguas) |
| `src/run.js` | Un draft sin DOM: palabras, teclas, Focus, racha, carro, bugs, palabras tenues y el bot mecanógrafo |
| `src/render.js` | Dibujo del draft en canvas, con el juice (letras que saltan, estallidos, avisos, zona, latido) |
| `src/treeview.js` | El árbol de la era en columnas que se llenan desde el tintero, con el libro (el jefe) encima: figura por columna, icono y efecto, «?» por abrir, ficha, mejor compra y ráfagas. Cada era lo viste a su manera en CSS |
| `src/boss.js` | Los cuatro jefes sin DOM (deterministas, como `run.js`): recurso, páginas, fases, reglas de cada uno y su bot |
| `src/bossview.js` | Dibujo de cada jefe en su canvas: la vela del Abad, la portada y el reloj, el gusano y los archivos, el Eco y la barra de tira y afloja |
| `src/music.js` | Música de los jefes hecha con WebAudio: un tema por era con tres intensidades que siguen las fases |
| `src/icons.js` | Iconos de Tabler (MIT) que usa el juego; se generan con `node scripts/icons.mjs` desde la dependencia `@tabler/icons` |
| `src/inkend.js` | Final de cada draft: la cascada de tinta que mancha la página y deja los resultados en el color del papel |
| `src/advisor.js` | Asesor: cuánto da cada mejora con tu forma de teclear y cuál es la mejor compra |
| `src/ui.js` | Avisos, ventanas, ajustes, exportar, importar y borrar |
| `src/audio.js` | Sonidos de cada era con WebAudio |
| `src/tutorial.js` | Primer draft guiado y el primer draft de cada era nueva |
| `electron/main.cjs` | La app de escritorio: ventana, protocolo `app://`, menú mínimo en el Mac. Escala el juego al tamaño de la ventana (diseñado para 1280×800) por el tamaño de interfaz elegido, y recuerda pantalla completa, ventana maximizada y tamaño en `prefs.json` de su carpeta de datos. F11 pone la pantalla completa; Ctrl/⌘ + y − cambian el tamaño, y Ctrl/⌘ 0 lo devuelve al normal |
| `electron/preload.cjs` | Lo que el juego puede pedir a la app (`window.desktop`): pantalla completa y tamaño de interfaz, para los Ajustes |
| `src/main.js` | Pantalla de título, pantallas, bucle, teclado, HUD, resumen, el libro de cada era (puerta, pelea, victoria, derrota), paso de era y final |

Diseño: `docs/diseno.md`. Plan de la versión 2 (eras y jefes) y ritmo medido: `docs/plan-eras-y-jefes.md`. Historia anterior: `docs/plan-incrementalography.md`.
