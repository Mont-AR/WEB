// Genera tools/hero-sunset/hero-sunset.html: demo autocontenida (sin requests) del fondo del hero,
// con el módulo src/lib/hero-sunset.js incrustado y un título de prueba centrado.
// También expone window.draw(frame) / FRAMES / FPS para render.mjs del skill javascript-animation.
//   node tools/hero-sunset/build.mjs
import { readFileSync, writeFileSync } from "node:fs";

const source = readFileSync(new URL("../../src/lib/hero-sunset.js", import.meta.url), "utf8").replace(/^export /gm, "");

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Hero sunset</title>
<style>
  :root { --ease: cubic-bezier(.22, 1, .36, 1); color-scheme: dark; }
  html, body { margin: 0; height: 100%; background: #071139; }
  .hero { position: relative; height: 100vh; height: 100svh; overflow: hidden; }
  .title { position: absolute; inset: 0; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;
    padding: 0 20px; text-align: center; font: 700 clamp(26px, 6vw, 96px)/1.1 ui-monospace, Consolas, monospace;
    color: #fff; text-transform: uppercase; letter-spacing: .02em; text-shadow: 0 2px 18px rgba(7,17,57,.6); }
  .title small { font-size: .26em; color: #61f7e7; letter-spacing: .1em; }
</style>
</head>
<body>
<section class="hero" id="hero">
  <div class="title" id="title"><small>Título de prueba</small>Herramientas<br>digitales</div>
</section>
<script>
${source}
const params = new URLSearchParams(location.search);
if (params.has("render")) {
  // modo captura (render.mjs): un cuadro por llamada, sin loop ni entrada
  const scene = createHeroSunset(), canvas = document.createElement("canvas");
  canvas.width = 1920; canvas.height = 1080; canvas.style.width = "100%";
  const ctx = canvas.getContext("2d");
  document.body.replaceChildren(canvas);
  scene.resize(1920, 1080);
  window.FPS = 30; window.FRAMES = LOOP * 30;
  window.draw = (frame) => scene.draw(ctx, frame / window.FPS, 1);
  window.drawAt = (t, entry = 1, pan = 0) => scene.draw(ctx, t, entry, 0, 0, pan);
  window.draw(0);
} else {
  mountHero(document.getElementById("hero"));
}
</script>
</body>
</html>
`;
writeFileSync(new URL("./hero-sunset.html", import.meta.url), html);
console.log("tools/hero-sunset/hero-sunset.html", (html.length / 1024).toFixed(0), "KB");
