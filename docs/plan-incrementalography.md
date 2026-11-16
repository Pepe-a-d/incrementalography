# Plan de desarrollo: Incrementalography

Incremental de mecanografía, todo en inglés. Atrapas tecleando las palabras que cruzan la página y avanzas por las eras de la escritura (pluma, máquina de escribir, ordenador y futuro). Para pasar de era publicas tu libro: reinicias y ganas Fama.

## Lo que decidiste

| Tema | Decisión |
| --- | --- |
| Idioma | Todo en inglés: interfaz y palabras. Sin selector de idioma |
| Durante la partida | Atrapar palabras. Cruzan la página con distinto valor; al teclear la primera letra apuntas a una y al terminarla la atrapas. Las que se escapan no castigan |
| Tema | Eras de la escritura: Scriptorium, Typewriter, Computer y Future |
| Fin de la partida | Barra de concentración (Focus): baja con el tiempo y con cada fallo, y las palabras sin fallos la recargan un poco, con tope. Entre 20 y 60 s |
| Fallos | La letra no avanza hasta que pulses la correcta. El fallo rompe la racha y gasta Focus. Nunca hace falta borrar |
| Habilidad | Cuentan las dos cosas: tu velocidad (más palabras por partida) y tu precisión (la racha). Las mejoras multiplican por encima |
| Ayudantes | Sí, dentro de la partida: atrapan solos palabras cortas. El primero, hacia el minuto 10–13 |
| Teclas nuevas | Obligatorias en cada era: mayúsculas y puntuación en la máquina de escribir, números y símbolos en el ordenador, todo junto en el futuro |
| Minijuegos | Ninguno |
| Estilo | Minimalista limpio con paleta por era (variante B de las maquetas): pergamino crema con serifa, papel blanco con letra de máquina, pantalla oscura verde y negro con cian |
| Dirección | Las palabras entran por la derecha y se escapan por la izquierda |
| Sonido | Sonidos de cada era, generados en el navegador, con volumen en Ajustes |
| Palabras | Comunes mezcladas con temáticas de cada era. Las temáticas y las largas valen más |
| Velocidad (WPM) | La velocidad y la precisión, siempre a la vista durante la partida |
| Final | Infinito con reinicios: publicar reinicia y da Fama (los tokens) |
| Reinicio | La Fama abre las eras. Pierdes la tinta y el árbol normal; conservas la Fama, sus habilidades, las eras abiertas y los récords. Eliges la era al empezar |
| Después de las 4 eras | Desafíos con niveles sin fin |
| Duración | Las 4 eras, en 1,5–2 h |
| Nombre | Incrementalography |
| Dispositivo | Solo ordenador con teclado. En el móvil, un aviso |

## Nombres dentro del juego (los propongo yo)

| Cosa | Nombre |
| --- | --- |
| Moneda | **Ink** |
| Una partida | **Draft** |
| Reiniciar | **Publish** (publicas tu libro) |
| Tokens del reinicio | **Fame** ★ |
| Barra de partida | **Focus** |
| Racha | **Streak** |

## Cómo se juega

### Un draft (una partida)
1. Eliges la era y pulsas Enter.
2. Las palabras entran por la derecha y cruzan la página hacia la izquierda, a distintas alturas y velocidades. Siempre hay varias a la vista, así que nunca te quedas sin nada que escribir.
3. Al teclear una letra apuntas a una palabra que empieza por ella; si hay varias, a la más cercana a escaparse. Se resalta, y cada letra correcta se rellena con el sonido de la era.
4. Al terminarla, la palabra salta a tu página (la línea de abajo, que va formando un texto), suelta «+N» de tinta y sube la racha.
5. Si pulsas una tecla equivocada, no avanzas: la racha vuelve a 0, el Focus pierde un trozo y la palabra tiembla. Esc suelta la palabra sin castigo.
6. El Focus baja con el tiempo. Cada palabra sin fallos devuelve un poco, como mucho lo que tenías al empezar. Al vaciarse, acaba el draft.
7. Resumen a un lado: la tinta ganada en grande, WPM, precisión, mejor racha, una etiqueta si hubo récord y los botones «Another draft» y «Upgrades ▶». Enter pulsa el principal.

### Lo que vale una palabra
- **Tinta** = letras × valor de la era × (1 + racha) × mejoras.
- Las palabras temáticas valen ×2.
- Del 3 al 8 % son doradas y valen ×5: es la sorpresa pequeña.

### La racha
- Cada letra correcta sube la racha. Al principio llega como mucho a +100 % (se puede mejorar).
- Se ve en una barra fina bajo el Focus. Un fallo la vacía.

### Ayudantes
- Un cursor de otro color va a por las palabras cortas y las escribe a su ritmo. El primero va a unos 20 WPM.
- Si apuntas a la misma palabra que un ayudante, te la deja.
- Cambian de nombre con la era: Apprentice, Typist, Script y Model.
- Se compran en la rama Helpers, como mucho 4, con precio muy empinado. Se pierden al publicar, salvo con la habilidad de Fama «Loyal Apprentice».

### Árbol de tinta (se reinicia al publicar)

| Rama | Ejemplos |
| --- | --- |
| Value | Better Nib (+30 % de tinta por nivel) · Vocabulary (palabras largas +25 %) · Gilding (más doradas) · Lexicon (temáticas ×+) |
| Focus | Deep Breath (+3 s de Focus) · Calm (los fallos cuestan un 20 % menos) · Second Wind (las palabras perfectas devuelven más) |
| Streak | Rhythm (tope de racha +50 %) · Steady Hand (el primer fallo de cada draft no rompe la racha) · Flow (la racha sube más rápido) |
| Helpers | Apprentice (el primero, caro) · Practice (+WPM de los ayudantes) · Reach (palabras de hasta 5–6 letras) · más ayudantes |
| La de cada era | 6–8 nodos para su mecánica. Acaba en **Masterwork**, que pide la rama entera y da +50 % de Fama al publicar |

### Publicar y la Fama
- El botón «Publish» sale en el resumen y en el árbol en cuanto la vuelta da al menos 1 de Fama. Dice cuánta Fama da ahora y cuánta tinta falta para +1, así que la meta siempre se ve.
- **Fama** = raíz de la tinta ganada en la vuelta ÷ un umbral. La curva se ajusta con el simulador.
- La primera publicación llega hacia el minuto 15–20 y da justo para abrir la máquina de escribir.

### Árbol de Fama (permanente)

| Nodo | Qué hace |
| --- | --- |
| Typewriter Era · Computer Era · Future Era | Abren la era (cada una más cara) |
| Reputation | +tinta por nivel |
| Head Start | Empiezas cada vuelta con tinta |
| Loyal Apprentice | Conservas el primer ayudante al publicar |
| Muscle Memory | La racha empieza en +10–20 % |
| Editor | Compra solo lo más barato del árbol de tinta (comodidad para el final) |
| Magnum Opus | Pide las 4 eras y el Masterwork del futuro. Saca una escena con tus estadísticas y abre los desafíos. No es un final: el juego sigue |

### Eras

| Era | Teclas | Mecánica nueva | Aspecto y sonido |
| --- | --- | --- | --- |
| Scriptorium | minúsculas | Palabras iluminadas: grandes y lentas, valen ×4 y recargan Focus (¿una grande o varias pequeñas?) | Crema y tinta, letra con serifa. Rasgueo de pluma |
| Typewriter | Mayúscula inicial y puntuación (Ribbon, Don't, Stop.) | El carro: cada 8 palabras suena la campanilla, y Enter a tiempo da un «Line bonus» de tinta y Focus | Papel blanco y letra de máquina. Clac, campanilla y carro |
| Computer | números y símbolos (file_2, v3.1, #tag, x=10) | Bugs: se meten en las palabras y cambian una letra por un símbolo. Esas valen ×3 (¿arriesgas o vas a lo fácil?) | Fondo oscuro con verde o ámbar, letra monoespaciada. Teclado mecánico |
| Future | todo mezclado, más frases cortas de 2–3 palabras | Palabras lejanas: aparecen tenues y se van volviendo nítidas, y atraparlas tenues vale ×2 | Negro con cian o violeta, sans geométrica. Sintetizador suave |

El valor de cada era, de partida ×1, ×4, ×16 y ×64, se ajusta con el simulador para compensar que en las eras difíciles se escribe más lento. Cada mecánica tiene una mejora que la suaviza en su rama.

### Desafíos (lo infinito)
Se abren con Magnum Opus. Cada uno es una vuelta con una regla especial, y el objetivo es ganar una cantidad de tinta antes de publicar. Tienen niveles I, II, III… sin fin (cada nivel pide ×10) y cada nivel da un premio permanente.

| Desafío | Regla | Premio por nivel |
| --- | --- | --- |
| Solo | Sin ayudantes | +10 % a lo que tecleas tú |
| Perfectionist | Un fallo acaba el draft | +tope de racha |
| Long Words | Solo palabras de 7 letras o más | Palabras largas +25 % |
| Sprint | El Focus baja el doble | +Focus |
| Blackout | Las letras se ocultan al empezar la palabra | +Fama al publicar |

### Recompensas por escala de tiempo

| Escala | Qué recompensa hay |
| --- | --- |
| Tecla (< 0,2 s) | La letra se rellena, suena el sonido de la era y el cursor avanza. Un fallo hace temblar la palabra con un golpe sordo |
| Gesto (0,5–3 s) | La palabra atrapada salta a tu página con «+N» y un tono que sube con la racha. Las doradas brillan y valen ×5 |
| Draft (20–60 s) | El resumen: tinta en grande, WPM, precisión, mejor racha y etiqueta de récord. Tu página escrita de fondo |
| Sesión corta (2–5 min) | 1–3 mejoras por draft al principio. Cada pocos minutos, un nodo que cambia algo (iluminadas, Steady Hand, el carro…) |
| Sesión (10–30 min) | Primer ayudante (minuto 10–13). Primera publicación y era nueva (minuto 15–20), y después una era cada ~25 min |
| Partida (1,5–2 h) | Magnum Opus: escena con tus estadísticas y apertura de los desafíos. Después, niveles de desafío sin fin |

### Ritmo objetivo
- **Primer draft:** 15–25 s, y da para 1–2 mejoras (los primeros precios, 5–8).
- **Cada draft después:** 20–60 s, más unos 5 s de resumen.
- **Primer ayudante:** minuto 10–13.
- **Primera publicación:** minuto 15–20, y abre la máquina de escribir.
- **Cada era:** unos 25 min. Las 4 abiertas y Magnum Opus, en 1,5–2 h.
- **Sin muros:** ningún tramo de más de 3–4 min sin comprar nada.
- **Simulador con tres mecanógrafos:** a 35, 55 y 80 WPM, con un 4–8 % de fallos. El de 35 tiene que avanzar a buen ritmo (como mucho ~1,5 veces más lento que el de 55).

### Pantalla y HUD (poco texto)
- **Arriba:** la era y el número de draft · la tinta · WPM y precisión en directo.
- **Debajo:** la barra de Focus, que se vacía, y una más fina para la racha.
- **En el centro,** la página por la que cruzan las palabras; **abajo,** tu línea escrita.
- **Cartel grande** solo para los récords (WPM, tinta) y la primera vez en una era.
- **El resumen,** a un lado para que se siga viendo la página.
- **Árbol:** el de la plantilla (se arrastra y tiene zoom), con dos pestañas, Ink y Fame.

## Qué se reaprovecha de la plantilla incremental-pixel
- **Se queda:** la estructura de archivos (data, game, run, main, treeview, ui, format, audio), el guardado, el simulador y la prueba de humo.
- **Cambia:**
  - El dibujo pasa a minimalista, sin pixel art.
  - Se juega con el teclado en vez del puntero.
  - El bot del simulador es un mecanógrafo.
  - Sin español (solo inglés) y sin minijuegos.

## Fases

### Fase 1: núcleo en el Scriptorium
(hecha el 16-11-2026)
- La página con las palabras que cruzan; apuntar y atrapar; Focus, racha, WPM y precisión en directo; resumen.
- Palabras iluminadas y doradas.
- Árbol de tinta con las ramas Value, Focus y Streak y la del Scriptorium.
- Sonidos de la pluma; Ajustes (volumen, exportar, importar y borrar); aviso en el móvil.
- Simulador con los tres mecanógrafos.

**Qué compruebo:**
- El ritmo en el simulador: primeras mejoras y sin muros.
- La lista de psicología.
- En el navegador: el draft, el resumen y el árbol.
- La consola limpia y la compilación.

**Qué te tocará probar:** teclear de verdad: si apuntar se siente natural y si las palabras van a buena velocidad.

### Fase 2: ayudantes, publicar y la máquina de escribir
(hecha el 16-11-2026)
- La rama Helpers y los cursores de los ayudantes.
- Publish, la Fama y su árbol, y el selector de era.
- La era Typewriter: mayúsculas y puntuación, el carro y la campanilla, su aspecto, sus sonidos y su rama.

**Qué compruebo:** el primer ayudante hacia el minuto 10–13, la primera publicación hacia el 15–20 y que publicar se entienda sin explicación.

### Fase 3: el ordenador
(hecha el 16-11-2026)
- Números y símbolos, los bugs, su aspecto oscuro, el teclado mecánico y su rama.

**Qué compruebo:** que la era compense lo que se pierde de velocidad (el valor ×16 y lo que mida) y que los bugs sean una decisión, no un castigo.

### Fase 4: el futuro y Magnum Opus
(hecha el 16-11-2026)
- Todo mezclado, frases cortas, palabras lejanas, su aspecto y sonido, y su rama.
- Magnum Opus: la escena con tus estadísticas.

**Qué compruebo:** 1,5–2 h hasta Magnum Opus con el mecanógrafo de 55 WPM.

### Fase 5: desafíos
(hecha el 16-11-2026)
- Los 5 desafíos con niveles sin fin y sus premios.
- Su pantalla para elegirlos y su récord.

**Qué compruebo:** que cada nivel se pueda pasar con lo que dan los anteriores y que el premio se note.

## Cambios respecto al plan (al construirlo)

- **Cada libro se escribe en una era:** se elige antes de su primer draft y no cambia hasta publicar. Las mejoras de tinta cuestan más en las eras altas (×1, ×2,5, ×7 y ×20), igual que la tinta que pide la Fama. Sin esto, en el ordenador se compraba el árbol entero en un draft y el juego duraba 25 min.
- **Fama** = √(tinta del libro ÷ (35.000 × precio de la era)) × bonos (Masterworks +50 % cada una, Acclaim, Blackout). El primer libro solo se puede publicar cuando da 3 ★, justo lo que cuesta la Typewriter.
- **Precios de Fama:** Typewriter 3, Computer 30, Future 150 y Magnum Opus 2.500.
- **Draft más corto:** Deep Breath da +2,5 s (4 niveles) y un draft recupera como mucho la mitad de su Focus. Medido: de 12 a 56 s, con una media de 34 s.
- **Ayudantes:** su alcance crece con la era (+1, +2 y +6 caracteres), o en el futuro no cogían ninguna frase.
- **Desafíos:** la meta va en tinta de la era del libro (× su precio), crece ×3 por tier, y los premios son ×1,5 (Solo, Long Words), +50 % de tope de racha, +2,5 s de Focus y ×1,3 de Fama con ×1,2 de tinta (Blackout).
- **Typewriter:** los puntos de la línea y el aviso «↵ Enter» van en la franja de la línea escrita, para no pisar las palabras.

## Ritmo medido (simulador, 2 semillas por mecanógrafo, 6 % de fallos)

| Mecanógrafo | Primer ayudante | 1.ª publicación | Computer | Future | Magnum Opus |
| --- | --- | --- | --- | --- | --- |
| 35 WPM | 13–14 min | 19 min | 44 min | 1 h 16–21 | 1 h 46–50 |
| 55 WPM | 9–10 min | 15 min | 35–36 min | 1 h 4–9 | 1 h 30–36 |
| 80 WPM | 8–9 min | 13 min | 31 min | 58 min–1 h 8 | 1 h 23–33 |

- El bot real escribe a unos 2/3 de su velocidad nominal, porque pierde tiempo eligiendo palabra (el de 55 mide unos 39 WPM).
- El tramo más largo sin comprar nada dura 1 min 39 s.
- **Desafíos (55 WPM):** los tiers I–II piden 3–5 min, los III–IV 4–9 min y siguen alargándose poco a poco.

## Versión 2 (16-11-2026): mejoras con incentivo y juice

Lo pediste tras probarlo: las mejoras se sentían planas, sin un «tengo que comprar esta», y querías más juice.

**Hecho:**
- **Asesor:** el impacto de cada mejora en tu tinta por draft, medido con tu WPM y tu precisión.
- **Para decidir:** insignia de mejor compra, compra rápida en el resumen (B), anillo de precio, hitos cada 5 niveles y siluetas con nombre.
- **Nodos clave:** Ink Splash, In the Zone y Chain.
- **Juice:** lo de la tabla de `diseno.md`.

**Reequilibrio:** la Fama ahora pide 300.000 × precio de la era por punto² (antes 35.000). El Future cuesta 90 ★ y el Magnum Opus 3.000. Las metas de los desafíos se multiplicaron por 6.

| Mecanógrafo | Primer ayudante | 1.ª publicación | Magnum Opus |
| --- | --- | --- | --- |
| 35 WPM | 11–12 min | 17–18 min | 1 h 50–58 |
| 55 WPM | 8–9 min | 14–15 min | 1 h 36–41 |
| 80 WPM | 8 min | 12 min | 1 h 26–28 |

- El tramo más largo sin comprar nada dura menos de 1 minuto.
- Los desafíos (55 WPM) piden 4–7 min por tier y crecen despacio.

## Versión 4.1 (16-11-2026): tutorial interactivo

- **Fuera la ventana de «cómo se juega»:** el primer draft enseña a jugar paso a paso (detalle en `diseno.md`, «Tutorial interactivo»).
- **Después del draft:** etiquetas con flecha llevan al jugador a comprar su primera mejora, a escribir otro draft y, más tarde, a publicar.
- **Botones:** algo más redondeados (5 px).
- **Título:** las letras de `begin` y `continue` van más claras hasta que se teclean.
- **Tutorial más fácil de seguir** (pedido después): una tarea grande con su porqué debajo, el HUD apagado salvo lo que se explica, la tecla siguiente en una caja sobre la página, una pausa con espacio antes del Focus y un foco que lava el resto de la pantalla en el resumen y en el árbol.

## Versión 5 (16-11-2026): árbol que crece desde el centro

Lo pediste para que el árbol fuera más intuitivo: una sola mejora inicial en el centro, mejoras que se van destapando hacia todos los lados, beneficios claros y todas con sentido. El detalle está en `diseno.md`, «Mejoras de tinta».

- **El árbol:**
  - Empieza con Sharp Quill en el centro y cuatro ramas (tinta, Focus, racha y ayudantes), más las cuatro eras en diagonal.
  - Cada mejora tiene un solo padre y de 1 a 5 niveles, y su caja dice qué da.
  - Lo siguiente se ve como «?».
- **Sin hitos.** Para compensar, las mejoras de tinta dan más por nivel (+50 %) y los precios suben por anillos desde el centro.
- **Partidas viejas:** las guardadas con la versión 1 recuperan toda la tinta que habían gastado en el árbol del libro en curso y empiezan el árbol nuevo vacío. El registro lo avisa.
- **Comprobado:** cada mejora se midió con el bot a 35 y 55 WPM, con 60 drafts por medida. Las que restaban tinta se cambiaron.

| Mecanógrafo | Primer ayudante | 1.ª publicación | Magnum Opus |
| --- | --- | --- | --- |
| 35 WPM | 8–9 min | 13–15 min | 1 h 45–50 |
| 55 WPM | 7 min | 12–13 min | 1 h 31–35 |
| 80 WPM | 6,5 min | 10–11 min | 1 h 24–27 |

- Ritmo medido con 2 semillas y FAME_K = 300.000, el mismo valor que antes.
- El tramo más largo sin comprar nada dura menos de 1,5 min.
- Los desafíos piden 5–6 min en el tier I y 8–10 min en el II.

## Versión 6 (16-11-2026): mejoras sueltas, figuras e iconos

Lo pediste porque las mejoras seguían costando de reconocer:
- Reconocer cada rama y lo que hace de un vistazo.
- Mejoras de una sola compra.
- Pocas opciones a la vez.
- Iconos en todo, la gota en vez de «ink».
- Fuera el título y el registro.
- «New draft» centrado y con espacio.

- **Elegiste de una maqueta** la opción B, forma por rama en tinta negra. El árbol de Fama también pasa a mejoras sueltas.
- **Árboles:** 70 mejoras de tinta y 22 de Fama, cada una de una sola compra con su efecto escrito. Las ramas se abren al llevar 0, 2, 4, 7 y 11 compras, y cada mejora abre como mucho dos. El detalle está en `diseno.md`.
- **Efectos:** cada mejora declara su efecto (`eff`) y `computeStats` los suma: multiplica los de `MUL` y suma el resto.
- **Iconos:** Tabler Icons. El límite de Figma (plan Starter) no se había restablecido.
- **Partidas viejas** (versiones 1 y 2): recuperan la tinta de sus mejoras y la Fama de las mejoras de Fama con niveles. Conservan las eras, Loyal Helper y Editor.
- **Ritmo:** FAME_K = 240.000, el primer ayudante cuesta 9.000 y las metas de los desafíos son un 40 % más bajas.

| Mecanógrafo | Primer ayudante | 1.ª publicación | Magnum Opus |
| --- | --- | --- | --- |
| 35 WPM | 7 min | 13 min | 1 h 44–47 |
| 55 WPM | 5 min | 10–11 min | 1 h 32–38 |
| 80 WPM | 4–4,5 min | 9 min | 1 h 23–27 |

- El tramo más largo sin comprar nada dura menos de 1 min 15 s.
- Los desafíos piden 6–8 min por tier.

## Versión 6.1 (16-11-2026): cascada de tinta al acabar un draft

- **Qué pediste:**
  - Que al acabar un draft caiga una cascada de tinta desde arriba al centro y manche todo el papel, menos las letras de los resultados.
  - Solo los datos esenciales y un botón al árbol, sin «best next upgrade».
- **Cómo está hecho:** `src/inkend.js` dibuja el chorro, la mancha que crece, las salpicaduras y los resultados en un canvas a pantalla completa.
- **Fuera:** el cuadro de resumen, la compra rápida (B) y `renderNext` / `buyBest`.

## Versión 7 (16-11-2026): columnas, tutoriales de era y una era por libro

- **Qué pediste:**
  - Quitar el libro y el selector de era de la barra de abajo.
  - Un tutorial como el inicial para cada era.
  - Un árbol con muchas menos mejoras pero más relevantes, muy visual y con sensación de progreso. Elegiste las columnas que se llenan de tinta.
- **Era por libro:** cada libro nuevo se escribe en la era más nueva abierta (`resetCycle`).
- **Tutoriales de era:** `EraTutorial` en `src/tutorial.js`. Nuevos ganchos del motor: `freezeBell`, `sendBug` y `placeWord` con `born` y la puntuación.
- **Árboles:**
  - De tinta: 29 mejoras en 8 columnas.
  - De Fama: 16 en 5 columnas.
  - El código: `src/treeview.js` (columnas) y `column()` en `data.js`.
- **Precios y ritmo:**
  - Los precios suben mucho de una fila a la siguiente.
  - Las eras cuestan 3 · 12 · 40 ★ y el Magnum Opus 1.500.
  - FAME_K = 110.000.
- **Partidas viejas:**
  - Las de las versiones 1–3 recuperan la tinta del libro en curso y la Fama de las mejoras que ya no existen.
  - Un fallo de esta versión rechazaba las de la versión 3. Se arregló, y ahora una partida que no se puede leer se guarda aparte (`…:save:unreadable`) en vez de perderse.

| Mecanógrafo | Primer ayudante | 1.ª publicación | Magnum Opus |
| --- | --- | --- | --- |
| 35 WPM | 4,5–5 min | 11–12 min | 1 h 50–52 |
| 55 WPM | 3,5 min | 8–9,5 min | 1 h 28–33 |
| 80 WPM | 3,5 min | 8,5 min | 1 h 10–13 |

- Con menos mejoras, los huecos sin comprar nada son más largos: hasta ~3 min a 35 WPM, justo antes de publicar.

## Versión 7.1 (16-11-2026): sin ayudantes

- **Qué pediste:** quitar los ayudantes por completo.
- **Qué se fue:**
  - La columna Helpers.
  - Loyal Helper (Fama).
  - El desafío Solo («sin ayudantes»), que ya no tenía sentido.
  - En el motor, todo lo que hacían los ayudantes.
- **Partidas viejas** (SAVE_VERSION 5):
  - Las de la versión 4 conservan sus mejoras y recuperan la tinta de la columna Helpers (menos el ayudante gratis de Loyal Helper) y la Fama de Loyal Helper.
  - Las de las versiones 1–3 siguen recuperando todo.
- **Ritmo:**
  - Los ayudantes daban mucha tinta al final, así que FAME_K pasa a 120.000 y el Magnum Opus a 1.000 ★.
  - Las metas de los desafíos bajan (1,5e8–2,6e8 × precio de la era).

| Mecanógrafo | 1.ª publicación | Era Future | Magnum Opus |
| --- | --- | --- | --- |
| 35 WPM | 10,5 min | 1 h 14 | 2 h 33 |
| 55 WPM | 7–8 min | 48–51 min | 1 h 38–52 |
| 80 WPM | 8 min | 43 min | 1 h 21 |

- El bot de «35 WPM» escribe de verdad a unos 25. Era el que más se apoyaba en los ayudantes, y ahora tarda más.
- Los desafíos piden 6–10 min por tier.

## Versión 8 (16-11-2026): app de escritorio y página de descarga

- **App (Electron 45):** Mac (.dmg, Apple Silicon) y Windows (instalador y portable), compiladas desde el Mac. Detalles en el README:
  - Funciona sin internet: las fuentes van dentro.
  - La partida se guarda en la carpeta de datos de la app.
  - F11 pone la pantalla completa.
- **Página de descarga:** elegiste el concepto A, «escribe para descargar», entre tres maquetas. Está en `site/`, con capturas reales, las cuatro eras y los pasos para abrir la app sin firma.
- **Sin publicar:** falta crear el repositorio, subir los instaladores a Releases y activar Pages. Se hará cuando lo pidas.
