// Mapa de profundidad de la ilustración para el render 2.5D: 0 = cielo (lejos), 1 = primer plano.
// Se arma con gradientes y polígonos sobre las zonas de la ilustración (coordenadas de la imagen
// original, 1672×941) y se suaviza para que el relieve se estire sin cortes al mover la cámara.

type Point = [number, number];
type Region = { points: Point[]; from: [y: number, depth: number]; to: [y: number, depth: number] };

const SCALE = 1 / 4;

// Profundidad general por altura: montañas lejanas, valle con el pueblo y el río, primer plano.
const BASE: [y: number, depth: number][] = [[0, .02], [380, .03], [430, .1], [520, .18], [640, .3], [780, .48], [941, .72]];

const REGIONS: Region[] = [
  // ladera derecha con el sendero, de la cima al pie
  {
    points: [[1505, 410], [1560, 400], [1672, 450], [1672, 941], [560, 941], [600, 860], [720, 780], [880, 700], [1050, 650], [1200, 600], [1330, 545], [1430, 470]],
    from: [410, .4], to: [941, 1],
  },
  // arbustos del primer plano a la izquierda
  {
    points: [[0, 700], [120, 730], [260, 790], [420, 830], [560, 840], [640, 941], [0, 941]],
    from: [700, .5], to: [941, .85],
  },
];

const grey = (d: number) => { const v = Math.round(Math.min(1, Math.max(0, d)) * 255); return `rgb(${v},${v},${v})`; };

function boxBlur(data: Uint8ClampedArray, w: number, h: number, r: number) {
  const tmp = new Float32Array(w * h);
  const src = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) src[i] = data[i * 4];
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let sum = 0, n = 0;
      for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < w) { sum += src[y * w + xx]; n++; } }
      tmp[y * w + x] = sum / n;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let sum = 0, n = 0;
      for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < h) { sum += tmp[yy * w + x]; n++; } }
      src[y * w + x] = sum / n;
    }
  }
  for (let i = 0; i < w * h; i++) { data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = src[i]; data[i * 4 + 3] = 255; }
}

/** Devuelve el mapa de profundidad en escala de grises (un cuarto de la resolución de la ilustración). */
export function buildDepthMap(width: number, height: number, sky: { image: CanvasImageSource; x: number; y: number; w: number; h: number }) {
  const w = Math.round(width * SCALE), h = Math.round(height * SCALE);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.scale(SCALE, SCALE);

  const base = ctx.createLinearGradient(0, 0, 0, height);
  for (const [y, d] of BASE) base.addColorStop(y / height, grey(d));
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  // cada zona toma la profundidad mayor entre la base y la suya
  ctx.globalCompositeOperation = "lighten";
  for (const r of REGIONS) {
    const g = ctx.createLinearGradient(0, r.from[0], 0, r.to[0]);
    g.addColorStop(0, grey(r.from[1])); g.addColorStop(1, grey(r.to[1]));
    ctx.fillStyle = g;
    ctx.beginPath();
    r.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  }

  // el cielo despejado (máscara de la ilustración) queda al fondo
  const mask = document.createElement("canvas");
  mask.width = sky.w; mask.height = sky.h;
  const m = mask.getContext("2d")!;
  m.drawImage(sky.image, 0, 0);
  m.globalCompositeOperation = "source-in";
  m.fillStyle = grey(.01);
  m.fillRect(0, 0, sky.w, sky.h);
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(mask, sky.x, sky.y);

  const pixels = ctx.getImageData(0, 0, w, h);
  boxBlur(pixels.data, w, h, 4);
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}
