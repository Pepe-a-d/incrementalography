# Incrementalography 2: eras y jefes

Plan del cambio que pediste el 16-11-2026, antes de publicar la 1.0.1: fuera la fama y los renaceres. Cada era se juega entera (su árbol y su jefe) y vencer al jefe te lleva a la siguiente.

## Lo que decidiste

| Pregunta | Respuesta |
| --- | --- |
| Entre eras | Árbol nuevo y tinta a cero en cada era. Cada jefe vencido da un **trofeo** permanente. |
| Final | **Nueva partida+**: después del último jefe vuelves a la primera era con palabras más difíciles y un bonus permanente. |
| Música | **Compuesta en código**, un tema por jefe, solo en las peleas. |
| Duración | **20–30 min por era** a 55 WPM, unas 1,5–2 h el juego entero. |

## Cómo se juega

1. Empiezas en el **Scriptorium** con un árbol de 10 mejoras de esa era.
2. Escribes drafts (como ahora: 20–60 s) para ganar tinta y comprar mejoras.
3. Al comprar las 10 aparece arriba del árbol un nodo distinto: **el libro**, que es el jefe. Pulsarlo (o Espacio) abre la pelea.
4. La pelea es un nivel especial de 2–3 minutos con reglas propias, música propia y 3 fases que se endurecen.
5. **Si ganas:** te llevas el trofeo, ves una transición corta y entras solo en la era siguiente, con su árbol vacío y la tinta a cero.
6. **Si pierdes:** vuelves al árbol con la tinta ganada en la pelea y puedes reintentarlo cuando quieras. Cada derrota baja un 10 % la dificultad de ese jefe, hasta un 30 %, para que nadie se quede atascado.
7. Tras el jefe de la última era: escena final con tus estadísticas y **segunda edición** (Nueva partida+).

**Se quita:** fama ★, publicar, árbol de fama, desafíos y Magnum Opus.

**Se queda:** los drafts, el consejero («+X % de tinta por draft»), el tutorial del primer draft y el de cada era, los ajustes de la 1.0.1 y la app de escritorio.

## Las cuatro eras

Cada era cambia en todo: aspecto, recurso, mecánica de los drafts, árbol, jefe, trofeo y música. Los números siguen creciendo de una era a otra (tinta ×1, ×4, ×16, ×64), así que se nota el avance aunque el árbol empiece de cero.

| | Scriptorium | Typewriter | Computer | Future |
| --- | --- | --- | --- | --- |
| **Aspecto** | Pergamino, tinta parda, rojo de rúbrica y oro | Papel de máquina sobre mesa oscura, cinta negra y roja | Terminal de fósforo verde con líneas de barrido | Cristal oscuro, cian y magenta, anillos |
| **Fuente** | EB Garamond | Courier Prime | IBM Plex Mono | Space Grotesk |
| **Tu recurso** (la barra de concentración de ahora) | Una vela que se consume | La cinta que se gasta | La batería | La señal |
| **Palabras** | Minúsculas | Mayúsculas y puntuación | Números y símbolos | Frases |
| **Mecánica de draft** | Palabras iluminadas y doradas | Campanilla: Enter al final de cada línea | Bichos que saltan entre palabras | Palabras tenues que desaparecen |
| **Árbol** | Columnas de tinta (como ahora) | Teclas redondas de máquina | Árbol de carpetas `├─` | Constelación en órbitas |
| **Jefe** | El Códice del Abad | El Cierre | El Gusano | El Eco |
| **Trofeo** | Sello del Abad: los fallos cuestan un 25 % menos | Campana dorada: +4 s de recurso | Acceso root: la racha empieza al 25 % | Última página: abre la segunda edición |
| **Música del jefe** | Bordón de órgano, canto en modo dórico, tambor de marco y campanas | Swing: contrabajo, escobillas, metales y golpes de máquina | Chiptune: arpegios de onda cuadrada y ruido | Synthwave: pads de sierra, bajo arpegiado y caja con reverb |

## Los árboles (10 mejoras cada uno)

Una raíz y tres columnas de tres, todas de una sola compra. Cada era trae sus propias ideas y no repite nombres. Los números exactos se ajustan con el simulador.

**Scriptorium**
- Raíz: **Pluma afilada** ×2 tinta.
- Pluma: Tinta de agallas ×2 tinta · Palabras largas ×3 · Salpicadura (20 % de las palabras salpican a otra).
- Vela: Cera de abeja +6 s · Pulso firme (los fallos cuestan la mitad) · Vigilia (+0,5 s por palabra limpia).
- Oro: Iluminación (palabras iluminadas ×4) · Pan de oro (doradas ×3 y el doble de frecuentes) · Salmodia (la racha se llena el doble).

**Typewriter**
- Raíz: **Cinta nueva** ×2 tinta.
- Teclas: Bloqueo de mayúsculas (palabras con mayúscula ×2) · Puntuación (palabras con signos ×3) · Mecanografía (la racha se llena el doble).
- Carro: La campanilla (+50 % de la tinta de la línea al pulsar Enter a tiempo) · Retorno rápido (+1 s de margen y +2 s de cinta por línea) · Página llena (cada 5 líneas, ×2 durante 5 s).
- Café: Café cargado +6 s · Papel carbón (10 % de palabras cuentan doble) · Manos quietas (los fallos cuestan la mitad).

**Computer**
- Raíz: **Teclado mecánico** ×2 tinta.
- Código: Símbolos ×2 · Macro (cadenas de palabras rápidas ×2) · Compilador (palabras de 8 o más caracteres ×3).
- Depurador: Depurador (cada bicho atrapado ×3) · Enjambre (el doble de bichos) · Parche (+1 s de batería por bicho).
- Memoria: RAM +6 s · Caché (+0,5 s de margen para encadenar) · Overclock (palabras un 20 % más rápidas, pero ×1,5 tinta).

**Future**
- Raíz: **Enlace neuronal** ×2 tinta.
- Visión: Clarividencia (tenues ×3) · Lucidez (las tenues tardan más en borrarse) · Precognición (la siguiente letra brilla).
- Órbita: En la zona (racha llena: ×1,5) · Fluir (la racha se llena el doble) · Nova (cada 20 palabras, una onda que atrapa la palabra más cercana).
- Señal: Amplificador +6 s · Eco (5 % de palabras se repiten solas) · Calma (los fallos cuestan la mitad).

## Los jefes

Todos tienen una barra de vida (las páginas del libro), 3 fases y una presentación con su nombre y su regla en una línea. Pierdes si tu recurso se agota.

1. **El Códice del Abad (Scriptorium).** El Abad dicta y tú copias.
   - La página se queda a oscuras y solo se ve lo que alumbra la vela.
   - Los versículos aparecen fijos en el centro y los copias; cada uno es una página del códice.
   - Fase 2: cada versículo empieza con una capital iluminada que hay que escribir sin fallos.
   - Fase 3: el viento hace parpadear la vela y el texto se apaga a ratos; sigues de memoria.
2. **El Cierre (Typewriter).** La rotativa arranca a una hora y tienes que tener la portada.
   - Un reloj marca el tiempo. Los titulares llegan en mayúsculas y el papel sube con cada línea.
   - La campanilla suena al final de cada línea; si no pulsas Enter a tiempo, el carro se atasca y pierdes cinta.
   - Fase 2: el lápiz rojo del editor tacha palabras ya escritas y hay que repetirlas.
   - Fase 3: la rotativa arrastra el papel cada vez más rápido y lo que no escribes se pierde por arriba.
3. **El Gusano (Computer).** Un virus hecho de segmentos avanza hacia tus archivos.
   - Cada segmento es un trozo de código (`0xFF`, `rm -rf`, `{null}`). Escribirlo lo destruye.
   - Si la cabeza llega a un archivo, se lo come y pierdes batería.
   - Fase 2: el gusano se parte en dos.
   - Fase 3: corrompe las letras (unas se cambian por símbolos) y hay que escribirlas como se ven.
4. **El Eco (Future).** Una IA escribe contra ti.
   - Llegan frases y el Eco también las escribe, con su propio cursor. Quien acaba primero gana la frase y empuja una barra de tira y afloja.
   - Fase 2: el Eco baraja las letras que aún no has escrito hasta que empiezas la palabra.
   - Fase 3: las frases solo se ven un segundo y luego se borran.

## Nueva partida+ (segunda edición)

- Tras el último jefe: escena final (tiempo total, palabras, mejor WPM, jefes y derrotas) y el botón **segunda edición**.
- Vuelves al Scriptorium con el árbol vacío y la tinta a cero.
- **Te quedas** los trofeos y un ×2 de tinta permanente por edición.
- **Más difícil:** palabras un 10 % más rápidas y una letra más largas, y jefes con un 20 % más de vida por edición.
- El título y el árbol muestran «Edition II», «Edition III»…

## Música

Un secuenciador pequeño con el audio del navegador (sin archivos), como los efectos de ahora.
- Un tema por jefe, en bucle, con 3 intensidades: cada fase añade capas y sube el tempo.
- Ajustes: un volumen de **música** aparte del de los efectos.

## Partidas guardadas (SAVE_VERSION 6)

Una partida de ahora pasa a la era más nueva que tenía abierta:
- con el árbol vacío y la tinta a cero;
- con los trofeos de las eras anteriores;
- conservando las estadísticas y los tutoriales vistos.

Un aviso lo explica la primera vez. Antes de subir la versión se prueba la migración con una partida real de la versión actual (la lección de la v7).

## Fases

1. **Estructura:**
   - Quitar fama, publicar, desafíos y Opus.
   - Un árbol por era, el nodo del libro y los trofeos.
   - Paso de era y migración. En esta fase el jefe es provisional.
2. **Aspecto de cada era:**
   - Colores, fondos de página, el recurso de cada era en el HUD, la piel del árbol y las partículas.
3. **Motor de jefes y música:** primero el Códice del Abad y su tema.
4. **El Cierre** y su tema.
5. **El Gusano** y su tema.
6. **El Eco** y su tema, la escena final y la segunda edición.
7. **Cierre de la versión:**
   - Ritmo con el simulador: tiempo por era y cuántas veces gana cada bot a cada jefe.
   - Tutoriales de los jefes y pulido.
   - Capturas nuevas para la página de descarga.
   - Versión 2.0.0, que incluye lo de la 1.0.1.

**Ritmo objetivo (simulador):**
- 20–30 min por era a 55 WPM.
- Un bot de 55 WPM gana a cada jefe a la primera el 60–70 % de las veces.
- El de 35 WPM gana en 1–3 intentos.

## Hecho (16-11-2026)

Las 7 fases, seguidas:

1. **Estructura:** fuera Fama, publicar, desafíos y Opus. Un árbol por era con el libro encima, trofeos, paso de era, ediciones y migración de partidas antiguas (SAVE_VERSION 6, probada con una partida v5).
2. **Aspecto:** cada era con sus colores y su fuente de interfaz, su página (margen de rúbrica, hoja y carro, terminal con números de línea y prompt, anillos), su barra de recurso (vela con llama, cinta bicolor, batería por segmentos, señal brillante) y su piel de árbol (columnas de tinta, teclas, carpetas, constelación).
3. **El Códice del Abad** y el motor de jefes (`boss.js`, `bossview.js`), con la música (`music.js`) de los cuatro temas.
4. **El Cierre.**
5. **El Gusano.**
6. **El Eco**, la escena final con trofeos y estadísticas, y la edición siguiente.
7. **Cierre:** precios ×1,2, notas del primer intento, textos de los tutoriales (vela, cinta), página de descarga con capturas nuevas y versión 2.0.0.

**Ritmo medido (bots):**

| Mecanógrafo | Scriptorium | Typewriter | Computer | Future | Total |
| --- | --- | --- | --- | --- | --- |
| 35 WPM | 28 min | 33 min | 30 min | 44 min | ~2 h 15 |
| 55 WPM | 23 min | 23 min | 24 min | 21 min | ~1 h 30 |
| 80 WPM | 21 min | 16 min | 21 min | 15 min | ~1 h 13 |

(Incluye 2,5 min por libro.)

**Jefes:**
- Un bot de 55 WPM gana a la primera: el Códice el 76 %, el Cierre ~70 %, el Gusano ~60 % y el Eco ~60 %.
- A 35 WPM pierde las primeras veces y gana con la ayuda de las derrotas (al 55 %, gana el 82–100 %).

**Sin probar:**
- Jugarlo con un teclado de verdad, sobre todo los jefes: los bots no se ponen nerviosos.
- La música: comprobada en el código, pero no se ha escuchado.
- La app en Windows y en pantalla completa.
