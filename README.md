# Incrementalography

Incremental de mecanografía, en inglés. Atrapas tecleando las palabras que cruzan la página y avanzas por cuatro eras de la escritura (Scriptorium, Typewriter, Computer y Future). Publicas libros para ganar Fama, y después vienen el Magnum Opus y los desafíos sin fin. Hecho con el skill `incremental-pixel`, aunque en estilo minimalista.

```bash
npm install
npm run dev      # http://localhost:5197
npm run build    # genera dist/ (base relativa: vale para GitHub Pages)
npm run sim      # bots mecanógrafos (35, 55 y 80 WPM) juegan la partida entera y miden el ritmo
npm run humo     # juega y dibuja un draft en cada era sobre un canvas falso, sin navegador
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

- **Cómo es:** la pantalla de título del juego. El título se escribe solo, pasan palabras de las cuatro eras y hay dos palabras para teclear: «mac» o «windows». Al completarla empieza la descarga (con clic también) y aparecen los pasos para abrirla la primera vez.
- **Debajo:**
  - Qué es el juego, en tres ideas.
  - Las cuatro eras, cada una con su letra.
  - Tres capturas reales (`site/shots/`, hechas con `INCR_URL` + `INCR_JS` + `INCR_SHOT`).
- **Enlaces:** apuntan a `github.com/Pepe-a-d/incrementalography/releases/latest/download/…`, con nombres fijos.
- **Publicar:** el workflow de Pages publica `site/` en la raíz y el juego para el navegador en `/play/`.

Opciones del simulador: `node sim/balance.mjs <min> <wpm,…>`, más `SEEDS=2`, `ERR=0.06`, `QUIET=1`, `SNAP=600`, `NOPUB=1` (sin publicar) y `CHAL_MIN=90` (minutos de desafíos tras el Magnum Opus).

| Archivo | Qué hace |
| --- | --- |
| `src/data.js` | Eras, base del draft, árbol de tinta, árbol de Fama y desafíos |
| `src/words.js` | Palabras de cada era y cómo se transforman (mayúsculas, símbolos, frases) |
| `src/game.js` | Partida: niveles, compras, `computeStats`, publicar, Fama, desafíos y guardado |
| `src/run.js` | Un draft sin DOM: palabras, teclas, Focus, racha, carro, bugs, palabras tenues y el bot mecanógrafo |
| `src/render.js` | Dibujo del draft en canvas, con el juice (letras que saltan, estallidos, avisos, zona, latido) |
| `src/treeview.js` | Árboles de mejoras (tinta y Fama) en columnas que se llenan de tinta desde el tintero: figura por columna, icono y efecto, «?» por abrir, ficha, mejor compra y ráfagas |
| `src/icons.js` | Iconos de Tabler (MIT) que usa el juego; se generan con `node scripts/icons.mjs` desde la dependencia `@tabler/icons` |
| `src/inkend.js` | Final de cada draft: la cascada de tinta que mancha la página y deja los resultados en el color del papel |
| `src/advisor.js` | Asesor: cuánto da cada mejora con tu forma de teclear y cuál es la mejor compra |
| `src/ui.js` | Avisos, ventanas, ajustes, exportar, importar y borrar |
| `src/audio.js` | Sonidos de cada era con WebAudio |
| `src/tutorial.js` | Primer draft guiado y el primer draft de cada era nueva |
| `electron/main.cjs` | La app de escritorio: ventana, protocolo `app://`, pantalla completa con F11 y menú mínimo en el Mac |
| `src/main.js` | Pantalla de título, pantallas, bucle, teclado, HUD, resumen, publicar, desafíos y Magnum Opus |

Diseño: `docs/diseno.md`. Plan, cambios y ritmo medido: `docs/plan-incrementalography.md`.
