# Incrementalography: diseño del juego

> Versión 2.0 del juego, del 16-11-2026: sin Fama ni renaceres; cada era tiene su árbol, su jefe y su trofeo. El plan y el ritmo medido están en `plan-eras-y-jefes.md`; la historia anterior, en `plan-incrementalography.md`.

## En una frase

Un incremental de mecanografía en inglés: atrapas tecleando las palabras que cruzan la página, compras el árbol de cada era y escribes su libro, un jefe con reglas propias, para pasar a la siguiente.

## Lo decidido

| | |
| --- | --- |
| Estilo | Cada era, su material (estilo A): pergamino y vela; papel de máquina sobre una mesa oscura; terminal de fósforo verde; cristal oscuro cian y magenta. Los huesos siguen siendo los de A Dark Room: etiquetas en minúscula, botones de 1 px, cajas con el título en el borde |
| Control | Solo teclado. La primera letra apunta a una palabra y el resto la atrapa; Esc la suelta |
| Draft | Termina al agotarse el recurso de la era (vela, cinta, batería o señal): baja 1 s por segundo y unos 1,4 s por fallo, y las palabras perfectas devuelven un poco |
| Moneda | Tinta, que vuelve a cero en cada era |
| Progreso | 10 mejoras por era; con todas, el libro (jefe). Ganarlo deja un trofeo para siempre y abre la era siguiente |
| Final | Tras el Eco: escena final y la segunda edición (Nueva partida+), con los trofeos, ×2 de tinta y palabras y libros más difíciles |
| Música | Solo en los jefes, compuesta en código (`music.js`) |
| Idioma | Solo inglés |

## Un draft

1. Las palabras entran por la derecha en 7 carriles y se escapan por la izquierda en ~11 s, sin castigo. Al empezar ya hay 5 en la página, y la primera letra de cada una es única.
2. Al teclear una letra apuntas a la palabra que empieza por ella (si hubiera dos, a la más cercana a escaparse). Se resalta y un subrayado marca la letra siguiente.
3. Un fallo no avanza la letra: rompe la racha y gasta Focus. Las teclas que no son letras (Shift, Tab, Retroceso) se ignoran, y el espacio solo cuenta dentro de una frase.
4. Al atrapar la palabra, salta a tu línea escrita (abajo), suelta «+N» y gotas hacia el contador, y suena una nota que sube con la racha.
5. **Valor** = letras × valor de la era × mejoras × (1 + racha).
   - Las palabras de la era (más oscuras, con subrayado dorado) valen ×2.
   - Las doradas (✦, del 3 al 8 %), ×5.
   - Las largas (7 caracteres o más) suben con Vocabulary.
6. **Racha:** +2 % por tecla correcta, hasta +100 % (Rhythm la sube). Un fallo la vacía, salvo los primeros con Steady Hand.
7. **Final del draft, la cascada de tinta** (`src/inkend.js`):
   - **La cascada:** un chorro de tinta cae desde arriba al centro de la pantalla, salpica y se extiende en una mancha irregular, con gotas por delante del borde, hasta cubrir la página entera (≈1,4 s).
   - **Los resultados son el papel que queda limpio:** se pintan en el color del papel solo donde ya hay tinta, así que aparecen a medida que la mancha llega a ellos.
   - **Solo lo esencial:** +tinta (sube contando), WPM, precisión y mejor racha, con una nota pequeña si hay récord o desafío superado. Debajo, un único botón, «upgrades».
   - **Teclas:** Enter va al árbol y espacio escribe otro draft (salvo en el primer draft del tutorial).
   - **En las eras oscuras** la tinta es blanca (luz) y los resultados, negros.
   - **Fuera del resumen:** la mejor compra, la compra rápida (B), «new draft», la comparación con el draft anterior y el desglose.

## Las eras

Cada era se juega entera: su árbol vacío y la tinta a cero al llegar, su libro al final. El primer draft en cada era nueva es guiado (las teclas y la mecánica de la era).

| Era | Recurso | Teclas | Mecánica del draft | Tinta por letra | Libro (jefe) | Trofeo |
| --- | --- | --- | --- | --- | --- | --- |
| Scriptorium | vela | minúsculas | Palabras iluminadas y doradas | ×1 | El Códice del Abad | Los fallos cuestan un 25 % menos |
| Typewriter | cinta | Mayúscula inicial, puntuación | La campanilla: Enter al final de cada línea | ×30 | El Cierre | +4 s en cada draft |
| Computer | batería | números y símbolos | Bugs que cambian letras por símbolos | ×500 | El Gusano | La racha empieza al 25 % |
| Future | señal | frases | Palabras tenues que valen más | ×60.000 | El Eco | La segunda edición |

La tinta por letra crece mucho de una era a otra para que cada era empiece por encima de donde acabó la anterior (×1,8 aproximadamente), aunque el árbol esté vacío.

## Los árboles (10 mejoras por era)

Una raíz (el tintero, abajo) y tres columnas de tres, todas de una sola compra. La segunda columna se abre tras 2 compras y la tercera tras 4. Encima de las columnas está **el libro**: una caja punteada que dice cuántas mejoras faltan y que, con todas compradas, se enciende («write the book · space»). El botón de abajo pasa de «new draft» a «write the book».

| Era | Raíz | Columna 1 | Columna 2 | Columna 3 |
| --- | --- | --- | --- | --- |
| Scriptorium | Sharp Quill ×2 | quill: ×2 · largas ×3 · Ink Splash | candle: +6 s · fallos a la mitad · Vigil (+0,5 s por palabra limpia) | gold: Illumination · Gold Leaf (doradas ×3 y ×2 de frecuentes) · Psalmody (racha ×2) |
| Typewriter | Fresh Ribbon ×2 | keys: racha ×2 · puntuación ×3 · tope de racha ×3 | carriage: bonus de línea ×3 · Quick Return · Full Page (cada 5 líneas, ×2 durante 5 s) | coffee: +6 s · Carbon Copy (25 % cuentan doble) · Correction Tape (+2 fallos gratis) |
| Computer | Mechanical Keyboard ×2 | code: ×2 · 8+ caracteres ×3 · Macro (cadenas) | debug: bugs ×3 · el doble de bugs · Patch (+1 s por bug) | memory: +6 s · Cache (+0,5 s) · Overclock (palabras un 20 % más rápidas, ×1,5) |
| Future | Neural Link ×2 | vision: tenues ×3 · Lucid (+1,5 s tenues) · Prophecy (frases ×3) | orbit: racha ×2 · In the Zone · Nova (cada 15ª palabra ×5) | signal: +6 s · fallos a la mitad · tope de racha ×3 |

Los precios están en `LADDER` (`data.js`) y salen de `sim/ladder.mjs`, que los calcula a partir de cuánto se quiere ahorrar para cada mejora.

### Que se sepa qué comprar

- **Asesor (`src/advisor.js`):** juega 8 drafts rápidos con un bot que escribe como tú, con y sin cada mejora, y con las mismas semillas. La ficha dice «+X % ink per draft, typing like you». Gold Leaf se calcula con la fórmula exacta, porque las doradas son raras.
- **Mejor compra:** «best buy · +X%» encima de la que más da por su precio.
- **Precio a la vista:** la tinta clara que sube por el tubo hacia la siguiente mejora.

## Los libros (jefes)

Comunes a los cuatro (`boss.js`):
- **Tu recurso** es el de la era y sale de tus estadísticas de draft, así que el árbol que compraste ayuda. Baja 1 s por segundo mientras haya algo que escribir; cada tecla buena devuelve un poco y cada pieza escrita, algo más. Cada fallo cuesta como en un draft.
- **Las páginas** (arriba a la derecha) son lo que falta por escribir. **Tres fases**, que cambian las reglas y suben la música.
- **Perder** te devuelve al árbol con la tinta escrita y baja la dificultad un 15 % por intento, hasta el 55 %. **Ganar** da el trofeo y la escena de la era siguiente.
- **Primer intento:** una nota explica qué hacer, hasta la segunda página.

| Libro | Reglas | Fase 2 | Fase 3 |
| --- | --- | --- | --- |
| El Códice del Abad | El Abad dicta versículos palabra a palabra y tú los copias, con los espacios. A oscuras: la luz es la de tu vela y se encoge al consumirse | La primera palabra de cada versículo es iluminada: un fallo la empieza de nuevo | El viento: el versículo se apaga a ratos y escribes de memoria |
| El Cierre | La portada, línea a línea, y Enter cuando suena la campanilla (o el carro se atasca). Un reloj marca los minutos hasta la rotativa de medianoche | El lápiz rojo del editor tacha una palabra que escribiste y hay que repetirla | La rotativa arrastra el papel: una línea sin acabar a tiempo se pierde |
| El Gusano | Un virus de trozos de código baja hacia tus archivos. Escribir un trozo lo rompe; su primer carácter lo elige. Si la cabeza llega a un archivo, se lo come | Se parte en dos | Letras corrompidas: se escriben como se ven |
| El Eco | Una máquina escribe la misma frase con su cursor magenta. Si acabas antes, la frase es tuya; si no, pierdes señal | Las palabras a las que aún no has llegado salen desordenadas | La frase se ve un momento y se borra |

**Dificultad medida** (`sim/bosses.mjs`): un bot de 55 WPM gana a la primera el 55–75 % de las veces; uno de 35 WPM pierde las primeras y gana hacia el tercer o cuarto intento.

## Ediciones (Nueva partida+)

Tras el Eco, la escena final (trofeos y estadísticas) ofrece la **edición II**:
- vuelves al Scriptorium con el árbol vacío y los cuatro trofeos;
- ×2 de tinta por edición;
- las palabras van un 10 % más rápido y son una letra más largas;
- los libros tienen un 20 % más de páginas.

## Música

`music.js` es un secuenciador pequeño con WebAudio. Cada jefe tiene su tema en bucle y cada fase añade capas y sube el tempo:
- **Abad:** bordón de órgano en re dórico y un canto; después, un tambor de marco; al final, campanas y una voz más aguda.
- **Cierre:** swing con contrabajo, ride y piano; después, escobillas y golpes de máquina; al final, metales y la campanilla.
- **Gusano:** chiptune con arpegios de onda cuadrada y bajo de triángulo; después, batería; al final, una melodía.
- **Eco:** synthwave con pads de sierra y bajo arpegiado; después, un bombo a negras y caja con cola; al final, un solo.

El volumen va aparte en Ajustes (Music).

## Juice (qué se siente al jugar)

Se eligió tras investigar: *The Art of Screenshake* (Vlambeer), *Juice it or lose it* (Jonasson y Purho), el diseño de ZType («cada tecla tiene que pesar») y un estudio que encontró que el texto de respuesta («Perfect», «Bang») junto con partículas da la mejor experiencia.

| Momento | Respuesta |
| --- | --- |
| Cada tecla | La letra salta y se rellena, con un toque propio de cada era: gotas de tinta (pluma), golpe de tipo hacia abajo (máquina), destello con chispas (ordenador) u onda (futuro). Una barra fina bajo la palabra se va llenando |
| Palabra atrapada | Estalla en sus letras, que vuelan a tu línea escrita; «+N» entra con rebote; gotas al contador, que sube rodando. Una nota sube con la racha |
| Lo especial | Avisos: «Golden!», «Illuminated!», «Debugged!», «Foresight ×2», «Splash!», «Chain ×N» y «Perfect» (palabras largas sin fallos). Hit-stop de 60–90 ms y temblor (desactivable) en las doradas, las iluminadas y el bonus de línea |
| Racha | Nombres al llegar a 25, 50, 100, 200 y 400 teclas: Steady, Fluent, Unstoppable, Legendary y Mythic, con acorde. Al fallar, la barra de racha se agrieta |
| In the Zone | Bordes dorados que laten, barra de racha con brillo y sonido propio |
| Focus bajo (< 25 %) | Latido de corazón y pulso rojo en los bordes y en la barra |
| Fin del draft | Las palabras caen y se apagan |
| Final del draft | Sonido de vertido; golpe y salpicadura cuando la tinta toca la página; la tinta sube contando con tics; un acorde si hay récord |
| Comprar | Anillo que se expande, chispas, texto flotante («+12% ink/draft») y tono que sube si compras seguido. Completar una mejora o comprar un nodo clave da una ráfaga mayor y un acorde. Los nodos nuevos aparecen con rebote |
| Libro escrito | La escena del trofeo (o la del final de la edición) con un acorde, y la era siguiente se enciende con su aspecto |

## Sonido

Todo se genera en el navegador:
- **Tecla según la era:** rasgueo de pluma, clac de máquina de escribir, teclado mecánico o sintetizador.
- **Atrapar:** una nota de escala pentatónica que sube con la racha.
- **Otros:** un golpe sordo al fallar, campanilla y retorno del carro, y un acorde al escribir un libro.

El volumen se ajusta en Ajustes.

## Ajustes

Tres grupos:
- **screen:** pantalla completa, tamaño de interfaz (solo en la app), tamaño de palabra y formato de los números.
- **effects:** volumen, temblor de pantalla y efectos tranquilos (`settings.calm`: sin chispas, sin letras volando y sin congelación en las capturas grandes).
- **play:** pausa al salir de la ventana (`settings.autoPause`, activada por defecto). Si dejas la ventana durante un borrador, se congela con un cartel «paused» y la primera tecla solo lo despierta.

La app de escritorio escala todo para que la ventana se vea como una de 1280×800, por el tamaño de interfaz que elijas.

## Para probar

- **En desarrollo:** `game.debug.bot(55)` hace que un bot teclee a 55 WPM (`bot(0)` lo quita).
- **Panel oculto:** `game.debug.step(5)` avanza 5 s aunque el panel esté oculto (también dentro de un jefe). También `give(n)` y `endRun()`.
- **Eras y jefes:** `game.debug.era('computer', 6)` salta a una era con 6 mejoras compradas; `book()` compra todo el árbol; `win()` y `lose()` acaban el libro.
- **Pausa:** `game.paused = true` congela el draft.

## Estilo (versión 4, del 16-11-2026)

La versión 3, de arte pintado con Figma, no gustó: tenía demasiadas imágenes y texturas y parecía hecha con IA. Se rehízo a partir de incrementales minimalistas reales, eligiendo entre tres maquetas: A Dark Room, Universal Paperclips y Prestige Tree.

- **Referencia: A Dark Room.**
  - Negro sobre blanco y una sola serifa (Georgia) para la interfaz, con todas las etiquetas en minúscula.
  - Botones con borde de 1 px y esquinas un poco redondeadas (5 px; la caja de la palabra del título, 7 px).
  - Cajas con el título sobre el borde: ficha de mejora, ventanas y desafíos.
  - Sin título ni registro en la pantalla de mejoras: arriba, las pestañas y lo que tienes; los avisos salen un momento bajo la barra superior (en un draft, abajo).
  - Iconos: Tabler Icons (contorno, licencia MIT), copiados a `src/icons.js` con `node scripts/icons.mjs`. Se quiso hacerlos en Figma, pero el plan Starter seguía sin llamadas.
  - La palabra «ink» es una gota en los contadores, el HUD, el resumen, las fichas y la barra de abajo.
  - **New draft:** un botón grande centrado justo encima de la barra de abajo. Se lanza también con el espacio, desde el árbol y desde el resumen (salvo en el primer resumen del tutorial). El espacio nunca pulsa la mejora que tenga el foco.
- **Eras:** Scriptorium y Typewriter en claro; Computer y Future con la luz apagada (blanco sobre negro, con una transición de 1,2 s). Cada era conserva su fuente para las palabras de la página.
- **Árbol** (se mantiene el árbol, a petición):
  - Cada mejora es un botón con borde, unido a las demás por líneas finas.
  - El relleno gris es lo que te acercas al precio; las comprables van en negrita.
  - Nivel máximo: doble borde. Nodo clave: borde de 2 px. Lo aún cerrado: borde discontinuo y tenue.
  - En cada caja, el nombre y, debajo, en cursiva, qué da un nivel. Debajo, un punto por nivel.
  - La mejor compra va marcada en cursiva encima.
  - Lo que aún no se ha descubierto es una cajita tenue con «?».
- **Página del draft:** lo tecleado va subrayado y lo que queda, en gris. Las palabras de la era van en cursiva; las doradas, en negrita con asterisco; la iluminada, con la capitular en una caja; las letras con bug, invertidas.
- **Juice:** se conserva todo (saltos de letras, estallidos, «+N», avisos, hit-stop, sonido), pero en tinta y sin brillos.
- **Pantalla de título:**
  - «incrementalography» se escribe solo, letra a letra, con un pulso irregular como el de una persona, y un cursor que parpadea.
  - Solo se entra tecleando la palabra (`begin` en una partida nueva, `continue` si ya hay progreso): sin clic y sin Enter. Debajo no hay ningún texto de ayuda.
  - La palabra está en una caja que no es un botón. Las letras sin escribir van muy claras y la siguiente un poco más oscura, para que se vea que hay que teclearlas. Cada letra correcta se pone en negro, se subraya y rellena la caja de gris; un cursor parpadea bajo la siguiente y, al completarla, la caja se invierte. Un fallo la reinicia y la hace temblar.
  - Usa la fuente y la luz de la era actual, y al fondo cruzan, muy tenues, ocho palabras de esa era.
  - `#play` en la dirección se la salta, para las pruebas.
- **Cursores** (SVG dentro del CSS, en negro o en blanco según la luz de la era):
  - Una flecha de tinta para lo normal.
  - Una plumilla de estilográfica, con su ranura y su agujero, sobre todo lo que se puede pulsar.
  - Una cruz de flechas al arrastrar el árbol.
  - Durante un draft el ratón se oculta.
- **Sin selección de texto:** nada se puede seleccionar, salvo los cuadros donde se copia o se pega una partida.

## Tutorial interactivo (primera partida)

La ventana de explicación del principio se quitó. Ahora se aprende jugando el primer draft, que empieza nada más teclear `begin`. Lo lleva `src/tutorial.js`; el recuadro y las indicaciones de las pantallas, `main.js`.

**Para centrar la atención** (pedido tras la primera versión):
- **Un recuadro arriba de la página**, con dos partes:
  - Arriba, en grande, **lo que hay que hacer**, con las teclas dibujadas como teclas (`type [i]`).
  - Debajo, en pequeño y gris, **por qué**.
  - Si te equivocas, el recuadro tiembla y el porqué pasa a decirte qué tecla toca.
- **Solo se ve lo que importa:** durante los pasos guiados, el HUD (era, tinta, WPM, Focus y racha) se apaga al 10 %. Solo se enciende lo que explica el paso, con un contorno discontinuo que late.
- **La tecla siguiente**, dentro de una caja que parpadea en la propia página: la primera letra de cada palabra mientras apuntas, y la siguiente letra de la que estás escribiendo.
- **Una pausa para leer:** antes de que empiece el reloj, el juego se para en la explicación del Focus hasta que pulsas espacio. Mientras tanto, las demás teclas no hacen nada.
- **Un foco fuera del draft:** en el árbol, el resto de la pantalla se lava de blanco y solo queda limpio lo que toca pulsar, con su etiqueta. Los clics siguen pasando a todo.
- **Un sonido suave** de dos notas en cada paso superado.

**Los pasos del draft:**
1. **Apuntar:** una sola palabra quieta, «ink»: `type [i]`.
2. **Terminar:** `now type [n][k]`, con las teclas que faltan, que se van quitando.
3. **Tres más:** aparecen «quill», «page» y «monk», muy lentas, en carriles que el recuadro no tapa. Se enciende el contador de tinta («every word you catch earns ink ↑») y tres casillas se van marcando.
4. **El Focus:** la página se vacía, se enciende solo la barra de Focus y el juego espera al espacio. Hasta aquí, ni el tiempo ni los fallos gastan Focus.
5. **A tu aire:** vuelve todo el HUD, empiezan a llegar palabras y aparece «catch as many words as you can» durante 3,5 s.

**Avisos que llegan cuando toca:** el primer fallo explica la racha, y al llegar a 20 de racha se explica su barra. Los dos señalan la barra fina durante 4 s, sin apagar el resto.

**Este draft no cuenta** para tu WPM ni tu precisión medios, porque se juega a trompicones.

**Después del draft:**
- **Final del primer draft:** la cascada de tinta ya centra la vista; la etiqueta «↑ spend your ink on upgrades» aparece bajo el botón «upgrades», y el espacio no lanza otro draft.
- **Árbol:** el foco va a la mejor compra (o la más barata), con su nota y «click … to buy it ↓». Si no llega la tinta, va a «new draft».
- **Tras comprar:** el foco pasa a «new draft». Al empezarlo, el tutorial termina.
- **Primera publicación:** solo una etiqueta sobre «publish», sin foco, porque llega con la partida ya en marcha.

**Datos y casos:**
- **Tinta del primer draft** (bot, 6 semillas): de 45 a 245 según la velocidad. Siempre llega para Sharp Quill (15) y Better Ink (40).
- **Partidas viejas:** quien ya había comprado algo o lleva 3 drafts no ve el tutorial.
