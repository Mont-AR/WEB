# web-montar

Hero interactivo Mont.AR construido con Next.js, React, Three.js y GSAP. El paisaje se dibuja por código en canvas a baja resolución; la imagen de referencia no se sirve ni se usa como fondo.

```powershell
pnpm install --config.node-linker=hoisted
node node_modules/next/dist/bin/next dev --hostname 127.0.0.1
```

Con una instalación estándar de pnpm también están disponibles los scripts `pnpm dev` y `pnpm build`.

El hero tiene tres avances por scroll: automatizaciones, sistemas y webs. Los iconos también permiten navegar directamente. El movimiento se reduce cuando el sistema lo solicita. El botón principal abre un email a Fabricio y el enlace secundario abre WhatsApp.

La ilustración se define en `src/components/scene-art.ts`: nubes, relieve, ciudad, río, sendero y personaje son capas separadas que pueden moverse. Las posiciones de las luces urbanas se trazaron desde la referencia a `src/components/city-lights.ts`; para regenerarlas desde el archivo original se puede ejecutar `node tools/trace-city-lights.mjs` desde este directorio.
