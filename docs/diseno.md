# Incrementalography: diseño del juego

> Versión 2, del 16-11-2026: añade el asesor de mejoras, los hitos, los nodos clave y el juice. El plan y el ritmo medido están en `plan-incrementalography.md`.

## En una frase

Un incremental de mecanografía en inglés: atrapas tecleando las palabras que cruzan la página y avanzas por las eras de la escritura publicando libros que te dan Fama.

## Lo decidido

| | |
| --- | --- |
| Estilo | Minimalista como A Dark Room (versión 4): negro sobre blanco, serifa en minúsculas, botones de 1 px que se rellenan, cajas con el título en el borde e iconos de línea. Las eras modernas apagan la luz (blanco sobre negro). Sin imágenes ni degradados |
| Control | Solo teclado. La primera letra apunta a una palabra y el resto la atrapa; Esc la suelta |
| Draft | Termina al vaciarse el Focus: baja 1 s por segundo y 1,4 s por fallo, y las palabras perfectas devuelven un poco, como mucho la mitad del inicial |
| Moneda | Tinta (Ink). Reinicio: publicar (Publish), que da Fama (★) |
| Final | Magnum Opus (escena con tus estadísticas) y desafíos con tiers sin fin |
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

## Eras (una por libro)

Cada libro se escribe en la era más nueva que tengas abierta; ya no se elige. El primer draft en cada era nueva es guiado, como el primero de la partida:
- **Typewriter:** una mayúscula (Shift), dos palabras con puntuación y la campanilla, que espera a que pulses Enter.
- **Computer:** una palabra con números y símbolos, y un bug que se mete en una palabra para que la atrapes (×3).
- **Future:** una frase entera y dos palabras tenues que hay que atrapar antes de que se vuelvan nítidas (×2).

El recuadro, el HUD apagado y la tecla marcada funcionan como en el primer draft. Mientras dura, no gasta Focus y la campanilla no caduca. Sustituye a la ventana de explicación y al cartel de la era.

| Era | Teclas | Mecánica | Valor por letra | Precio de las mejoras |
| --- | --- | --- | --- | --- |
| Scriptorium | minúsculas | Palabras iluminadas (nodo Illumination): grandes y lentas, ×4 y +1,5 s de Focus | ×1 | ×1 |
| Typewriter | Mayúscula inicial, puntuación, contracciones | Carro: cada 8 palabras suena la campanilla; Enter en 2,2 s da +50 % de la tinta de esa línea y +1,5 s | ×4 | ×2,5 |
| Computer | números y símbolos (file_2, v3.1, #tag…) | Bugs: corren hasta una palabra y cambian una letra por un símbolo parecido; esa palabra vale ×3 | ×16 | ×7 |
| Future | frases de 2–3 palabras con todo mezclado | Las palabras nuevas llegan tenues; atrapadas antes de volverse nítidas valen ×2 | ×64 | ×20 |

## Mejoras de tinta (se pierden al publicar)

Versión 5 del árbol (pedida con muchas menos mejoras, más relevantes, muy visual y con sensación de progreso). Se eligió entre dos maquetas, anillos o columnas, y ganaron las **columnas que se llenan de tinta**:

- **El tintero:** la primera mejora, **Sharp Quill** (×2 de tinta, 15), es una barra redondeada abajo que alimenta todas las columnas. Al comprarla se llena de tinta.
- **Columnas:** cada rama es una columna con sus mejoras de abajo arriba, unidas por un tubo:
  - Al comprar una mejora, el tubo se llena de tinta hasta ella.
  - Mientras ahorras para la siguiente, una tinta más clara sube hacia ella: cuánto te falta, de un vistazo.
  - Arriba de cada columna, su figura, su nombre y cuántas llevas («2/4»).
- **Pocas cosas a la vez:**
  - De cada columna se ve en grande solo la siguiente mejora. Las de encima son contornos punteados con el nombre en gris hasta que llegas.
  - Una columna que aún no se ha abierto es una línea punteada con «?», y su ficha dice cuántas compras faltan.
- **25 mejoras en total, unas 16 por libro**, cada una grande y fácil de entender. No hay ayudantes: toda la tinta la escribes tú.

  | Columna (figura) | De abajo arriba |
  | --- | --- |
  | Ink (círculo) | ×2 ink · long words ×3 · ×3 ink · **Ink Splash** (20 % salpican) |
  | Focus (cuadrado), desde las 2 compras | +6 s · clean words +0,5 s · mistakes cost half · **In the Zone** |
  | Streak (rombo), desde las 4 | streak fills ×2 · +2 free mistakes · streak cap ×3 · **Chain** |
  | Una por era (octógono) | Su mecánica en dos mejoras (iluminadas, campanilla, bugs, tenues) y su **Masterwork**: +50 % de Fama y ×2 de tinta en todas las eras |

- **Nodos clave, Masterworks y el tintero** llevan una segunda línea por dentro.
- **Al comprar:** la mejora salta y suelta un anillo, el tubo sube y la siguiente aparece.

### Que se sepa qué comprar

- **Asesor (`src/advisor.js`):** juega 8 drafts rápidos con un bot que escribe como tú (tu WPM y tu precisión recientes), con y sin el siguiente nivel de cada mejora, y con las mismas semillas, para que solo cambie la mejora. La ficha dice «+X % ink per draft, typing like you». Gilding se calcula con la fórmula exacta, porque las doradas son demasiado raras para medirlas en 8 drafts. Tarda ~0,3 ms por draft y va en trozos de 12 ms, así que la pantalla nunca se congela.
- **Mejor compra:** la mejora con más ganancia por precio lleva «best buy · +X%» encima y late. Solo en el árbol: el final del draft ya no la propone.
- **Precio a la vista:** la tinta clara que sube por el tubo hacia la siguiente mejora.
- **Ficha** (al pasar el ratón; ya no se queda fija al hacer clic):
  - En grande, qué hace; debajo, la explicación.
  - En las columnas de era, que solo funciona en esa era (las Masterworks valen en todas).
  - Lo que te da a ti y el precio. En las de más arriba, qué hay que comprar antes.

## Fama (permanente)

Las mismas columnas, alimentadas por **Pen Name** (tuya desde el principio):

| Columna | De abajo arriba | ★ |
| --- | --- | --- |
| Eras | Typewriter · Computer · Future · Magnum Opus | 3 · 12 · 40 · 1.000 |
| Readers | ×2 ink para siempre, tres veces | 2 · 15 · 120 |
| Acclaim (desde las 2 compras) | Fama ×1,5 · ×1,6 | 6 · 60 |
| Advance (desde las 2) | Empiezas cada libro con 5K · 1M de tinta | 4 · 60 |
| Craft (desde las 3) | Drafts con +50 % de racha · +5 s de Focus · Editor | 5 · 10 · 6 |

## Desafíos

Cada desafío es un libro con una regla. Empezarlo publica el libro actual. La meta es tinta en ese libro (× el precio de su era) y crece ×3 por tier.

| Desafío | Regla | Premio por tier |
| --- | --- | --- |
| Perfectionist | Un fallo acaba el draft | Tope de racha +50 % |
| Long Words | Solo palabras de 7 o más | Palabras largas ×1,5 |
| Sprint | El Focus baja el doble | +2,5 s de Focus |
| Blackout | Las letras se ocultan al empezar la palabra | Fama ×1,3 y tinta ×1,2 |

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
| Publicar | «Published» se estampa en grande y las estrellas vuelan al contador de Fama |

## Sonido

Todo se genera en el navegador:
- **Tecla según la era:** rasgueo de pluma, clac de máquina de escribir, teclado mecánico o sintetizador.
- **Atrapar:** una nota de escala pentatónica que sube con la racha.
- **Otros:** un golpe sordo al fallar, campanilla y retorno del carro, y un acorde al publicar.

El volumen se ajusta en Ajustes.

## Para probar

- **En desarrollo:** `game.debug.bot(55)` hace que un bot teclee a 55 WPM (`bot(0)` lo quita).
- **Panel oculto:** `game.debug.step(5)` avanza 5 s aunque el panel esté oculto. También `give(n)`, `fame(n)` y `endRun()`.
- **Pausa:** `game.paused = true` congela el draft.

## Estilo (versión 4, del 16-11-2026)

La versión 3, de arte pintado con Figma, no gustó: tenía demasiadas imágenes y texturas y parecía hecha con IA. Se rehízo a partir de incrementales minimalistas reales, eligiendo entre tres maquetas: A Dark Room, Universal Paperclips y Prestige Tree.

- **Referencia: A Dark Room.**
  - Negro sobre blanco y una sola serifa (Georgia) para la interfaz, con todas las etiquetas en minúscula.
  - Botones con borde de 1 px y esquinas un poco redondeadas (5 px; la caja de la palabra del título, 7 px).
  - Cajas con el título sobre el borde: ficha de mejora, ventanas y desafíos.
  - Sin título ni registro en la pantalla de mejoras: arriba, las pestañas y lo que tienes; los avisos salen un momento bajo la barra superior (en un draft, abajo).
  - Iconos: Tabler Icons (contorno, licencia MIT), copiados a `src/icons.js` con `node scripts/icons.mjs`. Se quiso hacerlos en Figma, pero el plan Starter seguía sin llamadas.
  - La palabra «ink» es una gota y «fame» una estrella, en los contadores, el HUD, el resumen, las fichas y la barra de abajo.
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
