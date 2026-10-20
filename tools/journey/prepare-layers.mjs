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

// ---------------------------------------------------------------- completado multiescala
// Completado coherente (Wexler et al. con PatchMatch): en cada escala se busca, para cada
// parche que toca el hueco, el parche más parecido del entorno permitido, y cada píxel se
// recompone con los parches que lo cubren. La última pasada no promedia: toma el píxel del
// parche más parecido, para no suavizar los bloques del pixel art.
function complete(rgb, fill, allow, { half = 3, levels = 4, window = 90, label = "", seed = 7, keepInit = false } = {}) {
  let rnd = seed >>> 0;
  const random = () => { rnd = (rnd * 1664525 + 1013904223) >>> 0; return rnd / 4294967296; };
  // recorte de trabajo
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let i = 0; i < N; i++) if (fill[i]) { const x = i % W, y = (i / W) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const pad = window + half * 2;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
  const base = { w: x1 - x0 + 1, h: y1 - y0 + 1 };
  base.col = new Float32Array(base.w * base.h * 3); base.fill = new Uint8Array(base.w * base.h); base.allow = new Uint8Array(base.w * base.h);
  for (let y = 0; y < base.h; y++) for (let x = 0; x < base.w; x++) {
    const i = at(x0 + x, y0 + y), j = y * base.w + x;
    base.col.set([rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]], j * 3);
    base.fill[j] = fill[i]; base.allow[j] = allow[i] && !fill[i] ? 1 : 0;
  }
  // pirámide: color promediado; hueco si algún hijo es hueco; origen permitido si todos lo son
  const pyr = [base];
  for (let l = 1; l < levels; l++) {
    const p = pyr[l - 1], w = Math.ceil(p.w / 2), h = Math.ceil(p.h / 2);
    const q = { w, h, col: new Float32Array(w * h * 3), fill: new Uint8Array(w * h), allow: new Uint8Array(w * h) };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let n = 0, f = 0, a = 1; const acc = [0, 0, 0];
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const xx = 2 * x + dx, yy = 2 * y + dy; if (xx >= p.w || yy >= p.h) continue;
        const k = yy * p.w + xx; f |= p.fill[k]; a &= p.allow[k];
        if (!p.fill[k]) { n++; for (let c = 0; c < 3; c++) acc[c] += p.col[k * 3 + c]; }
      }
      const j = y * w + x; q.fill[j] = f; q.allow[j] = a && !f ? 1 : 0;
      if (n) for (let c = 0; c < 3; c++) q.col[j * 3 + c] = acc[c] / n;
    }
    pyr.push(q);
  }
  // relleno inicial en la escala más gruesa: difusión desde el borde (o el relleno recibido,
  // si se usa como refinamiento de otro método)
  if (!keepInit) {
    const p = pyr[levels - 1]; const known = Uint8Array.from(p.fill, f => f ? 0 : 1);
    let left = p.fill.reduce((s, v) => s + v, 0);
    while (left > 0) {
      const next = [];
      for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
        const j = y * p.w + x; if (known[j]) continue;
        let n = 0; const acc = [0, 0, 0];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= p.w || yy >= p.h) continue; const k = yy * p.w + xx; if (!known[k]) continue; n++; for (let c = 0; c < 3; c++) acc[c] += p.col[k * 3 + c]; }
        if (n) next.push([j, acc.map(v => v / n)]);
      }
      if (!next.length) break;
      for (const [j, c] of next) { p.col.set(c, j * 3); known[j] = 1; left--; }
    }
  }
  let nnf = null;
  for (let l = levels - 1; l >= 0; l--) {
    const p = pyr[l], { w, h, col } = p, win = Math.max(8, Math.round(window / 2 ** l));
    // centros válidos de origen
    const valid = new Uint8Array(w * h);
    for (let y = half; y < h - half; y++) for (let x = half; x < w - half; x++) {
      let ok = 1;
      for (let dy = -half; dy <= half && ok; dy++) for (let dx = -half; dx <= half; dx++) if (!p.allow[(y + dy) * w + x + dx]) { ok = 0; break; }
      valid[y * w + x] = ok;
    }
    // parches objetivo: los que tocan el hueco
    const targets = [];
    const touch = new Uint8Array(w * h);
    for (let y = half; y < h - half; y++) for (let x = half; x < w - half; x++) {
      let t = 0;
      for (let dy = -half; dy <= half && !t; dy++) for (let dx = -half; dx <= half; dx++) if (p.fill[(y + dy) * w + x + dx]) { t = 1; break; }
      if (t) { touch[y * w + x] = 1; targets.push(y * w + x); }
    }
    const dist = (pc, qc, best = Infinity) => {
      const px = pc % w, py = (pc / w) | 0, qx = qc % w, qy = (qc / w) | 0;
      let d = 0;
      for (let dy = -half; dy <= half; dy++) {
        const a0 = ((py + dy) * w + px) * 3, b0 = ((qy + dy) * w + qx) * 3;
        for (let dx = -half; dx <= half; dx++) {
          const a = a0 + dx * 3, b = b0 + dx * 3;
          const e0 = col[a] - col[b], e1 = col[a + 1] - col[b + 1], e2 = col[a + 2] - col[b + 2];
          d += e0 * e0 + e1 * e1 + e2 * e2;
        }
        if (d >= best) return d;
      }
      return d;
    };
    const randomValid = (pc) => {
      const px = pc % w, py = (pc / w) | 0;
      // primero cerca; si no hay origen válido, se amplía la ventana de a poco
      for (let r = win; r <= win * 4; r *= 2) for (let k = 0; k < 80; k++) {
        const x = Math.round(px + (random() * 2 - 1) * r), y = Math.round(py + (random() * 2 - 1) * r);
        if (x < half || y < half || x >= w - half || y >= h - half) continue;
        if (valid[y * w + x]) return y * w + x;
      }
      for (let k = 0; k < 4000; k++) { const j = Math.floor(random() * w * h); if (valid[j]) return j; }
      return -1;
    };
    // inicialización del campo de correspondencias (desde la escala anterior si existe)
    const map = new Int32Array(w * h).fill(-1), cost = new Float64Array(w * h).fill(Infinity);
    for (const t of targets) {
      let q = -1;
      if (nnf) {
        const tx = t % w, ty = (t / w) | 0, pw = pyr[l + 1].w;
        const prev = nnf[Math.min(pyr[l + 1].h - 1, ty >> 1) * pw + Math.min(pw - 1, tx >> 1)];
        if (prev >= 0) { const qx = (prev % pw) * 2 + (tx & 1), qy = ((prev / pw) | 0) * 2 + (ty & 1); if (qx >= half && qy >= half && qx < w - half && qy < h - half && valid[qy * w + qx]) q = qy * w + qx; }
      }
      if (q < 0) q = randomValid(t);
      map[t] = q; cost[t] = q >= 0 ? dist(t, q) : Infinity;
    }
    const iterations = l === 0 ? 8 : 7;
    for (let it = 0; it < iterations; it++) {
      // PatchMatch: propagación y búsqueda aleatoria
      for (let pass = 0; pass < 2; pass++) {
        const forward = (it + pass) % 2 === 0;
        for (let k = 0; k < targets.length; k++) {
          const t = targets[forward ? k : targets.length - 1 - k];
          const tx = t % w, ty = (t / w) | 0, s = forward ? -1 : 1;
          for (const n of [t + s, t + s * w]) {
            if (n < 0 || n >= w * h || map[n] < 0) continue;
            const q = map[n] - (n - t);
            const qx = q % w, qy = (q / w) | 0;
            if (q < 0 || q >= w * h || Math.abs(qx - (map[n] % w)) > 1 || !valid[q]) continue;
            if (Math.abs(qx - tx) > win || Math.abs(qy - ty) > win) continue;
            const d = dist(t, q, cost[t]); if (d < cost[t]) { cost[t] = d; map[t] = q; }
          }
          for (let r = win; r >= 1; r >>= 1) {
            const b = map[t]; if (b < 0) break;
            const x = Math.round((b % w) + (random() * 2 - 1) * r), y = Math.round(((b / w) | 0) + (random() * 2 - 1) * r);
            if (x < half || y < half || x >= w - half || y >= h - half || Math.abs(x - tx) > win || Math.abs(y - ty) > win) continue;
            const q = y * w + x; if (!valid[q]) continue;
            const d = dist(t, q, cost[t]); if (d < cost[t]) { cost[t] = d; map[t] = q; }
          }
        }
      }
      // votación
      // En la escala fina no se promedia: cada píxel toma el color del parche más parecido que
      // lo cubre, así la textura se copia en lugar de lavarse.
      const finalPass = l === 0 && (keepInit || it >= 1);
      const sorted = targets.map(t => cost[t]).filter(Number.isFinite).sort((a, b) => a - b);
      const sigma2 = Math.max(1, sorted[Math.floor(sorted.length * .3)] || 1);
      const acc = new Float64Array(w * h * 3), wsum = new Float64Array(w * h), best = new Float64Array(w * h).fill(Infinity);
      const pick = finalPass ? new Float32Array(w * h * 3) : null;
      for (const t of targets) {
        const q = map[t]; if (q < 0) continue;
        const tx = t % w, ty = (t / w) | 0, qx = q % w, qy = (q / w) | 0;
        const wt = Math.exp(-cost[t] / (2 * sigma2));
        for (let dy = -half; dy <= half; dy++) for (let dx = -half; dx <= half; dx++) {
          const j = (ty + dy) * w + tx + dx; if (!p.fill[j]) continue;
          const s = (qy + dy) * w + qx + dx;
          if (finalPass) { if (cost[t] < best[j]) { best[j] = cost[t]; pick.set([col[s * 3], col[s * 3 + 1], col[s * 3 + 2]], j * 3); } }
          else { wsum[j] += wt; for (let c = 0; c < 3; c++) acc[j * 3 + c] += wt * col[s * 3 + c]; }
        }
      }
      for (let j = 0; j < w * h; j++) {
        if (!p.fill[j]) continue;
        if (finalPass) { if (best[j] < Infinity) col.set(pick.subarray(j * 3, j * 3 + 3), j * 3); }
        else if (wsum[j] > 0) for (let c = 0; c < 3; c++) col[j * 3 + c] = acc[j * 3 + c] / wsum[j];
      }
      // los costes dependen de los colores recién votados
      for (const t of targets) if (map[t] >= 0) cost[t] = dist(t, map[t]);
    }
    nnf = map;
    // subir de escala: el hueco de la escala siguiente parte de esta reconstrucción
    if (l > 0) {
      const f = pyr[l - 1];
      for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
        const j = y * f.w + x; if (!f.fill[j]) continue;
        const k = Math.min(h - 1, y >> 1) * w + Math.min(w - 1, x >> 1);
        f.col.set(col.subarray(k * 3, k * 3 + 3), j * 3);
      }
    }
  }
  const out = new Float32Array(rgb);
  for (let y = 0; y < base.h; y++) for (let x = 0; x < base.w; x++) {
    const j = y * base.w + x; if (!base.fill[j]) continue;
    const i = at(x0 + x, y0 + y);
    out[i * 3] = base.col[j * 3]; out[i * 3 + 1] = base.col[j * 3 + 1]; out[i * 3 + 2] = base.col[j * 3 + 2];
  }
  console.log(`  completado ${label}: ${base.fill.reduce((s, v) => s + v, 0)} px`);
  return out;
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
// ---------------------------------------------------------------- explorador original
// Silueta trazada sobre la referencia (coordenadas de la imagen original 1672×941): se retira de
// la ilustración para que el explorador animado ocupe su lugar.
const E = (pts) => pts.map(([x, y]) => [x + 1050, y + 555]);
const silhouette = polyMask(E([
  [48, 24], [55, 14], [65, 10], [85, 9], [100, 11], [108, 18], [110, 28], [104, 36], [99, 44], [98, 58], [100, 64], [106, 70], [109, 78],
  [110, 100], [112, 110], [118, 118], [125, 126], [130, 134], [130, 151], [118, 154], [108, 148], [100, 144], [97, 160], [94, 170], [93, 195],
  [100, 203], [103, 210], [103, 229], [92, 234], [74, 233], [70, 222], [64, 222], [62, 236], [56, 246], [40, 247], [32, 239], [30, 222],
  [36, 205], [44, 196], [46, 175], [44, 162], [30, 161], [20, 154], [17, 140], [15, 120], [15, 80], [19, 67], [28, 61], [42, 59], [48, 57], [47, 45], [46, 35],
]));

// Placa limpia: se reconstruye solo el área del explorador (más su borde) y la de los iconos.
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
// Borde real del explorador (2 px de antialias). El halo de la pantalla de la mochila no se
// recorta como parte del personaje: se guarda como luz aditiva que viaja con la mochila.
const exEdge = dilate(silhouette, 2);
// Puntos de la ruta (se conservan); el cian de los propios iconos no cuenta como ruta.
const routeNear = minus(cyanNear, dilate(or(gear, nodes), 3));
// El halo solo rodea la pantalla de la mochila (el resto del cian cercano es vegetación teñida).
const packScreen = rectMask(1062, 631, 1114, 681);
const packHalo = minus(minus(and(dilate(tealGlow, 1), dilate(packScreen, 15)), exEdge), routeNear);
const exFill = or(exEdge, packHalo);
// Resplandor intenso de los iconos (el tinte tenue del terreno se conserva como luz ambiental).
const strongGlow = where((r, g, b, x, y) => x > 1250 && y > 330 && y < 720 && g > r + 35 && b > r + 35);
// Orígenes prohibidos: márgenes estrechos para no quedarse sin textura cerca de los huecos.
const forbidden = or(dilate(silhouette, 4), dilate(gear, 3), dilate(nodes, 3), summitZone, dilate(cyan, 1), dilate(strongGlow, 1), dilate(packHalo, 1));

console.log("placas:");
// Iconos: el panel, su poste y el resplandor intenso alrededor (el tinte tenue del suelo queda
// como luz ambiental). Primero se rellena por parches y luego se refina con PatchMatch a escala
// completa, sin promediar, para que cada píxel venga del parche del entorno que mejor encaja.
const gearFill = minus(or(dilate(gear, 2), and(dilate(strongGlow, 1), dilate(gear, 8))), routeNear);
const nodesFill = minus(or(dilate(nodes, 2), and(dilate(strongGlow, 1), dilate(nodes, 8))), routeNear);
let plate = inpaint(src, exFill, not(forbidden), { half: 4, radius: 60, label: "explorador" });plate = inpaint(plate, gearFill, not(forbidden), { half: 4, radius: 60, label: "engranaje" });
plate = complete(plate, gearFill, not(forbidden), { half: 3, levels: 1, keepInit: true, window: 60, label: "engranaje", seed: 12 });
plate = inpaint(plate, nodesFill, not(forbidden), { half: 4, radius: 60, label: "nodos" });
plate = complete(plate, nodesFill, not(forbidden), { half: 3, levels: 1, keepInit: true, window: 60, label: "nodos", seed: 13 });

// ---------------------------------------------------------------- nubes
// Bancos de nubes del cielo superior. Solo se animan los que no tocan el horizonte.
const SKY_LIMIT = 336;
const cloudCore = where((r, g, b, x, y) => y < SKY_LIMIT && r > 128 && r > g * 1.55 && r > b * .95);
const cloudGrown = dilate(cloudCore, 2);
const cc = components(cloudGrown, 260);
// los destellos grandes tienen un halo magenta compacto: no son nubes
cc.comps = cc.comps.filter(c => c.x1 - c.x0 >= 60);
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

// ---------------------------------------------------------------- estrellas
// Las estrellas pixeladas de la ilustración se retiran del cielo; el motor dibuja en su lugar un
// cielo estrellado realista, visible solo donde hay cielo despejado (máscara suave).
const STAR_LIMIT = 400;
const skyLum = (i) => plate[i * 3] * .3 + plate[i * 3 + 1] * .59 + plate[i * 3 + 2] * .11;
const starPix = newMask();
// zonas que no son cielo abierto: nubes (con margen), icono de la cima y sol
// (solo bancos de nubes grandes: los destellos magenta también pasan el filtro de color de nube)
const cloudBanks = newMask();
for (const c of cc.comps) for (const p of c.pixels) cloudBanks[p] = 1;
const notSky = or(dilate(cloudBanks, 4), dilate(summitZone, 8), rectMask(1080, 300, 1380, STAR_LIMIT));
for (let y = 3; y < STAR_LIMIT; y++) for (let x = 3; x < W - 3; x++) {
  const i = at(x, y);
  if (notSky[i]) continue;
  // estrellas blancas, azuladas o violetas (el rosa de las nubes queda fuera)
  if (plate[i * 3 + 2] < plate[i * 3] * .85) continue;
  // más claro que la mediana local del cielo: estrella o destello
  const ring = [];
  for (let d = -3; d <= 3; d += 3) for (let e = -3; e <= 3; e += 3) if (d || e) ring.push(skyLum(at(x + d, y + e)));
  ring.sort((a, b) => a - b);
  if (skyLum(i) - ring[4] > 22) starPix[i] = 1;
}
// destellos grandes: núcleo muy brillante con brazos en cruz y halo; se retiran con más margen
const bigCore = and(where((r, g, b, x, y) => y < STAR_LIMIT && Math.max(r, g, b) > 215 && b >= r * .8), not(notSky));
const starFill = minus(or(dilate(starPix, 2), dilate(bigCore, 32)), notSky);
const starAllow = and(not(or(dilate(starFill, 1), dilate(cloudBanks, 1), summitZone)), rectMask(0, 0, W - 1, STAR_LIMIT + 20));
console.log(`estrellas pixeladas: ${count(starPix)} px`);
plate = inpaint(plate, starFill, starAllow, { half: 2, radius: 30, label: "estrellas" });
await saveRGB("plate.png", plate);
{
  // Máscara del cielo despejado: sin nubes (borde suave), sin el icono de la cima ni el sol,
  // y desvanecida hacia el horizonte, donde el resplandor del atardecer apaga las estrellas.
  let cloudSoft = dilate(cloudBanks, 1);
  const soft = new Float32Array(N);
  for (let k = 0; k < 4; k++) { for (let i = 0; i < N; i++) if (cloudSoft[i] && !soft[i]) soft[i] = 1 - k * .22; cloudSoft = dilate(cloudSoft, 1); }
  meta.sky = await saveSprite("sky-mask.png", { x: 0, y: 0, w: W, h: STAR_LIMIT }, (x, y) => {
    const i = at(x, y);
    const fade = Math.max(0, Math.min(1, (360 - y) / 150));
    const block = summitZone[i] || (x > 1080 && x < 1380 && y > 300) ? 0 : 1;
    const a = (1 - soft[i]) * fade * block;
    return a > 0 ? [255, 255, 255, a * 255] : null;
  });
}
meta.clouds = [];
for (const cl of clouds) {
  const f = `cloud-${meta.clouds.length}.png`;
  await saveSprite(f, cl.box, (x, y) => { const i = at(x, y); return cc.label[i] === cl.id ? [src[i * 3], src[i * 3 + 1], src[i * 3 + 2], 255] : null; });
  meta.clouds.push({ file: f, ...cl.box, drift: cl.drift });
}
meta.skyLimit = SKY_LIMIT;

// ---------------------------------------------------------------- explorador (rig limpio)
// El explorador ya no se recorta de la ilustración: se arma con el sprite de pie dibujado aparte
// (mismo diseño, fondo transparente). Se separa en partes articuladas (piernas en muslo y
// pantorrilla con bota, brazo cercano en brazo y antebrazo, mano lejana, torso con cabeza y
// mochila) para animar una marcha alternada, el balanceo de los brazos y el gesto de guardar.
const minAlpha = (i) => {
  let a = 0;
  for (let c = 0; c < 3; c++) {
    const o = src[i * 3 + c], p = Math.round(plate[i * 3 + c]);
    if (o > p) a = Math.max(a, (o - p) / (255 - p)); else if (o < p) a = Math.max(a, (p - o) / p);
  }
  return Math.ceil(a * 255);
};
// Color "despremultiplicado" contra la placa para que la composición reproduzca el original.
const colorAt = (i, a) => {
  if (a >= 255 || a <= 0) return [src[i * 3], src[i * 3 + 1], src[i * 3 + 2], a];
  const k = a / 255;
  return [0, 1, 2].map(c => (src[i * 3 + c] - (1 - k) * Math.round(plate[i * 3 + c])) / k).concat(a);
};
{
  const isScreen = (r, g, b) => g > 190 && b > 190 && r < 140;
  // pantalla de la mochila y colores del explorador en la ilustración (para escala y color)
  const inner = erode(silhouette, 2);
  let sx0 = W, sx1 = 0, sy0 = H, sy1 = 0;
  const orig = [[], [], []];
  for (let i = 0; i < N; i++) {
    if (!inner[i]) continue;
    const x = i % W, y = (i / W) | 0, r = src[i * 3], g = src[i * 3 + 1], b = src[i * 3 + 2];
    if (isScreen(r, g, b)) { sx0 = Math.min(sx0, x); sx1 = Math.max(sx1, x); sy0 = Math.min(sy0, y); sy1 = Math.max(sy1, y); }
    else { orig[0].push(r); orig[1].push(g); orig[2].push(b); }
  }
  const stat = (v) => { const m = v.reduce((s, n) => s + n, 0) / v.length; return { m, s: Math.sqrt(v.reduce((s, n) => s + (n - m) ** 2, 0) / v.length) || 1 }; };
  const target = orig.map(stat);

  const file = path.join(ROOT, "reference", "explorer", "explorer-walk-idle.png");
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const SW = info.width, SH = info.height, px = new Uint8ClampedArray(data);
  const sat = (x, y) => (y * SW + x) * 4;
  // escala: la pantalla de la mochila mide lo mismo que en la ilustración
  let qx0 = SW, qx1 = 0, qy0 = SH, qy1 = 0;
  const own = [[], [], []];
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    const s = sat(x, y); if (px[s + 3] < 200) continue;
    if (isScreen(px[s], px[s + 1], px[s + 2])) { qx0 = Math.min(qx0, x); qx1 = Math.max(qx1, x); qy0 = Math.min(qy0, y); qy1 = Math.max(qy1, y); }
    else for (let c = 0; c < 3; c++) own[c].push(px[s + c]);
  }
  const kScene = (sx1 - sx0 + 1) / (qx1 - qx0 + 1);   // sprite → ilustración a escala 1
  const K = kScene * 2;                                 // las partes se guardan al doble de esa escala
  // ajuste de color hacia la luz de la escena (la pantalla conserva su cian)
  const source = own.map(stat);
  for (let i = 0; i < SW * SH; i++) {
    const s = i * 4; if (px[s + 3] < 24 || isScreen(px[s], px[s + 1], px[s + 2])) continue;
    for (let c = 0; c < 3; c++) { const v = px[s + c]; const t = (v - source[c].m) * (target[c].s / source[c].s) + target[c].m; px[s + c] = v + (t - v) * .8; }
  }
  // partes (coordenadas del sprite de pie)
  const SPLIT = 552;
  const inRect = (x, y, r) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];
  const ARM_UP = [650, 455, 790, 650], ARM_LOW = [640, 625, 815, 810], FAR_HAND = [355, 700, 462, 818];
  const isArm = (x, y) => (x >= 650 && y >= 455 && y <= 720) || inRect(x, y, [700, 690, 815, 810]);
  const defs = {
    farShin: (x, y) => x < SPLIT && y >= 898 && y <= 1180,
    farThigh: (x, y) => x < SPLIT && x > 470 && y >= 755 && y <= 918,
    nearShin: (x, y) => x >= SPLIT && y >= 898 && y <= 1180,
    nearThigh: (x, y) => x >= SPLIT && x < 690 && y >= 755 && y <= 918,
    farHand: (x, y) => inRect(x, y, FAR_HAND),
    armUpper: (x, y) => isArm(x, y) && inRect(x, y, ARM_UP),
    armLower: (x, y) => isArm(x, y) && inRect(x, y, ARM_LOW),
    torso: (x, y) => y < 772 && !isArm(x, y) && !inRect(x, y, FAR_HAND),
  };
  // detrás del brazo: el costado de la chaqueta se prolonga con el color de cada fila
  const torsoFill = (x, y) => {
    if (!(x >= 650 && x <= 708 && y >= 470 && y <= 745)) return null;
    for (let xx = 649; xx > 600; xx--) { const s = sat(xx, y); if (px[s + 3] > 200) return [px[s], px[s + 1], px[s + 2], 255]; }
    return null;
  };
  const S = (v) => v * K;
  meta.explorer = {
    scale: K / kScene,   // las partes están al doble de la escala de escena
    parts: {},
    // pivotes en coordenadas de las partes escaladas
    pivots: {
      farHip: { x: S(527), y: S(785) }, farKnee: { x: S(527), y: S(908) }, farSole: { x: S(505), y: S(1160) },
      nearHip: { x: S(607), y: S(785) }, nearKnee: { x: S(607), y: S(908) }, nearSole: { x: S(625), y: S(1160) },
      shoulder: { x: S(690), y: S(500) }, elbow: { x: S(728), y: S(640) }, hand: { x: S(765), y: S(760) },
      neck: { x: S(640), y: S(420) }, hip: { x: S(590), y: S(780) },
      screen: { x: S((qx0 + qx1) / 2), y: S((qy0 + qy1) / 2), w: S(qx1 - qx0), h: S(qy1 - qy0) },
      ground: S(1160),
    },
    // centro de la pantalla respecto del punto de apoyo en la ilustración (escala de escena)
    screenOffset: { x: (sx0 + sx1) / 2 - 1118, y: (sy0 + sy1) / 2 - 795 },
  };
  for (const [name, test] of Object.entries(defs)) {
    let x0 = SW, y0 = SH, x1 = 0, y1 = 0;
    const keep = new Uint8Array(SW * SH);
    for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
      const s = sat(x, y);
      const filled = name === "torso" && torsoFill(x, y);
      if ((px[s + 3] >= 24 && test(x, y)) || filled) { keep[y * SW + x] = 1; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    }
    // margen para que el remuestreo no recorte el borde
    x0 = Math.max(0, x0 - 4); y0 = Math.max(0, y0 - 4); x1 = Math.min(SW - 1, x1 + 4); y1 = Math.min(SH - 1, y1 + 4);
    const w = x1 - x0 + 1, h = y1 - y0 + 1, buf = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const gx = x + x0, gy = y + y0; if (!keep[gy * SW + gx]) continue;
      const s = sat(gx, gy), d = (y * w + x) * 4;
      const f = name === "torso" && px[s + 3] < 24 ? torsoFill(gx, gy) : null;
      if (f) buf.set(f, d); else { buf[d] = px[s]; buf[d + 1] = px[s + 1]; buf[d + 2] = px[s + 2]; buf[d + 3] = px[s + 3]; }
    }
    const ow = Math.max(1, Math.round(w * K)), oh = Math.max(1, Math.round(h * K));
    const out = `explorer-${name}.png`;
    await sharp(buf, { raw: { width: w, height: h, channels: 4 } }).resize(ow, oh, { kernel: "lanczos3" }).png({ compressionLevel: 9 }).toFile(path.join(OUT, out));
    meta.explorer.parts[name] = { file: out, x: S(x0), y: S(y0), w: ow, h: oh };
  }
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

await fs.writeFile(path.join(OUT, "layers.json"), JSON.stringify(meta, null, 1));
console.log(`listo: ${meta.clouds.length} nubes, ${meta.route.dots.length} puntos de ruta, ${meta.lights.count} luces, ${Object.keys(meta.explorer.parts).length} partes del explorador`);
