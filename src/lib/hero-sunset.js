// Fondo animado del hero: atardecer visto desde un sendero en un cerro, dibujado a mano en código
// (tinta y gouache sobre papel; sin imágenes, fuentes ni librerías). Mundo de 1600x900 escalado tipo
// cover a la resolución del dispositivo. La cámara además se desplaza a la derecha (`pan`, en unidades
// del mundo) con el scroll horizontal del inicio, y cada plano avanza a su velocidad: el cielo casi no
// se mueve, la cordillera (más ancha que el mundo, WIDE) despacio, el valle a la mitad y el cerro con
// el sendero a la par del contenido.
// Cada cuadro es función pura de draw(t, entrada, parallaxX, parallaxY), con t = segundos % 60: todos
// los ciclos dividen 60 s, así el loop no tiene costura. El trazo "hierve" como animación a mano: se
// redibuja 8 veces por segundo rotando 3 dibujos; por eso cada plano estático (montañas y valle,
// cerro y sendero) se prerenderiza en sus 3 variantes y por cuadro solo se dibuja lo que se mueve.
// Demo, capturas y póster: tools/hero-sunset/.

export const W = 1600, H = 900, LOOP = 60;
const BOIL_FPS = 8, BOILS = 3;   // el trazo cambia 8 veces por segundo, ciclando 3 dibujos (480 % 3 = 0)
const ENTRY = 1.2;
export const EASE = [.22, 1, .36, 1];
const SUN = { x: 1215, y: 482, r: 62 };
const WIDE = W * 2.4;            // ancho de la cordillera y del cielo pintado, para el paneo
const SPEED = { sky: .05, far: .1, cloudsFar: .14, cloudsNear: .2, valley: .5, front: 1 };
// camino que sigue al pie de todas las pantallas: un tramo de PATH_P que se repite desde PATH_S,
// escondido detrás del cerro del hero (asoma por su ladera derecha), y avanza a la par del contenido
const PATH_P = W, PATH_S = W, PATH_TOP = 660;

export const PALETTE = {
  ink: "#071139", night: "#0d0a3d", indigo: "#120d50", violet: "#43105f", lavender: "#b48cff",
  magenta: "#e42a9b", rose: "#ed7e93", coral: "#f6a57e", peach: "#ffb77e", gold: "#fff1b0",
  cream: "#fff6d9", cyan: "#61f7e7", mint: "#e8fffb",
};
const P = PALETTE;
const LINE = "#120a36";          // tinta de los contornos

// ---------------------------------------------------------------- utilidades
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const mod = (a, n) => ((a % n) + n) % n;
const tri = (p) => 1 - Math.abs(2 * mod(p, 1) - 1);
function hash2(a, b) {
  let n = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), u), lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u), v);
}
function rng(seed) { let a = seed | 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function bezier([x1, y1, x2, y2]) {
  const f = (t, a, b) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (f(t, x1, x2) < x) lo = t; else hi = t; }
    return f(t, y1, y2);
  };
}
export const ease = bezier(EASE);
const rgba = (hex, a) => `rgba(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(",")},${a})`;

function resample(pts, step = 10, closed = false) {
  const out = [], Q = closed ? [...pts, pts[0]] : pts;
  for (let i = 0; i < Q.length - 1; i++) {
    const [x0, y0] = Q[i], [x1, y1] = Q[i + 1], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let k = 0; k < n; k++) out.push([lerp(x0, x1, k / n), lerp(y0, y1, k / n)]);
  }
  if (!closed) out.push(Q[Q.length - 1]);
  return out;
}
// ruido de valor periódico: n celdas en un período (el tramo del camino empalma consigo mismo)
const pnoise = (x, period, n, seed) => {
  const u = mod(x, period) / period * n, i = Math.floor(u), f = u - i, a = hash2(mod(i, n), seed), b = hash2(mod(i + 1, n), seed);
  return lerp(a, b, f * f * (3 - 2 * f));
};
// cinta a lo largo de un recorrido: bordes a cada lado con el ancho de cada punto
function band(pts, widthAt) {
  const left = [], right = [];
  pts.forEach(([x, y], i) => {
    const [x0, y0] = pts[Math.max(0, i - 1)], [x1, y1] = pts[Math.min(pts.length - 1, i + 1)], l = Math.hypot(x1 - x0, y1 - y0) || 1;
    const nx = -(y1 - y0) / l, ny = (x1 - x0) / l, w = widthAt(i) / 2;
    left.push([x + nx * w, y + ny * w]); right.push([x - nx * w, y - ny * w]);
  });
  return [...left, ...right.reverse()];
}
const circlePts = (cx, cy, r, ry = r) => { const n = Math.max(14, Math.round(r * .5)), o = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * ry]); } return o; };

// ---------------------------------------------------------------- escena
export function createHeroSunset() {
  const mk = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };
  let ctx = null, boil = 0;

  // ---- primitivas a mano (sobre el ctx actual, en coordenadas del mundo)
  const jit = (x, y, seed, amp) => {
    const s = seed * 13.37;
    return [
      x + (vnoise(x * .012 + s, y * .012) - .5) * 2 * amp + (vnoise(x * .09 + s, y * .09 + 7) - .5) * amp * .6,
      y + (vnoise(x * .012, y * .012 + s + 50) - .5) * 2 * amp + (vnoise(x * .09 + 3, y * .09 + s) - .5) * amp * .6,
    ];
  };
  const J = (pts, seed, amp) => pts.map(([x, y]) => jit(x, y, boil * 3.1 + seed, amp));
  const trace = (pts, closed) => {
    ctx.beginPath();
    if (pts.length < 3) { ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p); if (closed) ctx.closePath(); return; }
    const Q = closed ? [...pts, pts[0], pts[1]] : pts;
    ctx.moveTo(...(closed ? [(Q[0][0] + Q[1][0]) / 2, (Q[0][1] + Q[1][1]) / 2] : Q[0]));
    for (let i = 1; i < Q.length - 1; i++) ctx.quadraticCurveTo(Q[i][0], Q[i][1], (Q[i][0] + Q[i + 1][0]) / 2, (Q[i][1] + Q[i + 1][1]) / 2);
    if (!closed) ctx.lineTo(...Q[Q.length - 1]); else ctx.closePath();
  };
  // trazo de pluma: una pasada firme y otra más fina y suelta encima
  function ink(pts, { w = 2.4, col = LINE, closed = false, amp = 2, seed = 0, passes = 2, alpha = 1 } = {}) {
    ctx.save(); ctx.lineCap = ctx.lineJoin = "round"; ctx.strokeStyle = col;
    for (let p = 0; p < passes; p++) {
      ctx.globalAlpha = alpha * (p ? .45 : 1); ctx.lineWidth = w * (p ? .55 : 1);
      trace(J(pts, seed + p * .41, amp * (p ? 1.4 : 1)), closed); ctx.stroke();
    }
    ctx.restore();
  }
  function wash(pts, col, { amp = 1.6, seed = 0, alpha = 1 } = {}) {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = col; trace(J(pts, seed + .2, amp), true); ctx.fill(); ctx.restore();
  }
  // gouache: pinceladas anchas superpuestas en una dirección, cada una de un tono apenas distinto
  function brush(pts, cols, { angle = -.12, width = 26, seed = 3, alpha = .5 } = {}) {
    const r = rng(seed + boil * 101), xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const R = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2 + 10;
    ctx.save(); trace(J(pts, seed, 1.5), true); ctx.clip();
    ctx.translate(cx, cy); ctx.rotate(angle); ctx.lineCap = "round";
    for (let y = -R; y < R; y += width * .55) {
      ctx.strokeStyle = cols[Math.floor(r() * cols.length)]; ctx.globalAlpha = alpha * (.5 + r() * .5); ctx.lineWidth = width * (.7 + r() * .5);
      const a = -R + r() * R * .3, b = R - r() * R * .3;
      ctx.beginPath(); ctx.moveTo(a, y + (r() - .5) * 6); ctx.quadraticCurveTo(0, y + (r() - .5) * 10, b, y + (r() - .5) * 6); ctx.stroke();
    }
    ctx.restore();
  }
  function hatch(pts, { angle = -.9, gap = 9, col = LINE, w = 1.3, alpha = .35, seed = 0 } = {}) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const R = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2 + 10;
    ctx.save(); trace(J(pts, seed, 1.5), true); ctx.clip();
    ctx.translate(cx, cy); ctx.rotate(angle);
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.globalAlpha = alpha; ctx.lineCap = "round";
    for (let y = -R, i = 0; y < R; y += gap, i++) {
      const a = hash2(i, boil + seed * 7) * 4 - 2, b = hash2(i + 99, boil + seed * 7) * 4 - 2;
      const x0 = -R + hash2(i, 5 + seed) * R * .4, x1 = R - hash2(i, 9 + seed) * R * .4;
      ctx.beginPath(); ctx.moveTo(x0, y + a); ctx.quadraticCurveTo(0, y + a + b, x1, y + b); ctx.stroke();
    }
    ctx.restore();
  }
  const glow = (x, y, r, hex, a) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(hex, a)); g.addColorStop(1, rgba(hex, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  };

  // ---- geometría del mundo
  function ridge(peaks, x0, x1, seed, rough) {
    const pts = [];
    for (let x = x0; x <= x1; x += 8) {
      let y = Infinity;
      for (const [px, py, s] of peaks) { const d = Math.abs(x - px); y = Math.min(y, py + s * d * (1 + d / 900)); }
      pts.push([x, y + (vnoise(x * .02, seed) - .5) * rough + (vnoise(x * .07, seed + 4) - .5) * rough * .35]);
    }
    return pts;
  }
  const body = (top, bottom = H + 40) => [...top, [top[top.length - 1][0], bottom], [top[0][0], bottom]];

  // las cordilleras siguen más allá del mundo del hero con picos sembrados (WIDE)
  const extend = (peaks, y0, y1, slope, seed) => {
    const r = rng(seed), out = [...peaks];
    for (let x = peaks[peaks.length - 1][0]; x < WIDE + 120;) { x += 150 + r() * 100; out.push([x, y0 + r() * (y1 - y0), slope * (.85 + .3 * r())]); }
    return out;
  };
  const FAR = [[60, 372, .62], [250, 352, .58], [430, 380, .6], [610, 356, .62], [800, 392, .55], [990, 430, .5], [1180, 470, .45], [1380, 390, .55], [1560, 360, .6]];
  FAR.push(...extend(FAR, 350, 420, .58, 3).slice(FAR.length));
  const MID = [[-20, 430, .75], [170, 392, .72], [370, 382, .78], [560, 420, .7], [760, 398, .75], [940, 446, .62], [1110, 492, .5], [1290, 470, .55], [1500, 420, .65]];
  MID.push(...extend(MID, 392, 466, .7, 4).slice(MID.length));
  const FOOT = [[0, 520, .3], [260, 505, .32], [520, 522, .3], [760, 512, .34], [1000, 540, .3]];
  const farTop = ridge(FAR, -40, WIDE + 40, 1, 26), midTop = ridge(MID, -40, WIDE + 40, 2, 30);
  // las lomas del valle y el cerro bajan a la derecha: al panear se van sin dejar un borde recto
  const footTop = [...ridge(FOOT, -40, W + 40, 3, 14), [W + 200, 700], [W + 420, H + 40]];

  const HILL = resample([[760, 960], [880, 860], [990, 760], [1090, 670], [1190, 590], [1280, 524], [1360, 476], [1420, 448], [1462, 436], [1510, 442], [1560, 452], [W + 60, 470], [W + 200, 530], [W + 330, 700], [W + 420, H + 40]], 14)
    .map(([x, y], i) => [x, y + (vnoise(i * .4, 9) - .5) * 8]);
  const trailAt = (u) => {  // u: 0 abajo → 1 cima
    const x = lerp(930, 1452, u) + 46 * Math.sin(u * TAU) * (1 - u * .6), y = lerp(H + 30, 446, u ** .92);
    return [x, y, lerp(190, 8, u ** .75)];
  };
  const TRAIL_L = [], TRAIL_R = [];
  for (let i = 0; i <= 60; i++) { const [x, y, w] = trailAt(i / 60); TRAIL_L.push([x - w / 2, y]); TRAIL_R.push([x + w / 2, y]); }
  const TRAIL = [...TRAIL_L, ...[...TRAIL_R].reverse()];

  // el río baja de la cordillera y pasa junto a la ciudad hasta salir por abajo
  const RIVER = resample([[742, 562], [720, 580], [690, 594], [700, 612], [676, 636], [652, 664], [662, 700], [638, 740], [650, 790], [632, 840], [624, 900], [620, 950]], 6);
  const riverW = (i) => lerp(3, 28, i / (RIVER.length - 1));
  const riverBand = (k) => band(RIVER, (i) => riverW(i) * k);

  // tramo del camino (x local en [0, PATH_P]): lomas lejanas, lomas cercanas, el camino y el suelo
  const pathY = (x) => 834 + 14 * Math.sin(TAU * x / PATH_P) + 8 * Math.sin(2 * TAU * x / PATH_P + 1);
  const pathW = (x) => 50 + 10 * Math.sin(3 * TAU * x / PATH_P + .5);
  const hillsFar = (x) => 712 + (pnoise(x, PATH_P, 8, 61) - .5) * 64 + 20 * Math.sin(2 * TAU * x / PATH_P + 2);
  const hillsNear = (x) => 776 + (pnoise(x, PATH_P, 14, 62) - .5) * 30 + 10 * Math.sin(3 * TAU * x / PATH_P);

  // ciudad en el fondo del valle, sobre una loma: tres hileras (atrás más oscura y fría, adelante más
  // cálida) que arrancan cada una a su altura del terreno, con franjas de tierra delante que tapan
  // las bases; perfil más alto hacia el centro, techos variados, sombra del lado opuesto al sol y
  // borde cálido del lado del sol; ventanas que se prenden y apagan y faroles en la calle
  const CITY = { x0: 40, x1: 580 };
  // altura del terreno de la hilera d en x: loma que sube hacia el centro, con ondulaciones
  const cityGround = (x, d) => {
    const t = clamp((x - CITY.x0) / (CITY.x1 - CITY.x0)), hump = Math.sin(Math.PI * t) ** 1.2;
    return ROWS[d].base - hump * (36 - d * 9) - Math.sin(t * 9 + d * 2) * 4 - (vnoise(x * .025, 5 + d) - .5) * 9 + (x < CITY.x0 || x > CITY.x1 ? 14 : 0);
  };
  const ROWS = [
    { base: 742, hMin: 30, hMax: 96, wMin: 16, wMax: 32, fill: "#1d1663", shade: "#140e4c", rim: .25, line: .5 },
    { base: 760, hMin: 24, hMax: 72, wMin: 20, wMax: 40, fill: "#2a196d", shade: "#1c1158", rim: .45, line: .8 },
    { base: 780, hMin: 16, hMax: 34, wMin: 22, wMax: 38, fill: "#381c70", shade: "#26125a", rim: .65, line: .95 },
  ];
  const buildings = [], windows = [];
  {
    const r = rng(23);
    ROWS.forEach((row, d) => {
      for (let x = CITY.x0 - d * 8 + r() * 8; x < CITY.x1 + d * 6;) {
        const w = row.wMin + r() * (row.wMax - row.wMin);
        const env = .4 + .6 * Math.sin(Math.PI * clamp((x + w / 2 - CITY.x0) / (CITY.x1 - CITY.x0)));
        const h = (row.hMin + r() * (row.hMax - row.hMin)) * env + 8;
        const pick = r(), kind = d === 2 ? (pick < .6 ? "gable" : "flat") : pick < .1 ? "dome" : pick < .26 ? "tower" : pick < .5 ? "step" : "flat";
        const base = Math.max(cityGround(x + 2, d), cityGround(x + w - 2, d)) + 3;   // se apoya en el punto más bajo y se hunde un poco
        const wall = kind === "flat" ? h : h * .76, b = { x, w, h, wall, base, kind, row: d };
        buildings.push(b);
        const cols = Math.max(1, Math.floor((w - 6) / 7)), cell = (w - 8) / cols, levels = Math.max(1, Math.floor((wall - 9) / 10));
        for (let i = 0; i < cols; i++) for (let j = 0; j < levels; j++) {
          if (r() < .28) continue;
          windows.push({ x: x + 4 + i * cell + (cell - 3) / 2, y: base - wall + 6 + j * 10, period: [4, 5, 6, 7.5][Math.floor(r() * 4)], phase: r(), bias: r(), cold: r() < .035, row: d });
        }
        x += w + (r() < .3 ? 2 + r() * 6 : 0);
      }
    });
  }
  const buildingShape = ({ x, w, h, wall, base, kind }) => {
    const top = base - h, eave = base - wall;
    const pts = kind === "gable" ? [[x, eave], [x + w / 2, top], [x + w, eave]]
      : kind === "step" ? [[x, base - h * .78], [x + w * .32, base - h * .78], [x + w * .32, top], [x + w * .74, top], [x + w * .74, base - h * .88], [x + w, base - h * .88]]
      : kind === "tower" ? [[x, eave], [x + w * .26, eave], [x + w * .26, top], [x + w * .74, top], [x + w * .74, eave], [x + w, eave]]
      : kind === "dome" ? [[x, eave], ...Array.from({ length: 9 }, (_, i) => { const a = Math.PI + i / 8 * Math.PI; return [x + w / 2 + Math.cos(a) * w * .42, eave + Math.sin(a) * (h - wall)]; }), [x + w, eave]]
      : [[x, top], [x + w, top]];
    return resample([...pts, [x + w, base], [x, base]], 7, true);
  };
  const towers = buildings.filter((b) => b.kind === "tower").map((b, i) => ({ x: b.x + b.w / 2, y: b.base - b.h - 16, phase: i * .37 }));
  const lamps = Array.from({ length: 14 }, (_, i) => { const x = CITY.x0 + 24 + i * (CITY.x1 - CITY.x0 - 48) / 13; return { x, y: cityGround(x, 2) + 6 }; });

  // estrellas, nubes, plantas, luciérnagas: posiciones con semilla fija
  const stars = [];
  { const r = rng(11); while (stars.length < 64) { const x = r() * W, y = 8 + 330 * r() ** 1.7; if (stars.some((s) => Math.hypot(s.x - x, s.y - y) < 26)) continue; stars.push({ x, y, big: stars.length < 7, period: [2, 3, 4, 6][Math.floor(r() * 4)], phase: r(), rot: r() * .6 }); } }
  const CLOUD_TILE = W + 520;
  const clouds = [
    ...[[0, 150, 230, 34], [560, 95, 160, 26], [1150, 205, 280, 30], [1650, 120, 190, 24]].map(([x, y, w, h], i) => ({ x, y, w, h, near: false, seed: 40 + i })),
    ...[[200, 300, 330, 70], [980, 250, 300, 60], [1500, 340, 380, 78]].map(([x, y, w, h], i) => ({ x, y, w, h, near: true, seed: 60 + i })),
  ];
  const blades = [];
  {
    const r = rng(61);
    for (let i = 0; i < 70; i++) {
      const u = r() ** 1.4 * .95, [x, y, w] = trailAt(u), side = r() < .5 ? -1 : 1, near = 1 - u;
      const bx = x + side * (w / 2 + 4 + r() * 26 * near), n = 3 + Math.floor(r() * 4);
      for (let k = 0; k < n; k++) blades.push({ x: bx + (k - n / 2) * (2 + 3 * near), y: y + r() * 6, h: (10 + 34 * near) * (.6 + .5 * r()), lean: (r() - .5) * .5, tip: r() < .7 });
    }
    for (let i = 0; i < 26; i++) { const x = 40 + r() * 260, y = 860 + r() * 40; blades.push({ x, y, h: 30 + r() * 40, lean: (r() - .5) * .5, tip: false }); }
    blades.sort((a, b) => a.y - b.y);
  }
  const bushes = [];
  { const r = rng(71); for (let i = 0; i < 16; i++) { const u = .08 + r() * .8, [x, y, w] = trailAt(u), side = r() < .5 ? -1 : 1, near = 1 - u; bushes.push({ x: x + side * (w / 2 + 10 + r() * 30 * near), y: y + 4, r: 8 + 30 * near * (.6 + .4 * r()), seed: i }); } bushes.sort((a, b) => a.y - b.y); }
  const flies = [[1010, 820, 30, 14], [1100, 730, 26, 12], [1230, 640, 22, 10], [960, 880, 20, 10], [1310, 580, 18, 8]].map(([cx, cy, ax, ay], i) => ({ cx, cy, ax, ay, p: i * .23 + .1, q: i * .41 }));
  const birds = [[0, 0], [26, 12], [50, -8], [74, 18]];

  // ---- planos estáticos, dibujados una vez (el cielo) o una vez por variante de hervor
  function paintSky() {   // pinceladas horizontales sobre el degradé (el degradé va por cuadro)
    const r = rng(5);
    ctx.lineCap = "round";
    for (let i = 0; i < 170; i++) {
      const y = 20 + r() * 520, col = y < 200 ? P.indigo : y < 330 ? P.violet : y < 440 ? P.magenta : P.coral;
      ctx.strokeStyle = col; ctx.globalAlpha = .1 + r() * .14; ctx.lineWidth = 14 + r() * 26;
      const x = -60 + r() * (WIDE + 60), len = 120 + r() * 420;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + len / 2, y + (r() - .5) * 14, x + len, y + (r() - .5) * 10); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function paintRange(top, peaks, o) {
    const shape = body(top);
    wash(shape, o.base, { seed: o.seed });
    brush(shape, o.tints, { seed: o.seed + 1, alpha: o.brushA, width: 30 });
    // caras en sombra (del lado opuesto al sol), rayadas
    ctx.save(); trace(shape, true); ctx.clip();
    for (const [px, py] of peaks) {
      // la ladera en sombra baja hasta el valle (donde la cresta vuelve a subir) y cierra en diagonal
      const d = px < SUN.x ? -1 : 1, side = top.filter(([x]) => (x - px) * d > 0).sort((a, b) => (a[0] - b[0]) * d), slope = [];
      let low = py;
      for (const p of side) { if (p[1] < low - 6) break; slope.push(p); low = Math.max(low, p[1]); }
      if (slope.length < 3) continue;
      const [vx, vy] = slope[slope.length - 1], face = [[px, py - 4], ...slope, [vx, vy + 40], [px - d * 20, py + (vy - py) * 1.5 + 24]];
      wash(face, o.shade, { seed: o.seed + px, alpha: o.shadeA });
      hatch(face, { angle: d > 0 ? -.8 : .8, gap: o.gap, alpha: o.hatchA, seed: px, col: LINE });
    }
    // nieve en los picos altos, con la cara en sombra más fría
    for (const [px, py] of peaks) {
      if (py > o.snowBelow) continue;
      const sw = o.snow, cap = top.filter(([x]) => Math.abs(x - px) < sw).filter(([, y]) => y < py + sw * .55);
      if (cap.length < 3) continue;
      const snow = [...cap, ...cap.slice().reverse().map(([x, y], i) => [x, y + 10 + (i % 2) * 12 + hash2(i, px) * 8])];
      wash(snow, o.snowCol, { seed: px, alpha: .95 });
      ctx.save(); trace(J(snow, px, 1.5), true); ctx.clip();
      const d = px < SUN.x ? -1 : 1;
      wash([[px, py - 6], [px + d * sw, py + sw], [px + d * 2, py + sw * 2]], o.snowShade, { seed: px + 3, alpha: .9 });
      ctx.restore();
    }
    ctx.restore();
    ink(top, { w: o.line, alpha: o.lineA, seed: o.seed });
  }
  function paintFar() {
    paintSky();
    paintRange(farTop, FAR, { base: "#2a1a6e", tints: ["#3a2582", "#251464", P.indigo], brushA: .4, shade: "#1c1258", shadeA: .7, hatchA: .14, gap: 11, snow: 46, snowBelow: 400, snowCol: "#8f78d8", snowShade: "#5d4aa8", line: 1.6, lineA: .45, seed: 10 });
    paintRange(midTop, MID, { base: P.violet, tints: ["#55166f", "#3a0e55", "#4d1268"], brushA: .55, shade: "#2a0b4a", shadeA: .8, hatchA: .26, gap: 8, snow: 60, snowBelow: 440, snowCol: "#dccbff", snowShade: "#9c82e0", line: 2.6, lineA: .9, seed: 20 });
  }
  function paintValley() {
    // lomas del valle
    const foot = body(footTop);
    wash(foot, "#160f52", { seed: 30 });
    brush(foot, [P.indigo, P.night, "#1b1160"], { seed: 31, alpha: .5, width: 22, angle: -.05 });
    ink(footTop, { w: 1.8, alpha: .55, seed: 30, col: "#3a2a8a" });
    paintCity();
    // río: el agua copia el cielo del horizonte, con orillas a pluma (pasa por delante del pie de la ciudad)
    const river = riverBand(1);
    wash(river, "#7a2180", { seed: 40, amp: 1 });
    wash(riverBand(.4), "#b8337f", { seed: 41, amp: 1.4, alpha: .55 });
    ink(river, { closed: true, w: 1.6, alpha: .8, seed: 42, amp: 1 });
  }
  function paintCity() {
    // resplandor cálido de la ciudad sobre el valle
    const g = ctx.createRadialGradient(320, 770, 10, 320, 770, 340);
    g.addColorStop(0, rgba(P.coral, .2)); g.addColorStop(.5, rgba(P.magenta, .08)); g.addColorStop(1, rgba(P.magenta, 0));
    ctx.fillStyle = g; ctx.fillRect(-40, 420, 720, 500);
    ROWS.forEach((row, d) => {
      for (const b of buildings) {
        if (b.row !== d) continue;
        const shape = buildingShape(b), seed = b.x * .13;
        wash(shape, row.fill, { seed, amp: .7 });
        ctx.save(); trace(J(shape, seed + .2, .7), true); ctx.clip();
        // sombra del lado opuesto al sol (izquierda) y borde cálido del lado del sol
        ctx.fillStyle = row.shade; ctx.fillRect(b.x - 2, b.base - b.h - 2, b.w * .3 + 2, b.h + 4);
        if (b.kind === "dome") { ctx.strokeStyle = P.peach; ctx.globalAlpha = .55; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(b.x + b.w / 2, b.base - b.wall, b.w * .3, -1.1, -.2); ctx.stroke(); ctx.globalAlpha = 1; }
        ctx.restore();
        ink([[b.x + b.w - .5, b.base - b.wall + 1], [b.x + b.w - .5, b.base - b.wall * .45]], { w: 1.4, col: P.peach, alpha: row.rim, seed: seed + 3, amp: .6, passes: 1 });
        // ventanas apagadas (las prendidas van por cuadro)
        ctx.fillStyle = "#0e0a36";
        for (const win of windows) if (win.row === d && win.x >= b.x && win.x < b.x + b.w && win.y > b.base - b.wall) ctx.fillRect(win.x, win.y, 3, 4);
        ink(shape, { closed: true, w: 1.2, alpha: row.line, seed, amp: .7, passes: 1 });
        if (b.kind === "tower") ink([[b.x + b.w / 2, b.base - b.h], [b.x + b.w / 2, b.base - b.h - 16]], { w: 1.2, alpha: .9, seed: seed + 5, amp: .4, passes: 1 });
      }
      // franja de terreno delante de la hilera: tapa las bases siguiendo la loma
      const top = [];
      for (let x = CITY.x0 - 70; x <= CITY.x1 + 40; x += 8) top.push([x, cityGround(x, d) + 4 + (x < CITY.x0 - 20 || x > CITY.x1 + 10 ? 30 : 0)]);
      const ground = [...top, [CITY.x1 + 40, 900], [CITY.x0 - 70, 900]];
      wash(ground, ["#181158", "#1b1160", "#1e1166"][d], { seed: 70 + d, amp: 1 });
      if (d === 2) brush(ground, [P.indigo, "#1b1160", "#221470"], { seed: 73, alpha: .45, width: 14, angle: -.04 });
      ink(top, { w: 1.3, alpha: .35 + d * .2, seed: 71 + d, amp: 1.2, col: d === 2 ? LINE : "#3a2a8a", passes: 1 });
    });
    // postes de los faroles
    for (const l of lamps) ink([[l.x, l.y + 4], [l.x, l.y - 9]], { w: 1.1, alpha: .85, seed: l.x, amp: .3, passes: 1 });
  }
  function paintFront() {
    const hill = body(HILL);
    wash(hill, "#2a0e4e", { seed: 80 });
    brush(hill, ["#33105a", "#240c46", "#3b1462"], { seed: 81, alpha: .55, width: 34, angle: -.6 });
    ctx.save(); trace(hill, true); ctx.clip();
    hatch([[760, 980], [1060, 700], [1300, 560], [1300, 980]], { angle: -.7, gap: 10, alpha: .18, seed: 82 });
    // sendero de tierra: claro al centro, luz rasante del lado del sol, piedras y huellas
    wash(TRAIL, "#6b2a6c", { seed: 90, amp: 2.5 });
    brush(TRAIL, ["#8a3a78", "#7a3170", "#9a4a7c", "#5c2462"], { seed: 91, alpha: .7, width: 16, angle: -.9 });
    ink(TRAIL_R.map(([x, y], i) => [x - 4 - i * .25, y]), { w: 4, col: P.coral, alpha: .55, seed: 92, passes: 1 });
    const r = rng(93);
    for (let i = 0; i < 42; i++) {
      const u = r() * .9, [x, y, w] = trailAt(u), sx = x + (r() - .5) * w * .7, s = 2 + 9 * (1 - u) * r();
      wash(circlePts(sx, y, s * 1.4, s * .7), "#4a1a5a", { seed: 94 + i, amp: .8 });
      ctx.save(); ctx.strokeStyle = P.rose; ctx.globalAlpha = .7; ctx.lineWidth = 1.2 + s * .15; ctx.beginPath(); ctx.ellipse(sx - s * .2, y - s * .25, s * .9, s * .35, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.restore();
    }
    ink(TRAIL_L, { w: 2.2, alpha: .8, seed: 95 }); ink(TRAIL_R, { w: 2.2, alpha: .5, seed: 96 });
    ctx.restore();
    // borde del cerro: luz rasante en la cara que mira al sol
    ink(HILL.filter(([x]) => x > 1080 && x < 1470), { w: 4, col: P.peach, alpha: .9, seed: 97, passes: 1 });
    ink(HILL, { w: 2.6, alpha: .9, seed: 98 });
    // arbustos con luz rasante del lado del sol
    for (const b of bushes) {
      const blob = circlePts(b.x, b.y - b.r * .75, b.r * 1.5, b.r * .9).map(([x, y], i, all) => {
        const a = i / all.length * TAU, lobe = 1 + .22 * Math.abs(Math.sin(a * 3.5 + b.seed));   // contorno de follaje
        return [b.x + (x - b.x) * lobe, Math.min(b.y, b.y - b.r * .75 + (y - b.y + b.r * .75) * lobe)];
      });
      wash(blob, "#1e0a3c", { seed: b.seed });
      hatch(blob, { angle: .9, gap: 5, alpha: .25, seed: b.seed });
      const d = SUN.x > b.x ? 1 : -1;
      ctx.save(); ctx.strokeStyle = P.peach; ctx.lineCap = "round"; ctx.globalAlpha = .9; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.ellipse(b.x + b.r * .3 + d * b.r * .25, b.y - b.r * .75, b.r * 1.3, b.r * .7, 0, d > 0 ? Math.PI * 1.25 : Math.PI * 1.05, d > 0 ? Math.PI * 1.95 : Math.PI * 1.75); ctx.stroke(); ctx.restore();
      ink(blob, { closed: true, w: 1.8, alpha: .85, seed: b.seed, amp: 1.5 });
    }
    // matorrales del primer plano
    for (const [cx, cy, rx, ry, s] of [[60, 900, 220, 110, 1], [250, 930, 150, 70, 2], [1560, 900, 200, 120, 3], [1400, 940, 140, 70, 4]]) {
      const blob = circlePts(cx, cy, rx, ry).map(([x, y], i) => [x + (vnoise(i * .9, s) - .5) * 40, y + (vnoise(i * .9, s + 3) - .5) * 30]);
      wash(blob, "#0b0830", { seed: s });
      hatch(blob, { angle: .7, gap: 7, alpha: .3, seed: s, col: "#2a1260" });
      ink(blob, { closed: true, w: 2.4, seed: s, col: "#2a1260", alpha: .9 });
    }
  }
  function paintPath() {
    const xs = []; for (let x = -60; x <= PATH_P + 60; x += 8) xs.push(x);
    const line = (f) => xs.map((x) => [x, f(x)]), bottom = H + 40;
    // lomas lejanas con luz rasante del atardecer
    const far = line(hillsFar);
    wash([...far, [PATH_P + 60, bottom], [-60, bottom]], "#26104f", { seed: 110 });
    brush([...far, [PATH_P + 60, bottom], [-60, bottom]], ["#2e1260", "#220d48", "#33146a"], { seed: 111, alpha: .5, width: 24, angle: -.1 });
    ink(far, { w: 2.2, col: P.coral, alpha: .4, seed: 112, passes: 1 });
    ink(far, { w: 1.6, alpha: .6, seed: 113 });
    // lomas cercanas, rayadas
    const near = line(hillsNear);
    wash([...near, [PATH_P + 60, bottom], [-60, bottom]], "#1d0a42", { seed: 114 });
    hatch([...near, [PATH_P + 60, bottom], [-60, bottom]], { angle: -.6, gap: 9, alpha: .16, seed: 115 });
    ink(near, { w: 2, alpha: .75, seed: 116 });
    // el camino: tierra clara con luz rasante arriba, huellas y piedras
    const road = band(line(pathY), (i) => pathW(xs[i]));
    wash(road, "#6b2a6c", { seed: 120, amp: 2 });
    brush(road, ["#8a3a78", "#7a3170", "#9a4a7c", "#5c2462"], { seed: 121, alpha: .7, width: 12, angle: 0 });
    const edgeTop = xs.map((x) => [x, pathY(x) - pathW(x) / 2]), edgeBottom = xs.map((x) => [x, pathY(x) + pathW(x) / 2]);
    ink(edgeTop.map(([x, y]) => [x, y + 3]), { w: 3, col: P.coral, alpha: .55, seed: 122, passes: 1 });
    ctx.save(); ctx.strokeStyle = "#4a1a5a"; ctx.lineWidth = 1.6; ctx.lineCap = "round"; ctx.globalAlpha = .7;
    for (let x = 10; x < PATH_P; x += 46 + hash2(x, 7) * 40) { const y = pathY(x) + (hash2(x, 8) - .5) * 14; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 18 + hash2(x, 9) * 20, y + .5); ctx.stroke(); }
    ctx.restore();
    for (let x = 20; x < PATH_P; x += 60 + hash2(x, 3) * 70) {
      const y = pathY(x) + (hash2(x, 4) - .5) * pathW(x) * .5, r = 3 + hash2(x, 5) * 5;
      wash(circlePts(x, y, r * 1.4, r * .7), "#4a1a5a", { seed: x, amp: .6 });
      ctx.save(); ctx.strokeStyle = P.rose; ctx.globalAlpha = .7; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(x - r * .2, y - r * .25, r * .9, r * .35, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.restore();
    }
    ink(edgeTop, { w: 2, alpha: .75, seed: 123 });
    // suelo delante del camino y matas de pasto en los bordes
    wash([...edgeBottom, [PATH_P + 60, bottom], [-60, bottom]], "#170634", { seed: 124 });
    ink(edgeBottom, { w: 2.2, alpha: .85, seed: 125 });
    ctx.save(); ctx.lineCap = "round";
    for (let x = 4; x < PATH_P; x += 14 + hash2(x, 11) * 26) {
      const lower = hash2(x, 12) < .6, y0 = lower ? pathY(x) + pathW(x) / 2 + 2 : pathY(x) - pathW(x) / 2 + 1, n = 3 + Math.floor(hash2(x, 13) * 3), h = (lower ? 18 : 10) + hash2(x, 14) * 14;
      for (let k = 0; k < n; k++) {
        const bx = x + (k - n / 2) * 3, lean = (hash2(x + k, 15) - .5) * .7, tx = bx + Math.sin(lean) * h, ty = y0 - Math.cos(lean) * h;
        ctx.strokeStyle = "#1c0838"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(bx, y0); ctx.quadraticCurveTo(bx + lean * 3, y0 - h * .6, tx, ty); ctx.stroke();
        if (hash2(x + k, 16) < .7) { ctx.strokeStyle = P.peach; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(lerp(bx, tx, .7), lerp(y0, ty, .7)); ctx.lineTo(tx, ty); ctx.stroke(); }
      }
    }
    ctx.restore();
    // matas en las lomas cercanas
    for (let x = 80; x < PATH_P - 40; x += 180 + hash2(x, 17) * 160) {
      const y = hillsNear(x) + 10, r = 10 + hash2(x, 18) * 12;
      const blob = circlePts(x, y - r * .7, r * 1.5, r * .85).map(([bx, by], i, all) => { const lobe = 1 + .22 * Math.abs(Math.sin(i / all.length * TAU * 3.5 + x)); return [x + (bx - x) * lobe, Math.min(y, y - r * .7 + (by - y + r * .7) * lobe)]; });
      wash(blob, "#1e0a3c", { seed: x });
      ctx.save(); ctx.strokeStyle = P.peach; ctx.globalAlpha = .85; ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.beginPath(); ctx.ellipse(x + r * .25, y - r * .75, r * 1.3, r * .7, 0, Math.PI * 1.25, Math.PI * 1.95); ctx.stroke(); ctx.restore();
      ink(blob, { closed: true, w: 1.6, alpha: .85, seed: x, amp: 1.2 });
    }
  }
  function paintCloud(c) {
    const r = rng(c.seed), n = Math.max(4, Math.round(c.w / 55)), base = c.h * .9;
    const pts = [];
    for (let i = 0; i <= n * 4; i++) {
      const t = i / (n * 4), dome = Math.sin(t * Math.PI) ** .6, lobes = Math.abs(Math.sin(t * n * Math.PI + r() * .3));
      pts.push([t * c.w, base - c.h * (.12 + dome * (.45 + .45 * lobes))]);
    }
    const top = resample(pts, 10);
    const shape = [...top, [c.w, base], [c.w * .5, base + c.h * .03], [0, base]];
    if (c.near) {
      wash(shape, "#7a1f80", { seed: c.seed });
      brush(shape, [P.magenta, "#a52a8c", P.violet], { seed: c.seed + 1, alpha: .6, width: 10, angle: 0 });
      // base iluminada por el sol bajo
      ctx.save(); trace(J(shape, c.seed + .2, 1.6), true); ctx.clip();
      wash([[0, base - c.h * .16], [c.w * .5, base - c.h * .24], [c.w, base - c.h * .12], [c.w, base + 20], [0, base + 20]], P.rose, { seed: c.seed + 2, alpha: .85 });
      ctx.strokeStyle = P.coral; ctx.globalAlpha = .9; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(c.w * .22, base - 3); ctx.quadraticCurveTo(c.w * .5, base - 5, c.w * .74, base - 2); ctx.stroke();
      ctx.restore();
      ink(top, { w: 2, col: P.magenta, alpha: .9, seed: c.seed });
    } else {
      wash(shape, "#4a1666", { seed: c.seed, alpha: .8 });
      ctx.save(); ctx.strokeStyle = P.magenta; ctx.globalAlpha = .7; ctx.lineWidth = 2.2; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(c.w * .1, base - 2); ctx.lineTo(c.w * .9, base - 3); ctx.stroke(); ctx.restore();
    }
  }

  // ---- estado de resolución (lo fija resize)
  let cw = 0, ch = 0, k = 1, ox = 0, oy = 0, margin = 0;
  let far = null, valley = [], front = [], path = [], cloudSprites = [];

  /** Ajusta el lienzo de salida (px de dispositivo) y prerenderiza los planos a esa escala. */
  function resize(width, height, { anchorX } = {}) {
    cw = width; ch = height; k = Math.max(cw / W, ch / H);
    const vw = cw / k, vh = ch / k, aspect = cw / ch;
    const ax = anchorX ?? lerp(W / 2, 1150, clamp((1.6 - aspect) / 1.1));   // en pantallas angostas: sol y sendero
    ox = clamp(ax - vw / 2, 0, W - vw); oy = clamp((H - vh) * .6, 0, H - vh);
    margin = Math.ceil(14 * k);
    // grano de papel: ruido fijo en mosaico, horneado en cada plano (por cuadro no cuesta nada)
    const tile = mk(192, 192), tg = tile.getContext("2d"), img = tg.createImageData(192, 192);
    for (let i = 0; i < 192 * 192; i++) { const v = hash2(i, 77) * 255, f = hash2(i >> 3, 91) > .5 ? 1 : .6; img.data.set([v, v, v, 34 * f], i * 4); }
    tg.putImageData(img, 0, 0);
    const paper = (c) => {
      const g = c.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = "source-atop"; g.globalAlpha = 1; g.fillStyle = g.createPattern(tile, "repeat"); g.fillRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = "source-over";
      return c;
    };
    // cada plano cubre su franja del mundo [x0, x1] a la altura visible; el lejano se dibuja una sola
    // vez (es el más grande y casi no se mueve), los cercanos en sus 3 variantes de hervor
    const plate = (x0, x1, paint, boils, sky = false) => Array.from({ length: boils }, (_, b) => {
      const c = mk(Math.ceil((x1 - x0) * k) + 2 * margin, ch + 2 * margin);
      boil = b; ctx = c.getContext("2d"); ctx.setTransform(k, 0, 0, k, -x0 * k + margin, -oy * k + margin);
      if (sky) { ctx.fillStyle = "#000"; ctx.globalAlpha = .001; ctx.fillRect(x0 - 40, -100, x1 - x0 + 80, H + 200); ctx.globalAlpha = 1; }   // base casi invisible: el grano cubre también el cielo
      paint();
      return { c: paper(c), x0 };
    });
    [far] = plate(-60, WIDE + 60, paintFar, 1, true);
    valley = plate(-60, W + 440, paintValley, BOILS);
    front = plate(-60, W + 440, paintFront, BOILS);
    // el tramo del camino solo ocupa la franja de abajo: un lienzo bajo, con 60 de sobra a cada lado
    path = Array.from({ length: BOILS }, (_, b) => {
      const c = mk(Math.ceil((PATH_P + 120) * k), Math.ceil((H + 40 - PATH_TOP) * k) + 2 * margin);
      boil = b; ctx = c.getContext("2d"); ctx.setTransform(k, 0, 0, k, 60 * k, -PATH_TOP * k + margin);
      paintPath();
      return paper(c);
    });
    cloudSprites = clouds.map((c) => Array.from({ length: BOILS }, (_, b) => {
      const pad = 20, s = mk(Math.ceil((c.w + 2 * pad) * k), Math.ceil((c.h * 1.3 + 2 * pad) * k));
      boil = b; ctx = s.getContext("2d"); ctx.setTransform(k, 0, 0, k, pad * k, pad * k); paintCloud(c); return { s, pad };
    }));
    return { scale: k, cropX: ox, cropY: oy };
  }

  /**
   * Dibuja el cuadro t (s, se toma % 60) en `out` (ctx 2D del tamaño fijado con resize).
   * px/py: puntero en −1..1; pan: desplazamiento de la cámara a la derecha, en unidades del mundo.
   */
  function draw(out, t, entry = 1, px = 0, py = 0, pan = 0) {
    t = mod(t, LOOP);
    const ts = Math.floor(t * BOIL_FPS) / BOIL_FPS;       // el tiempo "a mano": avanza de a 8 cuadros por segundo
    boil = Math.floor(t * BOIL_FPS) % BOILS;
    const shift = (amp) => [-Math.round(px * amp * k), -Math.round(py * amp * k * .5)];
    const reveal = (a, b) => ease(clamp((entry - a) / (b - a)));
    const camX = (speed) => ox + pan * speed;
    const plane = ({ c, x0 }, amp, speed, alpha) => {
      const [dx, dy] = shift(amp), x = Math.round((x0 - camX(speed)) * k) + dx - margin;
      if (x > cw || x + c.width < 0) return;
      out.setTransform(1, 0, 0, 1, 0, 0); out.globalAlpha = alpha; out.drawImage(c, x, dy - margin); out.globalAlpha = 1;
    };
    const inWorld = (amp, speed) => { const [dx, dy] = shift(amp); ctx = out; out.setTransform(k, 0, 0, k, -camX(speed) * k + dx, -oy * k + dy); };
    const vw = cw / k;

    // cielo: degradé pintado; la banda del horizonte respira magenta ↔ coral cada 12 s
    out.setTransform(1, 0, 0, 1, 0, 0); out.globalAlpha = 1; out.fillStyle = P.ink; out.fillRect(0, 0, cw, ch);
    const a0 = reveal(0, .45);
    inWorld(2, 0);
    const breathe = tri(t / 12);
    const g = out.createLinearGradient(0, 0, 0, 560);
    g.addColorStop(0, P.ink); g.addColorStop(.3, P.night); g.addColorStop(.5, P.indigo); g.addColorStop(.66, P.violet);
    g.addColorStop(.8, P.magenta); g.addColorStop(.9 - breathe * .05, "#f0628f"); g.addColorStop(1, P.coral);
    out.globalAlpha = a0; out.fillStyle = g; out.fillRect(ox - 60, -60, vw + 120, 620); out.fillStyle = P.coral; out.fillRect(ox - 60, 559, vw + 120, 400);

    // estrellas: cruces a pluma que titilan en desfase (2, 3, 4 o 6 s); el cielo se repite cada W
    out.lineCap = "round";
    for (const s of stars) {
      const v = Math.sin(TAU * (ts / s.period + s.phase)), lit = (v + 1) / 2, x = ox + mod(s.x - ox - pan * SPEED.sky, W);
      out.globalAlpha = a0 * (.25 + .75 * lit) * (s.y > 260 ? .6 : 1);
      out.strokeStyle = lit > .7 ? P.cream : P.lavender; out.lineWidth = s.big ? 2 : 1.6;
      const r = s.big ? 6 + 5 * lit : 2 + 2 * lit;
      out.beginPath(); out.moveTo(x - r, s.y + r * s.rot * .3); out.lineTo(x + r, s.y - r * s.rot * .3);
      out.moveTo(x - r * s.rot * .3, s.y - r); out.lineTo(x + r * s.rot * .3, s.y + r); out.stroke();
    }
    out.globalAlpha = 1;

    // sol: halo que late cada 6 s, disco a gouache y anillos a mano (va con la cordillera)
    const pulse = tri(t / 6), a1 = reveal(.05, .5);
    inWorld(2, SPEED.far); out.globalAlpha = a1;
    glow(SUN.x, SUN.y, SUN.r * (3.4 + pulse * .5), P.coral, .35 + pulse * .12);
    glow(SUN.x, SUN.y, SUN.r * (1.9 + pulse * .2), P.peach, .45);
    wash(circlePts(SUN.x, SUN.y, SUN.r), P.gold, { seed: 7, amp: 1.2 });
    ctx.save(); trace(J(circlePts(SUN.x, SUN.y, SUN.r), 7.2, 1.2), true); ctx.clip();
    wash(circlePts(SUN.x - 16, SUN.y - 20, SUN.r * .7), P.cream, { seed: 8, alpha: .8 });
    wash(circlePts(SUN.x + 10, SUN.y + 46, SUN.r * .9, SUN.r * .5), P.peach, { seed: 9, alpha: .7 });
    ctx.restore();
    ink(circlePts(SUN.x, SUN.y, SUN.r), { closed: true, w: 2.2, col: P.coral, seed: 7, amp: 1.2, alpha: .9 * a1 });
    for (let i = 0; i < 3; i++) {
      const rr = SUN.r + 16 + i * 18 + pulse * (6 + i * 5);
      ink(circlePts(SUN.x, SUN.y, rr), { closed: true, w: 1.6, col: P.peach, seed: 11 + i, amp: 2.4, passes: 1, alpha: (.5 - i * .14) * (.6 + pulse * .4) * a1 });
    }
    out.globalAlpha = 1;

    // nubes: las lejanas dan la vuelta en 60 s, las cercanas en 30 s
    for (const [i, c] of clouds.entries()) {
      const speed = CLOUD_TILE / (c.near ? 30 : 60), drift = pan * (c.near ? SPEED.cloudsNear : SPEED.cloudsFar);
      const x0 = ox + mod(c.x + speed * t - drift - ox, CLOUD_TILE) - 400;
      const { s, pad } = cloudSprites[i][boil];
      inWorld(c.near ? 3 : 2.4, 0); out.globalAlpha = a1;
      for (const x of [x0, x0 - CLOUD_TILE]) if (x + c.w > ox - 60 && x < ox + vw + 60) out.drawImage(s, x - pad, c.y - pad, s.width / k, s.height / k);
    }
    out.globalAlpha = 1;

    // bandada: una pasada por loop, de derecha a izquierda, aleteo en 2 dibujos
    if (t >= 22 && t < 36) {
      const s = (ts - 22) / 14;
      inWorld(3, SPEED.far); out.strokeStyle = LINE; out.lineWidth = 2.4; out.lineCap = "round";
      birds.forEach(([dx, dy], i) => {
        const x = 1640 - 900 * s + dx, y = 420 - 380 * s ** 1.8 + dy, up = (Math.floor(ts * 4) + i) % 2, w = 9, h = up ? -6 : 3;
        out.beginPath(); out.moveTo(x - w, y + h); out.quadraticCurveTo(x - w * .4, y + h * .2 - 2, x, y); out.quadraticCurveTo(x + w * .4, y + h * .2 - 2, x + w, y + h); out.stroke();
      });
    }

    // montañas, valle, río y lago
    const a2 = reveal(.2, .75);
    plane(far, 4, SPEED.far, a2);
    inWorld(4, SPEED.far); out.globalAlpha = a2; out.lineCap = "round";
    // rim light de la cordillera media del lado del sol: titila apenas cada 12 s
    ink(midTop.filter(([x]) => x > 980 && x < 1500), { w: 2.4, col: P.lavender, alpha: (.45 + .25 * tri(t / 12)) * a2, seed: 3, passes: 1 });
    plane(valley[boil], 4, SPEED.valley, a2);
    inWorld(4, SPEED.valley); out.globalAlpha = a2;
    // reflejo del sol en el río: trazos que se corren cada 3 s
    for (let i = 2; i < RIVER.length - 1; i++) {
      if (hash2(i, 13) < .55) continue;   // destellos salteados, no en escalera
      const [x, y] = RIVER[i], o = Math.sin(TAU * (ts / 3 + i * .17)) * riverW(i) * .35, len = riverW(i) * (.25 + .4 * hash2(i, 14));
      out.strokeStyle = hash2(i, 15) < .5 ? P.gold : P.peach; out.lineWidth = 1.6; out.globalAlpha = a2 * (.5 + .45 * hash2(i, 16));
      out.beginPath(); out.moveTo(x - len / 2 + o, y); out.lineTo(x + len / 2 + o, y + .5); out.stroke();
    }
    // ventanas de la ciudad: cada una con su período (4, 5, 6 o 7,5 s); la mayoría prendidas
    for (const win of windows) {
      const v = (Math.sin(TAU * (ts / win.period + win.phase)) + 1) / 2;
      if (v < .25 + win.bias * .35) continue;
      out.globalAlpha = a2 * (.55 + .45 * v) * (win.row === 0 ? .75 : 1);
      out.fillStyle = win.cold ? P.cyan : v > .75 ? P.gold : P.peach;
      out.fillRect(win.x, win.y, 3, 4);
    }
    // faroles y luz roja de las antenas (titila cada 2 s)
    for (const l of lamps) { out.globalAlpha = a2; glow(l.x, l.y - 10, 9, P.peach, .45); out.fillStyle = P.gold; out.fillRect(l.x - 1.5, l.y - 12, 3, 3); }
    for (const a of towers) { if (Math.sin(TAU * (ts / 2 + a.phase)) < 0) continue; out.globalAlpha = a2; glow(a.x, a.y, 7, P.magenta, .7); out.fillStyle = P.rose; out.fillRect(a.x - 1.2, a.y - 1.2, 2.4, 2.4); }
    out.globalAlpha = 1;

    // cerro, sendero y primer plano
    const a3 = reveal(.4, 1);
    // camino al pie de todas las pantallas: el tramo se repite desde detrás del cerro del hero
    {
      const pc = path[boil], [dx, dy] = shift(7), cam = camX(SPEED.front), sw = Math.round(PATH_P * k), pad = Math.round(60 * k);
      out.setTransform(1, 0, 0, 1, 0, 0); out.globalAlpha = a3;
      for (let i = Math.max(0, Math.floor((cam - PATH_S) / PATH_P)); PATH_S + i * PATH_P < cam + vw; i++) {
        out.drawImage(pc, pad, 0, sw, pc.height, Math.round((PATH_S + i * PATH_P - cam) * k) + dx, Math.round((PATH_TOP - oy) * k) + dy - margin, sw, pc.height);
      }
      out.globalAlpha = 1;
    }
    plane(front[boil], 7, SPEED.front, a3);
    // pasto: se mece en 3 poses cada 4 s, con una onda de viento de derecha a izquierda
    inWorld(7, SPEED.front); out.lineCap = "round"; out.globalAlpha = a3;
    for (const b of blades) {
      const wave = Math.sin(TAU * (ts / 4 + b.x / 500)), pose = wave > .4 ? 2 : wave > -.3 ? 1 : 0;
      const bend = b.lean - pose * .22, tx = b.x + Math.sin(bend) * b.h, ty = b.y - Math.cos(bend) * b.h;
      out.strokeStyle = "#1c0838"; out.lineWidth = 1.2 + b.h * .05;
      out.beginPath(); out.moveTo(b.x, b.y); out.quadraticCurveTo(b.x + Math.sin(bend) * b.h * .2, b.y - b.h * .6, tx, ty); out.stroke();
      if (b.tip) { out.strokeStyle = P.peach; out.lineWidth = 1.4; out.beginPath(); out.moveTo(lerp(b.x, tx, .7), lerp(b.y, ty, .7)); out.lineTo(tx, ty); out.stroke(); }
    }
    // luciérnagas: trayectorias cerradas de 20 s
    for (const f of flies) {
      const x = f.cx + f.ax * Math.sin(TAU * (ts / 20 + f.p)), y = f.cy + f.ay * Math.sin(TAU * (ts / 10 + f.q)), on = (Math.sin(TAU * (ts / 4 + f.q)) + 1) / 2;
      out.globalAlpha = a3; glow(x, y, 16, P.peach, .25 + .35 * on);
      out.fillStyle = P.gold; out.beginPath(); out.arc(x, y, 2 + on, 0, TAU); out.fill();
    }
    out.globalAlpha = 1;

    out.setTransform(1, 0, 0, 1, 0, 0);
  }

  return { resize, draw };
}

// ---------------------------------------------------------------- montaje
/**
 * Monta el fondo en `el` (posicionado): canvas absoluto detrás del contenido, tipo cover.
 * `setPan(px)` mueve la cámara a la derecha según el desplazamiento horizontal del contenido (px CSS).
 */
export function mountHero(el, { reducedMotion } = {}) {
  const reduced = reducedMotion ?? window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scene = createHeroSunset();
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;background:" + PALETTE.ink;
  el.appendChild(canvas);
  const out = canvas.getContext("2d");

  let size = "", ratio = 1, scale = 1, panCss = 0;
  const layout = () => {
    const box = el.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    // resolución con tope: el trazo a mano no necesita más y los planos se guardan anchos y x3
    // (en pantallas chicas, 1.25x, para no pasar de ~70 MB de lienzos)
    const r = Math.min(dpr, box.width < 700 ? 1.25 : 2, Math.sqrt(2.4e6 / Math.max(1, box.width * box.height)));
    const w = Math.max(1, Math.round(box.width * r)), h = Math.max(1, Math.round(box.height * r));
    if (`${w}x${h}` === size) return false;
    size = `${w}x${h}`; canvas.width = w; canvas.height = h; ratio = w / Math.max(1, box.width);
    scale = scene.resize(w, h).scale;
    return true;
  };
  const pan = () => panCss * ratio / scale;

  // parallax: única entrada externa; el puntero se suaviza con la curva EASE
  const fine = !reduced && window.matchMedia("(pointer: fine)").matches;
  const par = { fx: 0, fy: 0, tx: 0, ty: 0, t0: 0 };
  const onPointer = (e) => {
    const now = performance.now(), q = ease(clamp((now - par.t0) / 900));
    par.fx += (par.tx - par.fx) * q; par.fy += (par.ty - par.fy) * q;
    par.tx = clamp(e.clientX / window.innerWidth * 2 - 1, -1, 1); par.ty = clamp(e.clientY / window.innerHeight * 2 - 1, -1, 1); par.t0 = now;
  };

  let raf = 0, start = 0, visible = true, destroyed = false;
  const frame = (now) => {
    raf = 0;
    if (destroyed || !visible || document.hidden) return;
    if (!start) start = now;
    const elapsed = (now - start) / 1000, q = ease(clamp((now - par.t0) / 900));
    scene.draw(out, elapsed % LOOP, ease(clamp(elapsed / ENTRY)), par.fx + (par.tx - par.fx) * q, par.fy + (par.ty - par.fy) * q, pan());
    raf = requestAnimationFrame(frame);
  };
  const resume = () => { if (!reduced && !raf && !destroyed && visible && !document.hidden) raf = requestAnimationFrame(frame); };
  const still = () => scene.draw(out, 0, 1, 0, 0, pan());

  layout();
  if (reduced) still();
  let resizeTimer = 0;
  const resize = new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (layout() && (reduced || !raf)) still(); }, 120); });
  resize.observe(el);
  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; resume(); });
  io.observe(el);
  const onVisibility = () => resume();
  document.addEventListener("visibilitychange", onVisibility);
  if (fine) window.addEventListener("pointermove", onPointer, { passive: true });
  resume();

  return {
    canvas,
    setPan(px) {
      if (px === panCss) return;
      panCss = px;
      if (reduced) still();   // sin animación: el cuadro fijo se redibuja solo cuando se mueve la vista
    },
    destroy() {
      destroyed = true; cancelAnimationFrame(raf); clearTimeout(resizeTimer); resize.disconnect(); io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      canvas.remove();
    },
  };
}
