# Diseño del hero Mont.AR

La referencia visual se reconstruye en capas independientes. El explorador conserva una resolución lógica de 640 × 360 píxeles; la ciudad y las estrellas usan la resolución de pantalla. El PNG original no forma parte de la web; los recortes con transparencia se combinan con dibujo y animación por código.

## Capas

- **Three.js:** shader del cielo violeta.
- **Sol CSS:** disco circular con franjas y halo pulsante; `aspect-ratio: 1` evita la deformación al cambiar el viewport.
- **Canvas de estrellas:** puntos luminosos a resolución de pantalla con tamaños y brillos variables, separados del pixel art del paisaje.
- **Canvas de ciudad:** dos grupos lejanos de edificios bajos forman una silueta oscura en el valle; algunas ventanas cálidas parpadean suavemente.
- **Río SVG:** una curva estrecha y estática en tonos violeta y azul, con pocos reflejos discretos.
- **Assets transparentes:** `public/art/cloud-bank.png`, `mountain-range.png`, `trail.png` y cinco posturas `explorer*.png`, generados a partir de la referencia. La cordillera permanece fija; las nubes se desplazan solo en horizontal.
- **Resolución adaptable:** paisaje y explorador ofrecen tamaños pequeño, original y grande. Las imágenes del paisaje usan `srcSet`/`sizes`; el canvas del explorador elige según ancho físico de pantalla. `tools/build-responsive-art.mjs` genera las variantes WebP sin pérdida.
- **Sendero:** se muestra completo, incluidos los arbustos de su izquierda, sin máscara de recorte ni arbusto superpuesto.
- **Trazado de luces:** `tools/trace-city-lights.mjs` convierte solo las coordenadas y colores de las luces de la ciudad en datos TypeScript. El PNG original no se carga en la web.
- **Canvas frontal:** el explorador avanza con GSAP entre el inicio y tres hitos y alterna cinco posturas de pies durante cada trayecto.
- **HTML:** título, enlace de contacto, iconos SVG navegables, tarjetas de servicios y punto de partida, formulario y contador del recorrido.

El scroll usa cuatro posiciones con `scroll-snap`: estado inicial y tres avances. El caminante se detiene en el último hito. En escritorio, los iconos abren el contenido de cada paso; en móvil se ocultan y el recorrido sigue mediante scroll, tarjetas y botón principal. Seleccionar un servicio o punto de partida lo precarga en el formulario. El botón principal lleva al último paso. El formulario envía los datos a una ruta de Next.js que entrega el correo mediante Resend. En pantallas angostas se usa una ruta ligeramente adaptada para mantener al explorador visible. `prefers-reduced-motion` inmoviliza la animación ambiental y los desplazamientos del personaje.

Los textos visibles, las opciones y los datos públicos de contacto se editan desde `content.json`. La clave de Resend y el remitente se configuran como variables del servidor.

El texto del hero se revela una sola vez al aparecer, con un barrido escalonado de izquierda a derecha. Con movimiento reducido se muestra directamente.

Paleta: azul noche, violeta, magenta y coral para el paisaje; cian luminoso para los iconos y las acciones; crema para el texto. La tipografía pixel se reserva para la identidad y los controles; el texto explicativo usa una fuente monoespaciada más legible.
