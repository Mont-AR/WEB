# Diseño del hero Mont.AR

## Ilustración animada controlada por scroll

El escenario es la ilustración original sin textos, animada en `tools/journey/` sin repintar el paisaje: el explorador se recorta de la imagen y se articula (cabeza, torso, mochila, brazo y piernas); detrás de él y de los iconos que recoge se reconstruyen solo las zonas que quedan expuestas, con parches tomados de la misma ilustración. Las nubes se desplazan unos pocos píxeles enteros, titilan algunas estrellas y luces del pueblo, y la ruta turquesa se enciende delante del explorador. El fotograma 0 coincide con la referencia.

Máquina de estados (tiempos en `src/lib/journey-timeline.json`): `START` 0–0,35 s · `WALK` · `APPROACH` al engranaje · `COLLECT` 2,45–3,45 s · `ACCELERATE` · `WALK` · `APPROACH` a los nodos · `COLLECT` 5,70–6,70 s · `ACCELERATE` · `CLIMB` 7,10–9,90 s · `ARRIVE` · `VICTORY` 10,80–12 s. La simulación avanza en pasos fijos de 60 Hz con generadores pseudoaleatorios de semilla fija, así que cada fotograma es reproducible.

Paleta de efectos nuevos, tomada de la referencia: cian `#61f7e7`, cian claro `#3fe9de`, blanco turquesa `#e8fffb`, violeta `#b48cff`.

## Página

El texto vive en HTML sobre el video; la sección se fija con `position: sticky` y el scroll determina el fotograma y la etapa activa (Home, Servicios, Necesidad, Proyecto). Las etapas cambian con un fundido breve y reversible; el contador inferior también sirve de navegación. Seleccionar un servicio o punto de partida lo precarga en el formulario, y el botón principal lleva a la última etapa. El formulario envía los datos a una ruta de Next.js que entrega el correo mediante Resend. En pantallas verticales el encuadre del video acompaña al explorador. Con `prefers-reduced-motion` la página se lee en cuatro secciones sucesivas con un fotograma fijo de cada etapa.

Los textos visibles, las opciones y los datos públicos de contacto se editan desde `content.json`. La clave de Resend y el remitente se configuran como variables del servidor.

El texto del hero se revela una sola vez al aparecer, con un barrido escalonado de izquierda a derecha. Con movimiento reducido se muestra directamente.

Paleta: azul noche, violeta, magenta y coral para el paisaje; cian luminoso para los iconos y las acciones; crema para el texto. La tipografía pixel se reserva para la identidad y los controles; el texto explicativo usa una fuente monoespaciada más legible.
