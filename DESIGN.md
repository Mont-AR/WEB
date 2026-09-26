# Diseño del hero Mont.AR

La referencia visual se reconstruye en capas independientes a una resolución lógica de 640 × 360 píxeles. El PNG original no forma parte de la web; tres recortes nuevos con transparencia, generados a partir de la referencia, se combinan con dibujo y animación por código.

## Capas

- **Three.js:** shader del cielo violeta y halo solar pulsante.
- **Canvas 2D:** estrellas, sol a franjas, ciudad, río y sendero. El río fluye y las luces urbanas parpadean.
- **Assets transparentes:** `public/art/cloud-bank.png`, `mountain-range.png` y `explorer.png`, generados con ImageGen a partir de la referencia. Las nubes y montañas se mueven a distintas profundidades con el puntero y los tres pasos del scroll.
- **Trazado de luces:** `tools/trace-city-lights.mjs` convierte solo las coordenadas y colores de las luces de la ciudad en datos TypeScript. El PNG original no se carga en la web.
- **Canvas frontal:** explorador transparente animado con GSAP entre el inicio y tres hitos.
- **HTML:** título, enlaces de contacto, iconos SVG navegables y contador del recorrido.

El scroll usa cuatro posiciones con `scroll-snap`: estado inicial y tres avances. El caminante se detiene en el último icono. En pantallas angostas se usa una ruta ligeramente adaptada para mantenerlo visible. `prefers-reduced-motion` inmoviliza la animación ambiental y los desplazamientos del personaje.

Paleta: azul noche, violeta, magenta y coral para el paisaje; cian luminoso para los iconos y las acciones; crema para el texto. La tipografía pixel se reserva para la identidad y los controles; el texto explicativo usa una fuente monoespaciada más legible.
