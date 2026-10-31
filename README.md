# web-montar

Web de Mont.AR construida con Next.js y React: un recorrido narrativo en el que el scroll actúa como cabezal de reproducción de la ilustración animada.

```powershell
pnpm install --config.node-linker=hoisted
node node_modules/next/dist/bin/next dev --hostname 127.0.0.1
```

Con una instalación estándar de pnpm también están disponibles los scripts `pnpm dev` y `pnpm build`.

El sitio tiene dos páginas. El inicio (`/`, `src/components/home.tsx`) son pantallas en horizontal, como niveles de un jueguito (hero con tipeo, frase que se entinta, servicios como selección de personaje, proceso, sobre mí y cierre con el formulario), sobre un paisaje dibujado a mano que se desplaza con parallax. La página de contacto (`/contact`) es el recorrido 2.5D anterior; queda como respaldo y ya no se enlaza desde el inicio.

No usa librerías de animación. `src/components/home-scroll.tsx` convierte el scroll vertical en el avance de la pista: las pantallas con `data-hold` (`data-hold-wide` en desktop) se detienen un tramo y reciben su progreso (0–1) en la variable CSS `--p`, de la que `src/app/home.css` deriva los movimientos; entre pantallas el pase se completa solo, como un cambio de pantalla. Los enlaces a `#contact` (el botón "Hablemos") y el foco con teclado llevan el scroll a la pantalla que corresponde. Los proyectos están ocultos por ahora (`SHOW_PROJECTS` en `home.tsx`). El puntero animado de todo el sitio está en `src/components/site-cursor.tsx`.

El recorrido es una experiencia controlada por scroll con cuatro etapas: **01 Home, 02 Servicios, 03 Necesidad y 04 Proyecto**. El escenario se renderiza en vivo en 2.5D (`src/components/journey-render.tsx`): el motor del recorrido (`src/lib/journey-engine.js`) compone cada fotograma sobre las capas de la ilustración original (`public/journey/`) y Three.js lo apoya en un plano con relieve según un mapa de profundidad (`src/lib/journey-depth.ts`; cielo al fondo, sendero y arbustos adelante). La cámara se acerca y acompaña al explorador a lo largo del recorrido y responde al puntero, así que el paisaje gana paralaje real; unas motas de luz flotan entre el sendero y la cámara. Three.js y el motor se cargan aparte (mientras tanto se ve el póster de la etapa) y el render se pausa cuando la sección no está a la vista. Sin WebGL se dibuja el fotograma plano. El render nunca avanza solo: la sección queda fijada (`position: sticky`) y el scroll se ajusta (scroll-snap nativo) a una etapa por gesto. Cada etapa fija un destino en la animación y el cabezal la recorre hasta allí a velocidad de reproducción, hacia adelante o hacia atrás, así que entre dos vistas se ve todo el tramo del explorador. La etapa activa se deriva del destino, no del cabezal: el texto y el contador cambian casi al instante al elegir una etapa, mientras el explorador todavía recorre el tramo. La navegación inferior y los botones llevan el scroll a la etapa elegida y el cabezal recorre la animación desde el punto actual (un salto largo dura como mucho unos 3,6 s). Los textos son HTML y permanecen en el DOM; al cambiar de etapa solo cambia cuál está activa.

Los tres hitos de la ilustración marcan las transiciones, en el fotograma en que el explorador toca cada objeto:

| Transición | Hito | Aproximación | Contacto (cambio de etapa) | Guardado en la mochila / activación |
| --- | --- | --- | --- | --- |
| Home → Servicios | engranaje | 1,95 s · f117 | 2,80 s · f168 | 3,25 s · f195 |
| Servicios → Necesidad | nodos | 5,20 s · f312 | 6,05 s · f363 | 6,50 s · f390 |
| Necesidad → Proyecto | interfaz de la cima | 9,90 s · f594 | 10,80 s · f648 | 10,95 s · f657 |

(fotogramas a 60 fps del máster). Los tiempos viven en un único archivo, `src/lib/journey-timeline.json`, que usan tanto el motor (en la web y en la exportación del video) como la configuración (`src/lib/journey-config.ts`, donde también se ajustan el alto de scroll por etapa y la velocidad de reproducción).

El contador inferior (`01 / 04 — Home`…) funciona también como navegación entre etapas. Elegir una tarjeta lleva a la etapa siguiente y precarga la respuesta en el formulario. El botón principal lleva directamente al formulario y el enlace secundario abre WhatsApp. El formulario envía el proyecto a `/api/contact`, que entrega el correo mediante Resend. En pantallas verticales la cámara acompaña al explorador. Con `prefers-reduced-motion` la página pasa a una lectura secuencial: cuatro secciones con un fotograma fijo de cada etapa, sin render en vivo.

## Motor del recorrido

`tools/journey/` prepara las capas a partir de `tools/journey/reference/montar-reference.png` (la ilustración sin textos). La simulación y la composición de cada fotograma viven en `src/lib/journey-engine.js`, el mismo módulo que usa la web y que `build-html.mjs` incrusta en el HTML de exportación:

```powershell
node tools/journey/prepare-layers.mjs   # placas limpias, poses del explorador y máscara del cielo → tools/journey/layers/
node tools/journey/publish-layers.mjs   # copia las capas a public/journey/ para el render en vivo (la placa, en WebP)
node tools/journey/build-html.mjs       # out/montar-explorer-journey.html (autocontenido, sin red)
node tools/journey/render-server.mjs    # vista previa en http://127.0.0.1:4317/
```

El HTML incluye la vista previa fotograma a fotograma, la exportación MP4 (WebCodecs, 1600×900, 60 fps, 720 fotogramas) y la hoja de contactos. Los resultados están en `out/`: `montar-explorer-journey.mp4` (máster) y `montar-explorer-contact-sheet.png`. La web ya no usa el video; de ahí salen los pósters de cada etapa (`public/video/montar-journey-poster-*.webp`) que se muestran mientras carga el render y en la lectura con movimiento reducido.

## Paisaje del inicio

`src/lib/hero-sunset.js` dibuja el atardecer entero en código, como tinta y gouache sobre papel (sin imágenes ni librerías): cielo, sol que late, nubes, cordilleras, ciudad con ventanas que titilan, río, cerro con sendero, pasto y luciérnagas. Todo es función pura del tiempo en un loop de 60 s; el trazo "hierve" a 8 cuadros por segundo rotando 3 dibujos, y por eso cada plano estático se prerenderiza en sus variantes y por cuadro solo se dibuja lo que se mueve. La cámara sigue el avance de las pantallas (`setPan`) y cada plano se mueve a su velocidad. `src/components/home-hero-scene.tsx` lo monta y saca el loader cuando dibujó el primer cuadro; con `prefers-reduced-motion` queda un cuadro fijo.

```bash
node tools/hero-sunset/build.mjs   # tools/hero-sunset/hero-sunset.html: demo autocontenida para probar el paisaje solo
```

## Contenido

`content.json` es la fuente de los textos, las opciones del recorrido, la dirección de contacto y los metadatos de la página. Conserva la clave `seccions` del formato solicitado (el recorrido de `/contact`); la clave `inicio` tiene los textos de la página de inicio. Los proyectos se cargan en `inicio.proyectos.lista` (`servicios` con los valores de la lista de servicios, `imagen` y `link` opcionales); si la lista queda vacía, la sección no se muestra. Las opciones de "En qué punto estoy" tienen un `title` (tarjeta del recorrido y valor que se envía) y una `opcion`, la frase clara que muestra el formulario y el correo. El archivo `src/lib/content.ts` tipa las secciones para usarlas desde los componentes y el servidor.

## Indexación

`src/app/robots.ts` publica `/robots.txt` (permite todo salvo `/api/`) y `src/app/sitemap.ts` publica `/sitemap.xml` con el inicio y `/contact`. Los títulos, la descripción, las palabras clave, Open Graph y Twitter Card se generan en `src/app/layout.tsx` a partir de `seo` en `content.json`, junto con los datos estructurados schema.org (sitio, negocio y servicios) y la imagen `public/og/montar-og.jpg`. El origen canónico es `https://montivero.ar`; se puede cambiar con `SITE_URL` sin editar el contenido.

## Envío de correo

La integración usa la [API de Resend](https://resend.com/docs/api-reference/emails/send-email). Para activarla:

1. Crear una clave de API en Resend y [verificar el dominio remitente](https://resend.com/docs/dashboard/domains/introduction).
2. Copiar `.env.example` a `.env.local`.
3. Completar `RESEND_API_KEY`, `CONTACT_FROM_EMAIL` y, si corresponde, `CONTACT_TO_EMAIL`.
4. Configurar las mismas variables en el entorno donde se despliegue Next.js.

El destinatario predeterminado es `fabricio@montivero.ar` desde `content.json`; `CONTACT_TO_EMAIL` permite cambiarlo sin tocar el contenido público. La clave queda en el servidor y `.env.local` está excluido de Git. El formulario valida los datos en el servidor y solo confirma el envío cuando Resend acepta el mensaje. Sin clave o remitente configurados, muestra un error y no afirma que se haya enviado.
