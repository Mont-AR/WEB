# web-montar

Web de Mont.AR construida con Next.js y React: un recorrido narrativo en el que el scroll actúa como cabezal de reproducción de la ilustración animada.

```powershell
pnpm install --config.node-linker=hoisted
node node_modules/next/dist/bin/next dev --hostname 127.0.0.1
```

Con una instalación estándar de pnpm también están disponibles los scripts `pnpm dev` y `pnpm build`.

El recorrido es una experiencia controlada por scroll con cuatro etapas: **01 Home, 02 Servicios, 03 Necesidad y 04 Proyecto**. El escenario se renderiza en vivo en 2.5D (`src/components/journey-render.tsx`): el motor del recorrido (`src/lib/journey-engine.js`) compone cada fotograma sobre las capas de la ilustración original (`public/journey/`) y Three.js lo apoya en un plano con relieve según un mapa de profundidad (`src/lib/journey-depth.ts`; cielo al fondo, sendero y arbustos adelante). La cámara se acerca y acompaña al explorador a lo largo del recorrido y responde al puntero, así que el paisaje gana paralaje real; unas motas de luz flotan entre el sendero y la cámara. Sin WebGL se dibuja el fotograma plano. El render nunca avanza solo: la sección queda fijada (`position: sticky`) y el scroll se ajusta (scroll-snap nativo) a una etapa por gesto. Cada etapa fija un destino en la animación y el cabezal la recorre hasta allí a velocidad de reproducción, hacia adelante o hacia atrás, así que entre dos vistas se ve todo el tramo del explorador. La etapa activa se deriva del mismo cabezal: el texto cambia cuando el explorador toca cada hito, y render, textos y contador se mantienen sincronizados. La navegación inferior y los botones llevan el scroll a la etapa elegida y el cabezal recorre la animación desde el punto actual (un salto largo dura como mucho unos 3,6 s). Los textos son HTML y permanecen en el DOM; al cambiar de etapa solo cambia cuál está activa.

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
node tools/journey/publish-layers.mjs   # copia las capas a public/journey/ para el render en vivo
node tools/journey/build-html.mjs       # out/montar-explorer-journey.html (autocontenido, sin red)
node tools/journey/render-server.mjs    # vista previa en http://127.0.0.1:4317/
```

El HTML incluye la vista previa fotograma a fotograma, la exportación MP4 (WebCodecs, 1600×900, 60 fps, 720 fotogramas) y la hoja de contactos. Los resultados están en `out/`: `montar-explorer-journey.mp4` (máster) y `montar-explorer-contact-sheet.png`. La web ya no usa el video; de ahí salen los pósters de cada etapa (`public/video/montar-journey-poster-*.webp`) que se muestran mientras carga el render y en la lectura con movimiento reducido.

## Contenido

`content.json` es la fuente de los textos, las opciones del recorrido, la dirección de contacto y los metadatos de la página. Conserva la clave `seccions` del formato solicitado. El archivo `src/lib/content.ts` tipa las secciones para usarlas desde los componentes y el servidor.

## Indexación

`src/app/robots.ts` publica `/robots.txt` (permite todo salvo `/api/`) y `src/app/sitemap.ts` publica `/sitemap.xml` con la home. Los títulos, la descripción, las palabras clave, Open Graph y Twitter Card se generan en `src/app/layout.tsx` a partir de `seo` en `content.json`, junto con los datos estructurados schema.org (sitio, negocio y servicios) y la imagen `public/og/montar-og.jpg`. El origen canónico es `https://montivero.ar`; se puede cambiar con `SITE_URL` sin editar el contenido.

## Envío de correo

La integración usa la [API de Resend](https://resend.com/docs/api-reference/emails/send-email). Para activarla:

1. Crear una clave de API en Resend y [verificar el dominio remitente](https://resend.com/docs/dashboard/domains/introduction).
2. Copiar `.env.example` a `.env.local`.
3. Completar `RESEND_API_KEY`, `CONTACT_FROM_EMAIL` y, si corresponde, `CONTACT_TO_EMAIL`.
4. Configurar las mismas variables en el entorno donde se despliegue Next.js.

El destinatario predeterminado es `fabricio@montivero.ar` desde `content.json`; `CONTACT_TO_EMAIL` permite cambiarlo sin tocar el contenido público. La clave queda en el servidor y `.env.local` está excluido de Git. El formulario valida los datos en el servidor y solo confirma el envío cuando Resend acepta el mensaje. Sin clave o remitente configurados, muestra un error y no afirma que se haya enviado.
