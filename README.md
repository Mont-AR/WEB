# web-montar

Web de Mont.AR construida con Next.js y React: pantallas en horizontal, como niveles de un jueguito, sobre un paisaje dibujado a mano en código.

```bash
pnpm install --config.node-linker=hoisted
node node_modules/next/dist/bin/next dev --hostname 127.0.0.1
```

Con una instalación estándar de pnpm también están disponibles los scripts `pnpm dev` y `pnpm build`.

El sitio es una sola página (`/`, `src/components/home.tsx`): hero con tipeo, frase que se entinta, servicios como selección de personaje, proceso, sobre mí y cierre con el formulario de contacto. La página de contacto anterior (`/contact`) redirige al formulario (`/#contact`, ver `next.config.ts`).

No usa librerías de animación. `src/components/home-scroll.tsx` convierte el scroll vertical en el avance de la pista: las pantallas con `data-hold` (`data-hold-wide` en desktop) se detienen un tramo y reciben su progreso (0–1) en la variable CSS `--p`, de la que `src/app/home.css` deriva los movimientos; entre pantallas el pase se completa solo, como un cambio de pantalla. Los enlaces a `#contact` (el botón "Hablemos") y el foco con teclado llevan el scroll a la pantalla que corresponde. Los proyectos están ocultos por ahora (`SHOW_PROJECTS` en `home.tsx`). El puntero animado de todo el sitio está en `src/components/site-cursor.tsx`.

## Paisaje

`src/lib/hero-sunset.js` dibuja el atardecer entero en código, como tinta y gouache sobre papel (sin imágenes ni librerías): cielo, sol que late, nubes, cordilleras, ciudad con ventanas que titilan, río, cerro con sendero, pasto y luciérnagas. Todo es función pura del tiempo en un loop de 60 s; el trazo "hierve" a 8 cuadros por segundo rotando 3 dibujos, y por eso cada plano estático se prerenderiza en sus variantes y por cuadro solo se dibuja lo que se mueve. La cámara sigue el avance de las pantallas (`setPan`) y cada plano se mueve a su velocidad. `src/components/home-hero-scene.tsx` lo monta y saca el loader cuando dibujó el primer cuadro; con `prefers-reduced-motion` queda un cuadro fijo.

```bash
node tools/hero-sunset/build.mjs   # tools/hero-sunset/hero-sunset.html: demo autocontenida para probar el paisaje solo
```

## Contenido

`content.json` es la fuente de los textos, la dirección de contacto y los metadatos de la página. La clave `inicio` tiene los textos de las pantallas; `seccions` conserva el formato solicitado y aporta el título del hero, la lista de servicios con sus nombres, las opciones de "En qué punto estoy" y los textos del formulario. Las opciones tienen un `title` (valor que se envía y se valida) y una `opcion`, la frase clara que muestran el formulario y el correo. Los proyectos se cargan en `inicio.proyectos.lista` (`servicios` con los valores de la lista de servicios, `imagen` y `link` opcionales). El archivo `src/lib/content.ts` tipa el contenido para usarlo desde los componentes y el servidor.

## Indexación

`src/app/robots.ts` publica `/robots.txt` (permite todo salvo `/api/`) y `src/app/sitemap.ts` publica `/sitemap.xml` con el inicio. Los títulos, la descripción, las palabras clave, Open Graph y Twitter Card se generan en `src/app/layout.tsx` a partir de `seo` en `content.json`, junto con los datos estructurados schema.org (sitio, negocio y servicios) y la imagen `public/og/montar-og.jpg` (el paisaje del inicio con el título, generado desde `src/lib/hero-sunset.js`). El origen canónico es `https://montivero.ar`; se puede cambiar con `SITE_URL` sin editar el contenido.

## Envío de correo

La integración usa la [API de Resend](https://resend.com/docs/api-reference/emails/send-email). Para activarla:

1. Crear una clave de API en Resend y [verificar el dominio remitente](https://resend.com/docs/dashboard/domains/introduction).
2. Copiar `.env.example` a `.env.local`.
3. Completar `RESEND_API_KEY`, `CONTACT_FROM_EMAIL` y, si corresponde, `CONTACT_TO_EMAIL`.
4. Configurar las mismas variables en el entorno donde se despliegue Next.js.

El destinatario predeterminado es `fabricio@montivero.ar` desde `content.json`; `CONTACT_TO_EMAIL` permite cambiarlo sin tocar el contenido público. La clave queda en el servidor y `.env.local` está excluido de Git. El formulario valida los datos en el servidor y solo confirma el envío cuando Resend acepta el mensaje. Sin clave o remitente configurados, muestra un error y no afirma que se haya enviado.
