// Genera los recursos de la animación del hero del inicio a partir de la placa de la ilustración.
//   node tools/journey/publish-hero.mjs
// - public/hero/plate-dark.webp: la placa con las ventanas de los pueblos apagadas.
// - public/hero/lights.png: solo los píxeles de las ventanas encendidas (recorte de los pueblos).
// - src/lib/hero-scene.json: rectángulo de cada ventana, origen del recorte y estrellas del cielo.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(ROOT, "..", "..");
const DEST = path.join(PROJECT, "public", "hero");

const plate = await sharp(path.join(ROOT, "layers", "plate.png")).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { data } = plate, W = plate.info.width, H = plate.info.height;

// Zonas de pueblo (coordenadas de la ilustración): arriba, el pueblo junto al río; abajo, la orilla
// izquierda. Fuera de ellas no se buscan ventanas (arbustos y reflejos del agua también brillan).
const ZONES = [{ x0: 500, y0: 605, x1: 1040, y1: 675 }, { x0: 105, y0: 695, x1: 580, y1: 790 }];
const inZone = (x, y) => ZONES.some((z) => x >= z.x0 && x < z.x1 && y >= z.y0 && y < z.y1);

// Una ventana es un punto chico mucho más claro que su entorno.
const lum = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) lum[i] = data[i * 3] * .3 + data[i * 3 + 1] * .59 + data[i * 3 + 2] * .11;
const mask = new Uint8Array(W * H);
for (const z of ZONES) for (let y = z.y0; y < z.y1; y++) for (let x = z.x0; x < z.x1; x++) {
  let s = 0, n = 0;
  for (let dy = -8; dy <= 8; dy += 2) for (let dx = -8; dx <= 8; dx += 2) { s += lum[(y + dy) * W + x + dx]; n++; }
  const i = y * W + x;
  if (lum[i] - s / n > 38 && lum[i] > 105) mask[i] = 1;
}
const seen = new Uint8Array(W * H), windows = [];
for (let i = 0; i < W * H; i++) {
  if (!mask[i] || seen[i]) continue;
  const stack = [i], px = []; seen[i] = 1;
  while (stack.length) {
    const j = stack.pop(); px.push(j);
    for (const d of [1, -1, W, -W]) if (mask[j + d] && !seen[j + d]) { seen[j + d] = 1; stack.push(j + d); }
  }
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (const j of px) { const x = j % W, y = (j / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  // las manchas grandes (luces principales, orillas) quedan encendidas en la placa
  if (px.length >= 4 && x1 - x0 < 14 && y1 - y0 < 12) windows.push({ px, x: x0 - 1, y: y0 - 1, w: x1 - x0 + 3, h: y1 - y0 + 3 });
}

// Píxeles de cada ventana más un píxel de borde (el halo que las rodea).
const lit = new Uint8Array(W * H);
for (const win of windows) for (const j of win.px) for (const d of [0, 1, -1, W, -W]) lit[j + d] = 1;

// Placa apagada: cada píxel de ventana toma el color medio (algo más oscuro) de su entorno sin luz.
const dark = Buffer.from(data);
for (let i = 0; i < W * H; i++) {
  if (!lit[i]) continue;
  const x = i % W, y = (i / W) | 0, sum = [0, 0, 0];
  let n = 0;
  for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
    const k = (y + dy) * W + x + dx;
    if (!lit[k] && !mask[k]) { sum[0] += data[k * 3]; sum[1] += data[k * 3 + 1]; sum[2] += data[k * 3 + 2]; n++; }
  }
  if (n) for (let c = 0; c < 3; c++) dark[i * 3 + c] = Math.round(sum[c] / n * .85);
}

// Recorte con las ventanas encendidas (transparente fuera de ellas).
const crop = { x: Math.min(...ZONES.map((z) => z.x0)) - 2, y: Math.min(...ZONES.map((z) => z.y0)) - 2 };
crop.w = Math.max(...ZONES.map((z) => z.x1)) + 2 - crop.x;
crop.h = Math.max(...ZONES.map((z) => z.y1)) + 2 - crop.y;
const atlas = Buffer.alloc(crop.w * crop.h * 4);
for (let y = 0; y < crop.h; y++) for (let x = 0; x < crop.w; x++) {
  const i = (crop.y + y) * W + crop.x + x;
  if (!lit[i]) continue;
  const o = (y * crop.w + x) * 4;
  atlas[o] = data[i * 3]; atlas[o + 1] = data[i * 3 + 1]; atlas[o + 2] = data[i * 3 + 2]; atlas[o + 3] = 255;
}

// Estrellas en pixel art sobre el cielo despejado (máscara de la ilustración).
const sky = await sharp(path.join(ROOT, "layers", "sky-mask.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let seed = 21;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const stars = [];
while (stars.length < 70) {
  const x = Math.round(rnd() * (W - 8)) + 4, y = Math.round(rnd() ** 1.4 * 300) + 4;
  if (y < sky.info.height && sky.data[(y * sky.info.width + x) * 4 + 3] > 200) stars.push([x, y, rnd() < .15 ? 2 : 1]);
}

await fs.rm(DEST, { recursive: true, force: true });
await fs.mkdir(DEST, { recursive: true });
await sharp(dark, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 92, effort: 6 }).toFile(path.join(DEST, "plate-dark.webp"));
await sharp(atlas, { raw: { width: crop.w, height: crop.h, channels: 4 } }).png({ compressionLevel: 9, palette: true }).toFile(path.join(DEST, "lights.png"));
await fs.writeFile(path.join(PROJECT, "src", "lib", "hero-scene.json"), JSON.stringify({
  width: W, height: H, atlas: { x: crop.x, y: crop.y },
  windows: windows.map((win) => [win.x, win.y, win.w, win.h]),
  stars,
}) + "\n");
console.log(`public/hero: ${windows.length} ventanas, ${stars.length} estrellas`);
