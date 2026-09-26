# web-montar

Hero interactivo Mont.AR construido con Next.js, React, Three.js y GSAP. La imagen de referencia no se sirve ni se usa como fondo: el hero combina dibujo en canvas y assets transparentes independientes, animados en capas.

```powershell
pnpm install --config.node-linker=hoisted
node node_modules/next/dist/bin/next dev --hostname 127.0.0.1
```

Con una instalación estándar de pnpm también están disponibles los scripts `pnpm dev` y `pnpm build`.

El hero tiene tres avances por scroll: servicios, punto de partida y formulario de proyecto. En escritorio los iconos también permiten navegar directamente; en móvil se ocultan para despejar el paisaje. Elegir una tarjeta avanza al siguiente paso y precarga la respuesta en el formulario. El botón principal lleva directamente al formulario y el enlace secundario abre WhatsApp. El formulario envía el proyecto a `/api/contact`, que entrega el correo mediante Resend. El movimiento se reduce cuando el sistema lo solicita.

## Contenido

`content.json` es la fuente de los textos, las opciones del recorrido, la dirección de contacto y los metadatos de la página. Conserva la clave `seccions` del formato solicitado. El archivo `src/lib/content.ts` tipa las secciones para usarlas desde los componentes y el servidor.

## Envío de correo

La integración usa la [API de Resend](https://resend.com/docs/api-reference/emails/send-email). Para activarla:

1. Crear una clave de API en Resend y [verificar el dominio remitente](https://resend.com/docs/dashboard/domains/introduction).
2. Copiar `.env.example` a `.env.local`.
3. Completar `RESEND_API_KEY`, `CONTACT_FROM_EMAIL` y, si corresponde, `CONTACT_TO_EMAIL`.
4. Configurar las mismas variables en el entorno donde se despliegue Next.js.

El destinatario predeterminado es `fabricio@montivero.ar` desde `content.json`; `CONTACT_TO_EMAIL` permite cambiarlo sin tocar el contenido público. La clave queda en el servidor y `.env.local` está excluido de Git. El formulario valida los datos en el servidor y solo confirma el envío cuando Resend acepta el mensaje. Sin clave o remitente configurados, muestra un error y no afirma que se haya enviado.

Las nubes, la cordillera, el sendero y cinco posturas del explorador son PNG transparentes en `public/art/`, generados a partir de la referencia. La cordillera queda fija, las nubes se desplazan horizontalmente y el explorador alterna los pies durante cada avance con GSAP. El sol es un círculo CSS independiente que conserva su proporción en cualquier pantalla. `src/components/city-layer.tsx` dibuja una ciudad lejana con luces cálidas que parpadean; `src/components/river-layer.tsx` dibuja un río angosto y estático. El texto tiene una entrada única al cargar la página. Las posiciones de las luces urbanas se trazaron desde la referencia a `src/components/city-lights.ts`; para regenerarlas se puede ejecutar `node tools/trace-city-lights.mjs` desde este directorio.

El sendero conserva los arbustos de su lado izquierdo porque se muestra sin máscara de recorte. Las estrellas se dibujan en un canvas independiente a resolución de pantalla, con puntos suaves y halos tenues.

Los assets del paisaje y el explorador tienen variantes pequeñas, originales y grandes en `public/art/`. Cada imagen del paisaje declara `srcSet` y `sizes` para que el navegador elija según el ancho y la densidad de píxeles del dispositivo; el canvas del explorador selecciona el nivel con el mismo criterio. Las variantes se regeneran con `node tools/build-responsive-art.mjs`.
