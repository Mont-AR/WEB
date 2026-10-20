// Prepara las capas animables a partir de la ilustración de referencia de MONT.AR.
// Todo se deriva de los píxeles originales: máscaras, placas limpias (inpainting por
// ejemplos, local y acotado) y recortes del explorador. Ejecutar desde web-montar:
//   node tools/journey/prepare-layers.mjs
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, "reference", "montar-reference.png");
const OUT = path.join(ROOT, "layers");

const { data: src, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, N = W * H;
const at = (x, y) => y * W + x;

// ---------------------------------------------------------------- máscaras
const newMask = () => new Uint8Array(N);
function polyMask(points) {
  const m = newMask();
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (const [x, y] of points) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(H - 1, Math.ceil(y1)); y++) {
    for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(W - 1, Math.ceil(x1)); x++) {
      let inside = false;
      const px = x + .5, py = y + .5;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [xi, yi] = points[i], [xj, yj] = points[j];
        if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) m[at(x, y)] = 1;
    }
  }
  return m;
}
const rectMask = (x0, y0, x1, y1) => polyMask([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
const or = (...ms) => { const m = newMask(); for (const s of ms) for (let i = 0; i < N; i++) m[i] |= s[i]; return m; };
const and = (a, b) => { const m = newMask(); for (let i = 0; i < N; i++) m[i] = a[i] & b[i]; return m; };
const not = (a) => { const m = newMask(); for (let i = 0; i < N; i++) m[i] = a[i] ? 0 : 1; return m; };
const minus = (a, b) => and(a, not(b));
function dilate(a, r) {
  let m = a;
  for (let k = 0; k < r; k++) {
    const n = new Uint8Array(m);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (m[at(x, y)]) continue;
      if ((x > 0 && m[at(x - 1, y)]) || (x < W - 1 && m[at(x + 1, y)]) || (y > 0 && m[at(x, y - 1)]) || (y < H - 1 && m[at(x, y + 1)])) n[at(x, y)] = 1;
    }
    m = n;
  }
  return m;
}
const erode = (a, r) => not(dilate(not(a), r));
const where = (fn) => { const m = newMask(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = at(x, y); if (fn(src[i * 3], src[i * 3 + 1], src[i * 3 + 2], x, y)) m[i] = 1; } return m; };
const count = (m) => { let c = 0; for (let i = 0; i < N; i++) c += m[i]; return c; };

function components(mask, minSize = 1) {
  const label = new Int32Array(N).fill(-1);
  const comps = [];
  const stack = [];
  for (let i = 0; i < N; i++) {
    if (!mask[i] || label[i] >= 0) continue;
    const id = comps.length;
    const c = { id, x0: W, y0: H, x1: 0, y1: 0, size: 0, sx: 0, sy: 0, pixels: [] };
    stack.push(i); label[i] = id;
    while (stack.length) {
      const p = stack.pop();
      const x = p % W, y = (p / W) | 0;
      c.size++; c.sx += x; c.sy += y; c.pixels.push(p);
      c.x0 = Math.min(c.x0, x); c.y0 = Math.min(c.y0, y); c.x1 = Math.max(c.x1, x); c.y1 = Math.max(c.y1, y);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const q = at(nx, ny);
        if (mask[q] && label[q] < 0) { label[q] = id; stack.push(q); }
      }
    }
    comps.push(c);
  }
  return { label, comps: comps.filter(c => c.size >= minSize) };
}

// ---------------------------------------------------------------- inpainting por ejemplos
// Rellena `fill` copiando parches de 2h+1 px tomados solo de píxeles originales permitidos
// (`allow`) dentro de un radio local, para conservar la textura y el tamaño de bloque.
function inpaint(rgb, fill, allow, { half = 4, radius = 56, label = "" } = {}) {
  const work = new Float32Array(rgb.length);
  for (let i = 0; i < rgb.length; i++) work[i] = rgb[i];
  const known = new Uint8Array(N), conf = new Float32Array(N);
  let x0 = W, y0 = H, x1 = 0, y1 = 0, remaining = 0;
  for (let i = 0; i < N; i++) {
    if (fill[i]) { remaining++; const x = i % W, y = (i / W) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    else { known[i] = 1; conf[i] = 1; }
  }
  if (!remaining) return work;
  // centros de origen válidos: parche completo dentro de la imagen, conocido y permitido
  const valid = new Uint8Array(N);
  const bx0 = Math.max(half, x0 - radius * 4 - half), by0 = Math.max(half, y0 - radius * 4 - half);
  const bx1 = Math.min(W - 1 - half, x1 + radius * 4 + half), by1 = Math.min(H - 1 - half, y1 + radius * 4 + half);
  for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
    let ok = 1;
    for (let dy = -half; dy <= half && ok; dy++) for (let dx = -half; dx <= half; dx++) { const q = at(x + dx, y + dy); if (!known[q] || !allow[q]) { ok = 0; break; } }
    valid[at(x, y)] = ok;
  }
  const todo = [];
  for (let i = 0; i < N; i++) if (fill[i]) todo.push(i);
  const area = (2 * half + 1) ** 2;
  let steps = 0;
  while (remaining > 0) {
    let best = -1, bestP = -1;
    for (const p of todo) {
      if (known[p]) continue;
      const x = p % W, y = (p / W) | 0;
      if (!((x > 0 && known[p - 1]) || (x < W - 1 && known[p + 1]) || (y > 0 && known[p - W]) || (y < H - 1 && known[p + W]))) continue;
      let c = 0, nk = 0, nx = 0, ny = 0, gx = 0, gy = 0, gm = 0;
      for (let dy = -half; dy <= half; dy++) { const yy = y + dy; if (yy < 0 || yy >= H) continue; for (let dx = -half; dx <= half; dx++) { const xx = x + dx; if (xx < 0 || xx >= W) continue; const q = at(xx, yy); c += conf[q]; nk += known[q]; if (known[q]) { nx += dx; ny += dy; } } }
      // Término de datos (Criminisi): prioriza bordes que llegan perpendiculares al frente,
      // para continuar crestas y contornos en lugar de rellenar en capas concéntricas.
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 1 || yy < 1 || xx >= W - 1 || yy >= H - 1) continue;
        const q = at(xx, yy);
        if (!known[q] || !known[q - 1] || !known[q + 1] || !known[q - W] || !known[q + W]) continue;
        const L = (k) => work[k * 3] * .3 + work[k * 3 + 1] * .59 + work[k * 3 + 2] * .11;
        const ix = (L(q + 1) - L(q - 1)) / 2, iy = (L(q + W) - L(q - W)) / 2;
        const m = ix * ix + iy * iy;
        if (m > gm) { gm = m; gx = ix; gy = iy; }
      }
      const nl = Math.hypot(nx, ny) || 1;
      const D = Math.abs(-gy * (nx / nl) + gx * (ny / nl)) / 255;
      const pr = (c / area) * (D + .08) + nk * 1e-5;
      if (pr > bestP) { bestP = pr; best = p; }
    }
    if (best < 0) throw new Error(`inpaint ${label}: sin frente de relleno (${remaining} px aislados)`);
    const px = best % W, py = (best / W) | 0;
    const offs = [];
    for (let dy = -half; dy <= half; dy++) for (let dx = -half; dx <= half; dx++) {
      const xx = px + dx, yy = py + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      offs.push([dx, dy, known[at(xx, yy)]]);
    }
    let bq = -1, bssd = Infinity;
    // Si no hay parches cerca (cielo cubierto de nubes), se amplía la búsqueda.
    for (let r = radius; bq < 0 && r <= radius * 4; r *= 2)
    for (let qy = Math.max(half, py - r); qy <= Math.min(H - 1 - half, py + r); qy++) {
      for (let qx = Math.max(half, px - r); qx <= Math.min(W - 1 - half, px + r); qx++) {
        const q = at(qx, qy);
        if (!valid[q]) continue;
        let ssd = ((qx - px) ** 2 + (qy - py) ** 2) * 1.5;
        for (const [dx, dy, k] of offs) {
          if (!k) continue;
          const a = at(px + dx, py + dy) * 3, b = at(qx + dx, qy + dy) * 3;
          const d0 = work[a] - work[b], d1 = work[a + 1] - work[b + 1], d2 = work[a + 2] - work[b + 2];
          ssd += d0 * d0 + d1 * d1 + d2 * d2;
          if (ssd >= bssd) break;
        }
        if (ssd < bssd) { bssd = ssd; bq = q; }
      }
    }
    if (bq < 0) throw new Error(`inpaint ${label}: sin parches de origen cerca de ${px},${py}`);
    const qx = bq % W, qy = (bq / W) | 0;
    const c = bestP;
    for (const [dx, dy, k] of offs) {
      if (k) continue;
      const a = at(px + dx, py + dy);
      if (!fill[a]) continue;
      const b = at(qx + dx, qy + dy);
      work[a * 3] = work[b * 3]; work[a * 3 + 1] = work[b * 3 + 1]; work[a * 3 + 2] = work[b * 3 + 2];
      known[a] = 1; conf[a] = c; remaining--;
    }
    steps++;
  }
  console.log(`  inpaint ${label}: ${steps} parches`);
  return work;
}

// ---------------------------------------------------------------- utilidades de salida
async function saveRGBA(name, rgba, w, h) {
  await sharp(Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength), { raw: { width: w, height: h, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(OUT, name));
}
async function saveRGB(name, rgb) {
  const b = Buffer.alloc(N * 3);
  for (let i = 0; i < N * 3; i++) b[i] = Math.max(0, Math.min(255, Math.round(rgb[i])));
  await sharp(b, { raw: { width: W, height: H, channels: 3 } }).png({ compressionLevel: 9 }).toFile(path.join(OUT, name));
}
function bbox(mask) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mask[at(x, y)]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
// Recorte RGBA: color y alfa por píxel (colorFn devuelve [r,g,b,a] o null)
async function saveSprite(name, box, colorFn) {
  const rgba = new Uint8ClampedArray(box.w * box.h * 4);
  for (let y = 0; y < box.h; y++) for (let x = 0; x < box.w; x++) {
    const v = colorFn(box.x + x, box.y + y);
    if (!v) continue;
    rgba.set(v.map(n => Math.max(0, Math.min(255, Math.round(n)))), (y * box.w + x) * 4);
  }
  await saveRGBA(name, rgba, box.w, box.h);
  return { file: name, ...box };
}
const lum = (i) => Math.max(src[i * 3], src[i * 3 + 1], src[i * 3 + 2]);

await fs.mkdir(OUT, { recursive: true });
const meta = { width: W, height: H };

// ---------------------------------------------------------------- explorador
// Silueta trazada sobre la referencia (coordenadas de la imagen original 1672×941).
const E = (pts) => pts.map(([x, y]) => [x + 1050, y + 555]);
const silhouette = polyMask(E([
  [48, 24], [55, 14], [65, 10], [85, 9], [100, 11], [108, 18], [110, 28], [104, 36], [99, 44], [98, 58], [100, 64], [106, 70], [109, 78],
  [110, 100], [112, 110], [118, 118], [125, 126], [130, 134], [130, 151], [118, 154], [108, 148], [100, 144], [97, 160], [94, 170], [93, 195],
  [100, 203], [103, 210], [103, 229], [92, 234], [74, 233], [70, 222], [64, 222], [62, 236], [56, 246], [40, 247], [32, 239], [30, 222],
  [36, 205], [44, 196], [46, 175], [44, 162], [30, 161], [20, 154], [17, 140], [15, 120], [15, 80], [19, 67], [28, 61], [42, 59], [48, 57], [47, 45], [46, 35],
]));
const armPoly = polyMask(E([[83, 75], [96, 74], [104, 79], [109, 88], [111, 106], [118, 117], [125, 125], [131, 133], [131, 152], [118, 155], [108, 149], [100, 142], [93, 128], [87, 120], [84, 105]]));
const backpackPoly = polyMask(E([[14, 64], [21, 58], [61, 57], [67, 66], [69, 140], [61, 147], [19, 147], [14, 136]]));
const legSplit = E([[93, 156], [86, 182], [73, 214], [66, 250]]);
const leftOfSplit = polyMask([[1000, 700], ...legSplit, [1000, 810]]);

const head = and(silhouette, rectMask(1090, 555, 1170, 614));
const arm = and(silhouette, armPoly);
const legs = and(silhouette, rectMask(1086, 711, 1170, 810));
const backLeg = and(legs, leftOfSplit);
const frontLeg = minus(legs, leftOfSplit);
const torsoCore = minus(minus(minus(silhouette, head), arm), legs);
const backpack = and(torsoCore, backpackPoly);
const armHole = and(arm, rectMask(1100, 600, 1147, 720));

// Placa limpia: se reconstruye solo el área del explorador ampliada 3 px.
const cyan = where((r, g, b) => g > 150 && b > 150 && g > r + 40);
const cyanNear = dilate(cyan, 4);
const gearZone = rectMask(1292, 590, 1373, 669);
const gearStem = rectMask(1323, 664, 1338, 677);
const nodesZone = rectMask(1436, 517, 1500, 580);
const nodesStem = rectMask(1456, 575, 1468, 586);
const summitZone = rectMask(1496, 330, 1650, 440);
const gear = or(gearZone, gearStem), nodes = or(nodesZone, nodesStem);
// Resplandor turquesa de los iconos y de la mochila: no debe copiarse como textura del fondo.
const nearExplorer = dilate(silhouette, 10);
const tealGlow = where((r, g, b, x, y) => ((x > 1250 && y > 330 && y < 720) || nearExplorer[at(x, y)]) && g > r + 12 && b > r + 12);
// Incluye el halo de la pantalla de la mochila, que se mueve con el explorador.
const exFill = or(dilate(silhouette, 3), minus(and(dilate(tealGlow, 1), nearExplorer), cyanNear));
const forbidden = or(dilate(silhouette, 6), dilate(gear, 10), dilate(nodes, 10), summitZone, cyanNear, dilate(tealGlow, 3));

console.log("placas:");
let plate = inpaint(src, exFill, not(forbidden), { half: 4, radius: 60, label: "explorador" });
// El halo que cada icono proyecta sobre el terreno desaparece con él (los puntos de la ruta se conservan).
const haloOf = (m) => minus(and(dilate(tealGlow, 1), dilate(m, 12)), cyanNear);
const gearFill = or(dilate(gear, 1), haloOf(gear)), nodesFill = or(dilate(nodes, 1), haloOf(nodes));
plate = inpaint(plate, gearFill, not(forbidden), { half: 4, radius: 60, label: "engranaje" });
plate = inpaint(plate, nodesFill, not(forbidden), { half: 4, radius: 60, label: "nodos" });

// ---------------------------------------------------------------- nubes
// Bancos de nubes del cielo superior. Solo se animan los que no tocan el horizonte.
const SKY_LIMIT = 336;
const cloudCore = where((r, g, b, x, y) => y < SKY_LIMIT && r > 128 && r > g * 1.55 && r > b * .95);
const cloudGrown = dilate(cloudCore, 2);
const cc = components(cloudGrown, 260);
const clouds = [];
const cloudMask = newMask();
for (const c of cc.comps) {
  if (c.y1 >= SKY_LIMIT - 4) continue;
  const cy = c.sy / c.size;
  const drift = cy < 150 ? 13 : cy < 250 ? 9 : 6; // px en 12 s, más lento cerca del horizonte
  clouds.push({ id: c.id, drift, box: { x: c.x0, y: c.y0, w: c.x1 - c.x0 + 1, h: c.y1 - c.y0 + 1 } });
  for (const p of c.pixels) cloudMask[p] = 1;
}
// Franja que quedará descubierta al desplazarse cada nube hacia la derecha.
const reveal = newMask();
for (const cl of clouds) {
  for (let y = cl.box.y; y < cl.box.y + cl.box.h; y++) for (let x = cl.box.x; x < cl.box.x + cl.box.w; x++) {
    const i = at(x, y);
    if (cc.label[i] !== cl.id) continue;
    for (let d = 1; d <= cl.drift + 1; d++) { if (x - d < 0 || cc.label[at(x - d, y)] !== cl.id) { reveal[i] = 1; break; } }
  }
}
const brightSky = where((r, g, b, x, y) => y < SKY_LIMIT + 20 && Math.max(r, g, b) > 150);
const skyAllow = and(not(or(dilate(cloudGrown, 2), dilate(brightSky, 3))), rectMask(0, 0, W - 1, SKY_LIMIT + 10));
console.log(`nubes: ${clouds.length} bancos, ${count(reveal)} px de cielo a reconstruir`);
plate = inpaint(plate, reveal, skyAllow, { half: 3, radius: 40, label: "cielo" });
await saveRGB("plate.png", plate);
meta.clouds = [];
for (const cl of clouds) {
  const f = `cloud-${meta.clouds.length}.png`;
  await saveSprite(f, cl.box, (x, y) => { const i = at(x, y); return cc.label[i] === cl.id ? [src[i * 3], src[i * 3 + 1], src[i * 3 + 2], 255] : null; });
  meta.clouds.push({ file: f, ...cl.box, drift: cl.drift });
}
meta.skyLimit = SKY_LIMIT;

// ---------------------------------------------------------------- partes del explorador
// Alfa: interior sólido; en el borde exterior, mate por diferencia con la placa limpia.
const inner = erode(silhouette, 1), outerBand = minus(dilate(silhouette, 2), inner);
const partLabel = new Uint8Array(N);
const parts = { torso: 1, head: 2, arm: 3, backLeg: 4, frontLeg: 5 };
for (let i = 0; i < N; i++) {
  if (backLeg[i]) partLabel[i] = 4; else if (frontLeg[i]) partLabel[i] = 5; else if (arm[i]) partLabel[i] = 3; else if (head[i]) partLabel[i] = 2; else if (torsoCore[i]) partLabel[i] = 1;
}
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = at(x, y);
  if (!(outerBand[i] || exFill[i]) || partLabel[i]) continue;
  let best = 0, bd = 999;
  for (let dy = -12; dy <= 12; dy++) for (let dx = -12; dx <= 12; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const l = partLabel[at(xx, yy)]; const d = dx * dx + dy * dy; if (l && silhouette[at(xx, yy)] && d < bd) { bd = d; best = l; } }
  partLabel[i] = best;
}
// Alfa mínimo que reproduce exactamente el original sobre la placa (mate por diferencia).
const minAlpha = (i) => {
  let a = 0;
  for (let c = 0; c < 3; c++) {
    const o = src[i * 3 + c], p = Math.round(plate[i * 3 + c]);
    if (o > p) a = Math.max(a, (o - p) / (255 - p)); else if (o < p) a = Math.max(a, (p - o) / p);
  }
  return Math.ceil(a * 255);
};
const alphaAt = (i) => inner[i] ? 255 : exFill[i] ? minAlpha(i) : 0;
// Color "despremultiplicado" contra la placa para que la composición reproduzca el original.
const colorAt = (i, a) => {
  if (a >= 255 || a <= 0) return [src[i * 3], src[i * 3 + 1], src[i * 3 + 2], a];
  const k = a / 255;
  return [0, 1, 2].map(c => (src[i * 3 + c] - (1 - k) * Math.round(plate[i * 3 + c])) / k).concat(a);
};
// Hueco del brazo dentro del torso: se rellena con la textura de la chaqueta.
const torsoSrc = and(torsoCore, not(backpack));
const torsoFilled = inpaint(src, armHole, erode(torsoSrc, 1), { half: 2, radius: 24, label: "chaqueta" });

meta.explorer = { parts: {} };
for (const [name, id] of Object.entries(parts)) {
  const m = newMask();
  for (let i = 0; i < N; i++) if (partLabel[i] === id || (id === 1 && armHole[i])) m[i] = 1;
  const box = bbox(m);
  meta.explorer.parts[name] = await saveSprite(`explorer-${name}.png`, box, (x, y) => {
    const i = at(x, y);
    if (!m[i]) return null;
    if (id === 1 && armHole[i]) return [torsoFilled[i * 3], torsoFilled[i * 3 + 1], torsoFilled[i * 3 + 2], 255];
    const a = alphaAt(i);
    return a ? colorAt(i, a) : null;
  });
}
{
  const m = and(backpack, inner);
  meta.explorer.parts.backpack = await saveSprite("explorer-backpack.png", bbox(m), (x, y) => { const i = at(x, y); return m[i] ? [src[i * 3], src[i * 3 + 1], src[i * 3 + 2], 255] : null; });
}

// ---------------------------------------------------------------- iconos
// Mate por diferencia contra la placa: solo el icono y su resplandor, sin el paisaje.
async function iconSprite(name, zone) {
  const box = bbox(zone);
  return saveSprite(name, box, (x, y) => {
    const i = at(x, y);
    if (!zone[i]) return null;
    const a = minAlpha(i);
    return a ? colorAt(i, a) : null;
  });
}
meta.gear = await iconSprite("icon-gear.png", gearFill);
meta.nodes = await iconSprite("icon-nodes.png", nodesFill);
// Icono de la cima: permanece; se guarda su luz cian para la activación final.
meta.summit = await saveSprite("icon-summit-glow.png", bbox(summitZone), (x, y) => {
  const i = at(x, y);
  if (!summitZone[i]) return null;
  const r = src[i * 3], g = src[i * 3 + 1], b = src[i * 3 + 2];
  const k = Math.max(0, Math.min(1, (Math.min(g, b) - r - 20) / 120));
  return k > 0 ? [r, g, b, k * 255] : null;
});

// ---------------------------------------------------------------- ruta luminosa
const routeMask = and(and(cyan, rectMask(880, 420, W - 1, H - 1)), not(or(dilate(silhouette, 2), gearZone, nodesZone, rectMask(1530, 345, 1615, 432))));
const rc = components(dilate(routeMask, 1), 6);
const routeMaskGrown = newMask();
for (const c of rc.comps) for (const p of c.pixels) routeMaskGrown[p] = 1;
meta.route = { dots: rc.comps.map(c => ({ x: c.x0, y: c.y0, w: c.x1 - c.x0 + 1, h: c.y1 - c.y0 + 1, cx: c.sx / c.size, cy: c.sy / c.size })) };
meta.route.sprite = await saveSprite("route-dots.png", { x: 0, y: 0, w: W, h: H }, (x, y) => {
  const i = at(x, y);
  if (!routeMaskGrown[i]) return null;
  const r = src[i * 3], g = src[i * 3 + 1], b = src[i * 3 + 2];
  const k = Math.max(0, Math.min(1, (Math.min(g, b) - r - 10) / 110));
  return k > 0 ? [r, g, b, k * 255] : null;
});

// ---------------------------------------------------------------- luces del pueblo
const lightZone = polyMask([[0, 560], [1010, 560], [1010, 700], [880, 760], [700, 790], [0, 800]]);
const lightCore = and(where((r, g, b) => Math.max(r, g, b) > 165 && g > 135 && r >= b && r > 170), lightZone);
const lc = components(dilate(lightCore, 1), 1);
const lightGroup = new Uint8Array(N);
let seed = 20261020;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
for (const c of lc.comps) { const g = 1 + Math.floor(rand() * 6); for (const p of c.pixels) lightGroup[p] = g; }
const lightBox = bbox(dilate(lightCore, 1));
meta.lights = await saveSprite("city-lights.png", lightBox, (x, y) => {
  const i = at(x, y);
  if (!lightGroup[i]) return null;
  const k = Math.max(0, Math.min(1, (lum(i) - 110) / 110));
  return k > 0 ? [src[i * 3], src[i * 3 + 1], src[i * 3 + 2], k * 255] : null;
});
meta.lights.groupsFile = "city-light-groups.png";
await saveSprite("city-light-groups.png", lightBox, (x, y) => { const g = lightGroup[at(x, y)]; return g ? [g * 40, 0, 0, 255] : null; });
meta.lights.count = lc.comps.length;

// ---------------------------------------------------------------- estrellas
const starCore = where((r, g, b, x, y) => y < SKY_LIMIT && Math.max(r, g, b) > 175 && !(r > g * 1.4));
const sc = components(and(dilate(starCore, 2), not(cloudGrown)), 3);
meta.stars = [];
for (const c of sc.comps) {
  const pad = c.size > 60 ? 4 : 2;
  const box = { x: Math.max(0, c.x0 - pad), y: Math.max(0, c.y0 - pad), w: c.x1 - c.x0 + 1 + pad * 2, h: c.y1 - c.y0 + 1 + pad * 2 };
  let bg = [255, 255, 255], bl = 999;
  for (let y = box.y; y < box.y + box.h; y++) for (let x = box.x; x < box.x + box.w; x++) { const i = at(x, y); if (lum(i) < bl) { bl = lum(i); bg = [src[i * 3], src[i * 3 + 1], src[i * 3 + 2]]; } }
  meta.stars.push({ ...box, bg, big: c.size > 60 });
}
meta.starSprite = await saveSprite("stars.png", { x: 0, y: 0, w: W, h: SKY_LIMIT + 10 }, (x, y) => {
  const i = at(x, y);
  const s = meta.stars.find(st => x >= st.x && y >= st.y && x < st.x + st.w && y < st.y + st.h);
  if (!s) return null;
  const k = Math.max(0, Math.min(1, (lum(i) - Math.max(...s.bg) - 15) / 140));
  return k > 0 ? [src[i * 3], src[i * 3 + 1], src[i * 3 + 2], k * 255] : null;
});

await fs.writeFile(path.join(OUT, "layers.json"), JSON.stringify(meta, null, 1));
console.log(`listo: ${meta.clouds.length} nubes, ${meta.route.dots.length} puntos de ruta, ${meta.lights.count} luces, ${meta.stars.length} estrellas`);
