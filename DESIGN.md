# Diseño del hero Mont.AR

La referencia visual se reconstruye con código a una resolución lógica de 640 × 360 píxeles. El render se amplía con `image-rendering: pixelated`; el PNG original no forma parte de la web.

## Capas

- **Three.js:** shader del cielo violeta y halo solar pulsante.
- **Canvas 2D:** estrellas, nubes, sol a franjas, montañas, ciudad, río y sendero. Cada elemento se dibuja en coordenadas de escena.
- **Canvas frontal:** caminante dibujado por píxeles, animado con GSAP entre el inicio y tres hitos.
- **HTML:** título, enlaces de contacto, iconos SVG navegables y contador del recorrido.

El scroll usa cuatro posiciones con `scroll-snap`: estado inicial y tres avances. El caminante se detiene en el último icono. En pantallas angostas se usa una ruta ligeramente adaptada para mantenerlo visible. `prefers-reduced-motion` inmoviliza la animación ambiental y los desplazamientos del personaje.

Paleta: azul noche, violeta, magenta y coral para el paisaje; cian luminoso para el sendero y las acciones; crema para el texto. La tipografía pixel se reserva para la identidad y los controles; el texto explicativo usa una fuente monoespaciada más legible.
