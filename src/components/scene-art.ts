import { cityLights } from "./city-lights";

/** Pixel shapes are authored in a 640 × 360 scene. No source image is loaded at runtime. */
export const SCENE_WIDTH = 640;
export const SCENE_HEIGHT = 360;

export type ExplorerPosition = { x: number; y: number; scale: number };
type Context = CanvasRenderingContext2D;

function noise(n: number): number {
  const value = Math.sin(n * 127.1 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function block(c: Context, x: number, y: number, w: number, h: number, color: string) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

function shape(c: Context, vertices: number[], color: string) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(vertices[0], vertices[1]);
  for (let i = 2; i < vertices.length; i += 2) c.lineTo(vertices[i], vertices[i + 1]);
  c.closePath();
  c.fill();
}

function clipped(c: Context, vertices: number[], paint: () => void) {
  c.save();
  c.beginPath();
  c.moveTo(vertices[0], vertices[1]);
  for (let i = 2; i < vertices.length; i += 2) c.lineTo(vertices[i], vertices[i + 1]);
  c.closePath();
  c.clip();
  paint();
  c.restore();
}

function stairStroke(c: Context, points: number[], color: string, thickness = 2) {
  for (let i = 0; i < points.length - 2; i += 2) {
    const x1 = points[i], y1 = points[i + 1], x2 = points[i + 2], y2 = points[i + 3];
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    for (let j = 0; j < steps; j += 2) {
      const t = j / steps;
      block(c, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 3, thickness, color);
    }
  }
}

function star(c: Context, x: number, y: number, size: number, color: string) {
  block(c, x - size * 2, y, size * 5, size, color);
  block(c, x, y - size * 2, size, size * 5, color);
  block(c, x, y, size, size, "#fff9e4");
}

function cloud(c: Context, x: number, baseline: number, width: number, height: number, seed: number) {
  const cell = 3;
  const columns = Math.ceil(width / cell);
  for (let column = 0; column < columns; column++) {
    const u = column / columns;
    const primary = Math.exp(-Math.pow((u - .32) / .22, 2));
    const secondary = Math.exp(-Math.pow((u - .74) / .18, 2));
    const silhouette = 3 + height * (.7 * primary + .48 * secondary) + (noise(seed * 31 + column * 3) - .5) * 7;
    if (silhouette < 7 && noise(seed * 43 + Math.floor(column / 4)) > .47) continue;
    const rows = Math.ceil(silhouette / cell);
    const scallop = Math.max(0, Math.floor(1.5 + Math.sin(column * .37 + seed) * 1.3 + noise(seed * 7 + Math.floor(column / 3)) * 2.7));
    for (let row = scallop; row < rows; row++) {
      if (row < 7 && noise(seed * 97 + Math.floor(column / 3) * 11 + Math.floor(row / 2)) > .89) continue;
      const px = x + column * cell;
      const py = baseline - row * cell + Math.floor(Math.sin(column * .31 + seed) * 1.5);
      const edge = row > rows - 3;
      const lit = row < 4 || (column + row) % 11 === 0;
      const tone = edge ? ["#650b78", "#8e0c87", "#ae108c"][Math.floor(noise(seed + column * 17 + row * 3) * 3)]
        : lit ? ["#f02a91", "#c71991", "#a21089"][Math.floor(noise(seed + column * 11 + row * 9) * 3)]
        : ["#940b88", "#aa0d8c", "#bb108e"][Math.floor(noise(seed + column * 5 + row * 13) * 3)];
      block(c, px, py, cell, cell, tone);
    }
  }
  for (let i = 0; i < 16; i++) {
    const px = x + noise(seed * 19 + i * 11) * width;
    const py = baseline + (i % 5) * 2;
    block(c, px, py, 3 + noise(i + seed) * 14, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? "#e12592" : "#8a0c80");
  }
}

export function drawAtmosphere(c: Context, time: number) {
  c.clearRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
  for (let i = 0; i < 380; i++) {
    const x = noise(i * 13 + 5) * SCENE_WIDTH;
    const y = noise(i * 29 + 31) * 175;
    const pulse = Math.sin(time * (0.7 + noise(i + 33) * 1.7) + i * 7);
    if (pulse < -.36) continue;
    block(c, x, y, i % 59 === 0 ? 2 : 1, 1, i % 9 === 0 ? "#6cecf7" : i % 3 === 0 ? "#f48cdd" : "#b942b5");
  }
  star(c, 145, 21, 2, "#f933c1");
  star(c, 354, 20, 2, "#fc69dc");
  star(c, 559, 21, 2, "#fb43c5");
  star(c, 190, 47, 1, "#b4e9ff");
  star(c, 484, 32, 1, "#b9d5ff");
  star(c, 317, 70, 1, "#fd7ac5");

  const cx = 470, cy = 162, radius = 44;
  const aura = c.createRadialGradient(cx, cy, 17, cx, cy, 108);
  aura.addColorStop(0, `rgba(255,153,79,${.3 + Math.sin(time * .8) * .025})`);
  aura.addColorStop(.52, "rgba(255,77,139,.17)");
  aura.addColorStop(1, "rgba(232,31,155,0)");
  c.fillStyle = aura;
  c.fillRect(cx - 109, cy - 109, 218, 218);
  c.save();
  c.beginPath(); c.arc(cx, cy, radius, 0, Math.PI * 2); c.clip();
  const sun = c.createLinearGradient(0, cy - radius, 0, cy + radius);
  sun.addColorStop(0, "#ffcf86"); sun.addColorStop(.62, "#ffab73"); sun.addColorStop(1, "#ff687f");
  c.fillStyle = sun; c.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  for (const [offset, thickness] of [[8, 2], [18, 2], [28, 3], [37, 4]]) {
    block(c, cx - radius, cy + offset, radius * 2, thickness, "#e54586");
  }
  c.restore();
}

function distantMountains(c: Context) {
  shape(c, [0,195,20,166,40,184,68,159,99,190,135,164,158,190,182,169,201,192,225,174,247,192,268,170,294,195,318,165,348,198,370,176,392,200,420,177,447,200,478,176,505,196,540,166,565,193,604,165,640,194,640,269,0,269], "#522589");
  shape(c, [0,210,36,178,63,200,98,171,132,206,177,178,213,209,250,181,280,212,322,171,361,211,393,175,422,214,456,180,493,213,541,171,588,216,640,182,640,270,0,270], "#33206f");
  for (let i = 0; i < 240; i++) {
    const x = noise(i * 7 + 10) * 640;
    const y = 174 + noise(i * 17 + 31) * 61;
    block(c, x, y, 2 + noise(i + 14) * 7, 1 + noise(i + 99) * 2, i % 4 === 0 ? "#99349a" : "#6e2e91");
  }
}

function peak(c: Context, px: number, py: number, left: number, right: number, bottom: number, seed: number, dark: string, lit: string) {
  const leftSpan = px - left, rightSpan = right - px;
  const mountain = [
    left,bottom,
    px-leftSpan*.82,py+72,
    px-leftSpan*.67,py+58,
    px-leftSpan*.54,py+64,
    px-leftSpan*.42,py+39,
    px-leftSpan*.31,py+44,
    px-leftSpan*.21,py+25,
    px-leftSpan*.13,py+28,
    px-8,py+12, px-3,py+3, px,py,
    px+5,py+9,
    px+rightSpan*.18,py+22,
    px+rightSpan*.26,py+37,
    px+rightSpan*.37,py+34,
    px+rightSpan*.49,py+54,
    px+rightSpan*.64,py+51,
    px+rightSpan*.83,py+72,
    right,bottom,
  ];
  shape(c, mountain, dark);
  clipped(c, mountain, () => {
    shape(c, [px,py,px+6,py+10,px+rightSpan*.18,py+22,px+rightSpan*.26,py+37,px+rightSpan*.37,py+34,px+rightSpan*.49,py+54,right,bottom,px+10,bottom], lit);
    shape(c, [px-2,py+7,px-10,py+17,px-23,py+42,px-17,py+48,px-38,py+72,px-33,py+77,px+4,py+39], "#7750ad");
    shape(c, [px+5,py+10,px+14,py+26,px+29,py+43,px+20,py+44,px+46,py+67,px+57,py+72,px+27,py+39], "#b1439c");
    for (let i = 0; i < 280; i++) {
      const x = left + noise(seed * 997 + i * 19) * (right - left);
      const y = py + noise(seed * 731 + i * 29) * (bottom - py);
      const side = x > px;
      const chosen = side
        ? ["#c34b9e", "#d965a4", "#853198", "#ed8b91", "#63258b"][Math.floor(noise(i * 11 + seed) * 5)]
        : ["#8051af", "#6542a4", "#553392", "#a762bb", "#281a66"][Math.floor(noise(i * 13 + seed) * 5)];
      block(c, x, y, 1 + noise(i * 2 + seed) * 4, 1 + noise(i * 3 + seed) * 2, chosen);
    }
    for (let i = 0; i < 120; i++) {
      const leftSide = i % 3 === 0;
      const spread = 4 + noise(i * 17 + seed) * (leftSide ? 58 : 71);
      const x = px + (leftSide ? -spread : spread);
      const y = py + 13 + noise(i * 23 + seed) * (bottom - py - 17);
      const bright = noise(i * 7 + seed) > .62;
      stairStroke(c, [x,y,x+(leftSide?-3:3),y+3,x+(leftSide?-8:8),y+8],bright?(leftSide?"#9a68c2":"#ea719c"):(leftSide?"#4d318a":"#8e399a"),1);
    }
    stairStroke(c, [px,py+2,px+10,py+16,px+20,py+27,px+26,py+43,px+40,py+51], "#ffac7e", 2);
    stairStroke(c, [px-2,py+5,px-13,py+22,px-24,py+33,px-35,py+49], "#9966c5", 2);
    stairStroke(c, [px+8,py+11,px+3,py+23,px+14,py+39,px+17,py+55], "#d84b9c", 2);
    stairStroke(c, [px+28,py+27,px+38,py+37,px+34,py+48,px+49,py+62], "#ed659f", 2);
  });
}

function mountains(c: Context) {
  distantMountains(c);
  peak(c, 277, 171, 202, 347, 250, 2, "#28195f", "#5d288b");
  peak(c, 337, 182, 263, 408, 251, 3, "#291666", "#6b2e9a");
  peak(c, 397, 153, 310, 512, 257, 7, "#25165f", "#6d2790");
  peak(c, 552, 161, 475, 631, 245, 11, "#25165f", "#642686");
  shape(c, [0,222,38,204,73,218,112,197,150,224,199,207,234,229,277,214,314,244,348,222,382,241,417,216,466,246,509,224,545,244,594,211,640,237,640,290,0,290], "#211254");
  for (let i = 0; i < 450; i++) {
    const x = noise(i * 13 + 4) * 640, y = 207 + noise(i * 7 + 32) * 46;
    block(c, x, y, 1 + noise(i * 19) * 5, 1 + noise(i * 31) * 2, i % 5 === 0 ? "#4f2178" : "#302064");
  }
}

function bush(c: Context, x: number, y: number, radius: number, seed: number, front = false) {
  const base = front ? "#070a2d" : "#0a0b35";
  shape(c, [x-radius,y+5,x-radius*.8,y-radius*.35,x-radius*.38,y-radius*.62,x,y-radius*.38,x+radius*.4,y-radius*.76,x+radius*.86,y-radius*.25,x+radius,y+5], base);
  for (let i = 0; i < radius * 8; i++) {
    const dx = (noise(seed * 73 + i * 17) - .5) * radius * 2;
    const dy = (noise(seed * 31 + i * 19) - .5) * radius * 1.35;
    if (Math.abs(dx) + Math.abs(dy) > radius * 1.45) continue;
    const palette = front ? ["#081039", "#141657", "#1d145b", "#3d1a6b", "#662075"] : ["#151044", "#231359", "#432073", "#702d7c", "#a33483"];
    block(c, x + dx, y + dy - radius * .28, 2 + noise(i + seed) * 4, 2 + noise(i * 3 + seed) * 4, palette[Math.floor(noise(seed * 5 + i * 23) * palette.length)]);
  }
}

function grass(c: Context, x: number, y: number, seed: number, warm = false) {
  const stems = 7 + Math.floor(noise(seed) * 5);
  for (let i = 0; i < stems; i++) {
    const dx = (i - stems / 2) * 2;
    const height = 4 + noise(seed * 17 + i * 13) * 10;
    const tip = x + dx + (noise(seed * 23 + i * 7) - .5) * 6;
    stairStroke(c, [x + dx,y,tip,y - height], warm && i % 3 === 0 ? "#e87871" : i % 2 === 0 ? "#19205a" : "#0a103a", 2);
    if (warm && i % 4 === 0) block(c, tip, y - height, 2, 2, "#ffac77");
  }
}

function city(c: Context) {
  shape(c, [0,256,40,249,73,260,114,248,145,258,177,246,221,252,260,239,295,250,332,237,363,251,401,239,438,250,486,236,521,252,555,231,609,247,640,241,640,302,0,302], "#130e45");
  shape(c, [0,267,77,260,139,268,186,254,227,265,272,252,325,261,379,251,429,261,466,244,518,258,583,245,640,257,640,292,0,292], "#251353");
  for (let i = 0; i < 155; i++) {
    const x = 36 + noise(i * 41 + 17) * 467;
    const base = 265 + noise(i * 9 + 47) * 30;
    const h = 3 + noise(i * 31 + 3) * 11;
    block(c, x, base - h, 1 + noise(i * 11 + 2) * 5, h, i % 3 === 0 ? "#24114d" : "#190c40");
  }
  // Two narrow illuminated settlements: one far across the valley and one along the near shore.
  shape(c, [190,252,219,245,251,250,282,241,313,246,350,237,383,248,407,244,432,254,415,261,207,262], "#21104e");
  for (let i = 0; i < 77; i++) {
    const x = 204 + noise(i * 19 + 3) * 215;
    const y = 239 + noise(i * 17 + 8) * 18;
    block(c, x, y, 1 + noise(i * 11) * 4, 1 + noise(i * 7) * 3, i % 3 === 0 ? "#3c1659" : "#170e43");
  }
  shape(c, [0,282,31,275,61,281,92,270,124,278,163,266,210,281,208,296,0,307], "#170e45");
  for (let i = 0; i < 610; i++) {
    const x = 18 + noise(i * 17 + 5) * 481;
    const y = 246 + noise(i * 43 + 2) * 45;
    block(c, x, y, 1 + noise(i * 7 + 5) * 3, 1, "#3b1757");
  }
  // Stepped neighborhoods following the far shore, rather than a single light strip.
  for (let terrace = 0; terrace < 4; terrace++) {
    const start = 218 - terrace * 9;
    const end = 418 - terrace * 15;
    const y = 242 + terrace * 5;
    shape(c, [start,y+2,start+19,y-2,start+44,y+1,start+78,y-3,start+112,y+1,end,y-1,end-9,y+5,start+7,y+6],
      terrace % 2 === 0 ? "#2e1556" : "#39175d");
    for (let i = 0; i < 68; i++) {
      const x = start + noise(terrace * 311 + i * 13) * (end - start);
      const py = y + noise(terrace * 197 + i * 17) * 5;
      const w = 1 + noise(i * 7 + terrace) * 3;
      block(c,x,py,w,1, i % 5 === 0 ? "#ff9b79" : i % 7 === 0 ? "#cf457f" : "#603071");
    }
  }
}

function nearShoreCity(c: Context) {
  shape(c, [0,279,23,273,48,275,71,270,95,274,121,267,147,270,172,264,202,269,225,275,218,290,190,289,169,296,143,292,119,303,90,298,69,305,44,299,23,306,0,299], "#130e40");
  for (let i = 0; i < 195; i++) {
    const x = 14 + noise(i * 37 + 12) * 202;
    const bank = 281 + Math.sin(x * .026) * 4 - x * .035;
    const y = bank + noise(i * 29 + 4) * 17;
    block(c,x,y,1 + noise(i * 7) * 3,1 + noise(i * 11) * 2,
      i % 11 === 0 ? "#ffb47d" : i % 6 === 0 ? "#fa6795" : "#4a225d");
  }
  for (let i = 0; i < 65; i++) {
    const x = 18 + noise(i * 31 + 6) * 192;
    const y = 274 + noise(i * 19 + 4) * 19;
    block(c,x,y,2 + noise(i * 13) * 5,1,"#d25284");
  }
}

function riverBounds(y: number): [number, number] {
  const knots = [
    [257, 385, 465], [268, 330, 453], [281, 270, 425], [294, 200, 400],
    [304, 150, 380], [317, 70, 340], [332, -15, 315], [360, -55, 293],
  ];
  for (let i = 0; i < knots.length - 1; i++) {
    const a = knots[i], b = knots[i + 1];
    if (y <= b[0]) {
      const t = Math.max(0, (y - a[0]) / (b[0] - a[0]));
      return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    }
  }
  return [-55, 293];
}

function river(c: Context) {
  shape(c, [352,257,407,257,427,268,405,281,373,294,355,304,330,317,309,332,293,360,0,360,0,332,77,317,180,304,235,294,269,281,317,268], "#422385");
  shape(c, [353,262,408,262,416,269,395,277,365,288,343,301,307,315,280,332,256,360,0,360,0,337,86,319,190,306,244,297,283,282,327,271], "#5837a2");
  shape(c, [351,260,407,260,421,267,402,273,368,275,353,283,322,290,294,290,267,298,242,301,269,294,291,284,326,278,345,267], "#fc8b78");
  shape(c, [331,271,375,268,399,270,361,278,337,282,313,283,297,290,270,290,292,281], "#ffb173");
  shape(c, [0,319,65,316,109,309,147,310,180,305,238,301,258,304,235,311,176,315,127,320,75,327,0,331], "#1e78b7");
  shape(c, [0,326,58,317,106,309,150,306,196,302,248,302,269,308,241,316,188,320,134,326,78,334,0,345], "#2959af");
  shape(c, [0,332,71,322,119,315,160,312,196,308,224,310,202,316,155,321,107,329,58,339,0,348], "#276eb9");
  shape(c, [0,339,48,328,96,323,134,318,161,318,118,326,72,336,0,350], "#3591c7");
  for (let i = 0; i < 195; i++) {
    const y = 264 + noise(i * 29 + 7) * 94;
    const [left, right] = riverBounds(y);
    const x = left + noise(i * 13 + 9) * (right - left);
    const width = 4 + noise(i * 3 + 14) * (y > 310 ? 28 : 19);
    const palette = y < 291 ? ["#ff9a79", "#ffba79", "#e65b99", "#a547a5"] : ["#216ab5", "#43a1cf", "#63c7d4", "#8c5db7", "#db679e"];
    block(c, x, y, width, i % 6 === 0 ? 3 : 1, palette[Math.floor(noise(i * 37 + 17) * palette.length)]);
  }
  for (let i = 0; i < 40; i++) {
    const y = 278 + i * 2.7;
    const [left, right] = riverBounds(y);
    block(c, left + (right - left) * (.22 + noise(i * 3) * .28), y, 8 + i * .7, i % 7 === 0 ? 2 : 1, i % 2 ? "#42b8d3" : "#2b76b5");
  }
}

function hillside(c: Context) {
  const hillsideShape = [441,265,477,239,500,221,531,205,554,183,576,178,595,164,622,167,640,171,640,360,304,360,358,322,397,292];
  shape(c, hillsideShape, "#080b32");
  clipped(c, hillsideShape, () => {
    for (let i = 0; i < 1150; i++) {
      const x = 307 + noise(i * 31 + 7) * 336;
      const y = 171 + noise(i * 11 + 33) * 188;
      const palette = ["#071039", "#0d1748", "#1f1656", "#242061", "#30206a", "#44216d", "#5e2573"];
      const value = noise(i * 23 + 14);
      const tone = noise(i * 5 + 10) > .975 ? "#bd4a7b" : palette[Math.min(palette.length - 1, Math.floor(value * palette.length))];
      block(c, x, y, 1 + noise(i * 17) * 6, 1 + noise(i * 19) * 4, tone);
    }
  });
  // A narrow trail cuts through the right slope, with the warm sun on its upper edge.
  const trail = [309,360,344,336,387,309,428,288,465,267,500,244,533,219,560,199,593,179,621,168,640,165,640,185,612,191,581,212,550,236,517,258,479,282,439,305,393,332,358,360];
  shape(c, trail, "#a75177");
  shape(c, [321,360,354,337,395,311,436,289,471,269,507,247,538,222,565,202,596,181,623,169,640,167,640,178,611,188,579,209,546,231,512,253,475,277,437,299,393,326,355,360], "#e98b76");
  shape(c, [340,360,372,339,414,314,451,291,488,269,524,244,556,221,585,198,616,178,640,172,640,183,609,194,576,216,544,239,509,264,469,289,425,318,386,344,367,360], "#8c416b");
  clipped(c, trail, () => {
    for (let i = 0; i < 620; i++) {
      const x = 306 + noise(i * 17 + 3) * 334;
      const y = 166 + noise(i * 37 + 9) * 194;
      const palette = ["#412052", "#65305d", "#954b69", "#ba6871", "#e98b70", "#3e2466"];
      block(c, x, y, 2 + noise(i * 5 + 2) * 7, 1 + noise(i * 11 + 4) * 3, palette[Math.floor(noise(i * 29 + 7) * palette.length)]);
    }
  });
  // Shrubs and jagged rocks frame the trail.
  for (const [x, y, r, s] of [[303,350,24,4],[326,337,16,7],[353,318,20,9],[385,300,16,11],[447,277,13,13],[478,253,12,16],[511,236,10,18],[591,203,15,20],[625,183,13,22],[570,305,26,24],[613,333,32,27],[636,276,24,30]]) {
    bush(c, x, y, r, s);
  }
  for (const [x, y, seed, warm] of [[353,335,3,1],[394,311,5,1],[432,288,7,1],[477,265,9,0],[509,244,11,1],[553,219,13,0],[595,197,15,1],[631,314,17,1],[556,343,19,1],[304,346,21,0]] as const) {
    grass(c, x, y, seed, warm === 1);
  }
  shape(c, [557,360,573,322,590,300,607,313,625,291,640,297,640,360], "#171144");
  for (let i = 0; i < 150; i++) {
    const x = 522 + noise(i * 23 + 6) * 118;
    const y = 271 + noise(i * 31 + 8) * 89;
    block(c, x, y, 2 + noise(i * 11) * 5, 1 + noise(i * 7) * 4, i % 7 === 0 ? "#a23d85" : i % 3 === 0 ? "#38205f" : "#0d123e");
  }
}

function frontFoliage(c: Context) {
  for (const [x, y, r, seed] of [[-3,357,25,1],[43,360,26,2],[90,363,28,3],[135,360,24,5],[175,365,27,6],[217,362,25,7],[262,365,23,8],[295,370,23,9],[631,352,32,13]]) {
    bush(c, x, y, r, seed, true);
  }
  for (let i = 0; i < 185; i++) {
    const x = noise(i * 19 + 7) * 640;
    const y = 332 + noise(i * 23 + 3) * 27;
    if (x > 317 && x < 545) continue;
    block(c, x, y, 2 + noise(i * 29) * 5, 2 + noise(i * 31) * 6, i % 9 === 0 ? "#692078" : "#080c34");
  }
}

export function drawLandscape(c: Context) {
  c.clearRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
  city(c);
  nearShoreCity(c);
}

export function drawLightEffects(c: Context, time: number) {
  const cityPalette = ["#ffd38b", "#ff9b70", "#f15c91", "#68d7db"];
  for (let i = 0; i < cityLights.length; i += 3) {
    const index = i / 3;
    const phase = Math.sin(time * (1.1 + noise(index * 11) * 2) + index * 17);
    if (phase < -.41) continue;
    block(c, cityLights[i], cityLights[i + 1], 1, 1, cityPalette[cityLights[i + 2]]);
  }
}

export function drawRiverEffects(c: Context, time: number) {
  for (let i = 0; i < 92; i++) {
    const y = 266 + noise(i * 31 + 4) * 89;
    const [left, right] = riverBounds(y);
    const span = Math.max(1, right - left);
    const x = left + ((noise(i * 17 + 9) * span + time * (7 + noise(i) * 11)) % span);
    const palette = y < 294 ? ["#ffb77c", "#fc6d94", "#eb5495"] : ["#46ccd4", "#2f8fc3", "#77e7d9"];
    block(c, x, y, 3 + noise(i * 13) * (y > 306 ? 16 : 10), i % 8 === 0 ? 2 : 1, palette[i % palette.length]);
  }
}

export function drawExplorer(c: Context, position: ExplorerPosition, time: number, moving: boolean) {
  const bob = moving ? Math.sin(time * 13) * 1.7 : Math.sin(time * 1.5) * .25;
  c.save();
  c.translate(Math.round(position.x), Math.round(position.y + bob));
  c.scale(position.scale, position.scale);
  // One leg plants on the trail while the rear foot lifts for the next step.
  shape(c,[-10,-36,0,-35,0,-19,-6,-10,-12,-14,-13,-22],"#14204b");
  shape(c,[-10,-14,-5,-12,-8,-4,-14,-1,-17,-7],"#203464");
  shape(c,[-17,-7,-10,-4,-9,0,-14,3,-19,-1,-21,-6],"#08091f");
  block(c,-21,-3,8,4,"#05051c");
  shape(c,[1,-35,11,-33,13,-22,9,-13,13,-8,12,-2,5,-4,3,-15],"#0d153d");
  shape(c,[8,-14,14,-10,15,-5,20,-4,19,1,11,1,7,-5],"#182852");
  shape(c,[13,-1,21,-1,23,4,18,6,10,4,10,1],"#08081f");
  block(c,17,4,7,3,"#05051c");
  stairStroke(c,[-7,-28,-7,-17,-10,-12],"#3b5180",1);
  stairStroke(c,[10,-28,11,-19,8,-13],"#e19568",1);
  // Jacket, lit by the sunset on the right.
  shape(c,[-8,-64,6,-62,13,-54,13,-34,7,-31,-10,-35,-12,-52],"#502151");
  block(c,4,-58,7,25,"#e67e5d");block(c,9,-53,3,16,"#ffae70");
  block(c,-8,-54,5,17,"#823660");block(c,-3,-61,7,25,"#c85f62");
  block(c,0,-39,11,5,"#311b48");
  shape(c,[10,-52,16,-48,17,-37,22,-31,19,-26,15,-28,11,-37],"#b34b58");
  stairStroke(c,[14,-49,17,-40,21,-31],"#ed8c61",2);
  shape(c,[18,-31,23,-29,25,-25,23,-22,18,-23,16,-27],"#f2a46b");
  block(c,22,-23,5,4,"#ffb579");
  // Neck, face and dark hair are seen from behind in three-quarter view.
  block(c,0,-68,13,10,"#f4a568");block(c,8,-67,6,12,"#ffbd73");
  block(c,11,-64,5,7,"#d66b5f");block(c,12,-66,2,2,"#0a0b2d");
  shape(c,[-11,-82,-5,-88,4,-87,10,-82,14,-84,18,-78,14,-74,10,-75,8,-66,-4,-67,-9,-72,-15,-71,-15,-79],"#120a27");
  block(c,-11,-85,12,4,"#1b0c29");block(c,-6,-88,9,4,"#29102f");
  block(c,8,-85,6,3,"#e9815e");block(c,14,-82,4,3,"#ffbd6b");
  block(c,-14,-75,5,9,"#0b0825");block(c,-9,-69,8,3,"#32143c");
  // Backpack with a luminous code panel and straps.
  block(c,-30,-62,23,39,"#061430");block(c,-31,-59,24,32,"#0a3455");
  block(c,-29,-61,20,4,"#1bc6ca");block(c,-29,-30,20,4,"#0db9bd");
  block(c,-27,-54,17,20,"#08213d");block(c,-26,-51,15,14,"#061a32");
  block(c,-31,-53,3,20,"#30e3d7");block(c,-9,-55,3,21,"#15b6b9");
  block(c,-25,-44,2,2,"#71ffe9");block(c,-23,-46,2,2,"#71ffe9");
  block(c,-23,-42,2,2,"#71ffe9");block(c,-20,-47,2,10,"#71ffe9");
  block(c,-16,-46,2,2,"#71ffe9");block(c,-14,-44,2,2,"#71ffe9");
  block(c,-16,-42,2,2,"#71ffe9");
  block(c,-9,-63,5,20,"#0d132d");block(c,-5,-59,3,25,"#19a6a7");
  c.restore();
}
