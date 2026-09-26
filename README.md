# web-montar

Hero interactivo Mont.AR construido con Next.js, React, Three.js y GSAP. La imagen de referencia no se sirve ni se usa como fondo: el hero combina dibujo en canvas y assets transparentes independientes, animados en capas.

```powershell
pnpm install --config.node-linker=hoisted
node node_modules/next/dist/bin/next dev --hostname 127.0.0.1
```

Con una instalación estándar de pnpm también están disponibles los scripts `pnpm dev` y `pnpm build`.

El hero tiene tres avances por scroll: automatizaciones, sistemas y webs. Los iconos también permiten navegar directamente. El movimiento se reduce cuando el sistema lo solicita. El botón principal abre un email a Fabricio y el enlace secundario abre WhatsApp.

Las nubes, la cordillera, el río, el sendero y tres posturas del explorador son PNG transparentes en `public/art/`, generados con ImageGen a partir de la referencia. La cordillera queda fija, las nubes se desplazan horizontalmente y el explorador alterna los pies durante cada avance con GSAP. `src/components/scene-art.ts` dibuja el sol, la ciudad, los reflejos móviles del río y el parpadeo de luces urbanas. El texto tiene una entrada única al cargar la página. Las posiciones de las luces urbanas se trazaron desde la referencia a `src/components/city-lights.ts`; para regenerarlas se puede ejecutar `node tools/trace-city-lights.mjs` desde este directorio.
