# web-montar

Hero interactivo Mont.AR construido con Next.js, React, Three.js y GSAP. La imagen de referencia no se sirve ni se usa como fondo: el hero combina dibujo en canvas y assets transparentes independientes, animados en capas.

```powershell
pnpm install --config.node-linker=hoisted
node node_modules/next/dist/bin/next dev --hostname 127.0.0.1
```

Con una instalación estándar de pnpm también están disponibles los scripts `pnpm dev` y `pnpm build`.

El hero tiene tres avances por scroll: automatizaciones, sistemas y webs. Los iconos también permiten navegar directamente. El movimiento se reduce cuando el sistema lo solicita. El botón principal abre un email a Fabricio y el enlace secundario abre WhatsApp.

Las nubes, la cordillera y el explorador son assets PNG transparentes en `public/art/`, generados con ImageGen tomando la referencia original como guía. Las nubes y montañas se superponen con parallax suave de puntero y scroll; el explorador avanza con GSAP. `src/components/scene-art.ts` dibuja el sol, la ciudad, el río fluyente, el sendero sin luces y la vegetación. Las posiciones de las luces urbanas se trazaron desde la referencia a `src/components/city-lights.ts`; para regenerarlas se puede ejecutar `node tools/trace-city-lights.mjs` desde este directorio.
