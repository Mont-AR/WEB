# Diseño del hero Mont.AR

## Ilustración animada controlada por scroll

El escenario es la ilustración original sin textos, animada en `tools/journey/` sin repintar el paisaje. El explorador de la ilustración se retira y en su lugar camina un explorador armado a partir del sprite de pie dibujado aparte con el mismo diseño (`tools/journey/reference/explorer/explorer-walk-idle.png`, fondo transparente), escalado para que la pantalla de la mochila mida lo mismo que en la ilustración y ajustado de color a la luz de la escena; así su borde no arrastra el entorno. El sprite se separa en partes articuladas (muslos, pantorrillas con botas, brazo y antebrazo cercanos, mano lejana, torso con cabeza y mochila): la marcha alterna las piernas con flexión de rodilla en el vuelo, el pie de apoyo se planta en el sendero (de ahí sale el rebote de la cadera, sin pies que patinen) y los brazos se balancean en contrafase. Al recoger cada herramienta extiende el brazo, la toma, la lleva a la mochila, se enciende su indicador y el brazo vuelve; en la cima cierra con un gesto de puño. Detrás de él y de los iconos que recoge se reconstruyen solo las zonas que quedan expuestas, con parches tomados de la misma ilustración. Las nubes se desplazan unos pocos píxeles enteros, titilan las luces del pueblo y la ruta turquesa se enciende delante del explorador.

El cielo estrellado es la única parte que no sigue el pixel art: las estrellas de la ilustración se retiran y se dibuja un cielo realista (más de mil estrellas pequeñas con brillo y color variados, unas pocas con halo, centelleo suave), visible solo en el cielo despejado, detrás de las nubes y desvanecido hacia el horizonte.

Máquina de estados (tiempos en `src/lib/journey-timeline.json`): `START` 0–0,35 s · `WALK` · `APPROACH` al engranaje · `COLLECT` 2,45–3,45 s · `ACCELERATE` · `WALK` · `APPROACH` a los nodos · `COLLECT` 5,70–6,70 s · `ACCELERATE` · `CLIMB` 7,10–9,90 s · `ARRIVE` · `VICTORY` 10,80–12 s. La simulación avanza en pasos fijos de 60 Hz con generadores pseudoaleatorios de semilla fija, así que cada fotograma es reproducible.

Paleta de efectos nuevos, tomada de la referencia: cian `#61f7e7`, cian claro `#3fe9de`, blanco turquesa `#e8fffb`, violeta `#b48cff`.

## Página

El texto vive en HTML sobre el video; la sección se fija con `position: sticky` y el scroll determina el fotograma y la etapa activa (Home, Servicios, Necesidad, Proyecto). Las etapas cambian con un fundido breve y reversible; el contador inferior también sirve de navegación. Seleccionar un servicio o punto de partida lo precarga en el formulario, y el botón principal lleva a la última etapa. El formulario envía los datos a una ruta de Next.js que entrega el correo mediante Resend. En pantallas verticales el encuadre del video acompaña al explorador. Con `prefers-reduced-motion` la página se lee en cuatro secciones sucesivas con un fotograma fijo de cada etapa.

Los textos visibles, las opciones y los datos públicos de contacto se editan desde `content.json`. La clave de Resend y el remitente se configuran como variables del servidor.

El texto del hero se revela una sola vez al aparecer, con un barrido escalonado de izquierda a derecha. Con movimiento reducido se muestra directamente.

Paleta: azul noche, violeta, magenta y coral para el paisaje; cian luminoso para los iconos y las acciones; crema para el texto. La tipografía pixel se reserva para la identidad y los controles; el texto explicativo usa una fuente monoespaciada más legible.
