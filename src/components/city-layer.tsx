"use client";

import { useEffect, useRef } from "react";
import { cityLights } from "./city-lights";

type Building = { x: number; base: number; width: number; height: number; near: boolean; roof: boolean };

function makeBuildings(): Building[] {
  let seed = 38471;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const buildings: Building[] = [];
  for (const [start, end, baseline, near] of [[215, 410, 258, 0], [35, 224, 299, 1]]) {
    for (let x = start; x < end;) {
      const width = (near ? 2.5 : 1.7) + random() * (near ? 3.7 : 2.8);
      const height = (near ? 3 : 2.5) + random() * (near ? 9 : 7);
      buildings.push({ x, base: baseline + Math.sin(x * .04) * 2, width, height, near: !!near, roof: random() > .86 });
      x += width + .8 + random() * 2.2;
    }
  }
  buildings.push(
    { x: 298, base: 257, width: 4, height: 15, near: false, roof: false },
    { x: 337, base: 258, width: 3, height: 13, near: false, roof: true },
    { x: 115, base: 299, width: 5, height: 16, near: true, roof: false },
  );
  return buildings;
}

const buildings = makeBuildings();
const lightColors = ["#ffd29c", "#ffad8c", "#ec8daf", "#a4bfd8"];

function drawCityBase(context: CanvasRenderingContext2D, width: number, height: number) {
  const sx = width / 640, sy = height / 360, unit = Math.min(sx, sy);
  const x = (value: number) => value * sx;
  const y = (value: number) => value * sy;

  const valley = context.createLinearGradient(0, y(240), 0, y(360));
  valley.addColorStop(0, "#28104e");
  valley.addColorStop(.48, "#170e3f");
  valley.addColorStop(1, "#080d32");
  context.fillStyle = valley;
  context.beginPath();
  [[0,242],[35,246],[74,245],[112,252],[151,249],[190,255],[229,251],[265,255],[303,252],[340,257],[381,255],[420,264],[445,288],[445,360],[0,360]].forEach(([px, py], index) => {
    if (index === 0) context.moveTo(x(px), y(py)); else context.lineTo(x(px), y(py));
  });
  context.closePath(); context.fill();

  const haze = context.createLinearGradient(0, y(237), 0, y(270));
  haze.addColorStop(0, "rgba(174,57,127,0)");
  haze.addColorStop(.52, "rgba(191,64,139,.12)");
  haze.addColorStop(1, "rgba(27,12,68,0)");
  context.fillStyle = haze;
  context.fillRect(0, y(237), x(430), y(36));

  // Low banks place the two clusters in the valley without creating a skyline wall.
  context.fillStyle = "#1b1046";
  context.beginPath();
  [[190,261],[217,256],[244,258],[270,253],[292,256],[320,251],[345,254],[372,250],[410,254],[425,267],[190,270]].forEach(([px, py], index) => {
    if (index === 0) context.moveTo(x(px), y(py)); else context.lineTo(x(px), y(py));
  });
  context.closePath(); context.fill();

  context.fillStyle = "#100f39";
  context.beginPath();
  [[0,300],[28,296],[57,300],[86,293],[118,296],[148,290],[181,294],[213,289],[230,305],[190,311],[99,314],[0,319]].forEach(([px, py], index) => {
    if (index === 0) context.moveTo(x(px), y(py)); else context.lineTo(x(px), y(py));
  });
  context.closePath(); context.fill();

  for (const building of buildings) {
    const bx = x(building.x), by = y(building.base);
    const bw = Math.max(1, building.width * sx), bh = building.height * sy;
    context.fillStyle = building.near ? "#11103b" : "#241348";
    context.fillRect(bx, by - bh, bw, bh);
    if (building.roof) {
      context.fillRect(bx + bw * .42, by - bh - Math.max(1, unit * 2), Math.max(1, unit * .65), Math.max(1, unit * 2));
    }
    if (Math.sin(building.x * 17) > -.42) {
      context.globalAlpha = building.near ? .83 : .73;
      context.fillStyle = lightColors[Math.floor(building.x * 3) % 4];
      context.fillRect(bx + bw * .34, by - bh * .48, Math.max(1, unit * .9), Math.max(1, unit * .85));
      context.globalAlpha = 1;
    }
  }
}

export function CityLayer({ reducedMotion }: { reducedMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const context = canvas?.getContext("2d");
    if (!canvas || !host || !context) return;
    const base = document.createElement("canvas");
    const baseContext = base.getContext("2d");
    if (!baseContext) return;
    let width = 0, height = 0, frame = 0, lastDraw = 0;

    const paint = (time: number) => {
      context.clearRect(0, 0, width, height);
      context.drawImage(base, 0, 0, width, height);
      const sx = width / 640, sy = height / 360, unit = Math.min(sx, sy);
      context.globalCompositeOperation = "screen";
      for (let i = 0; i < cityLights.length; i += 3) {
        const index = i / 3;
        const px = cityLights[i], py = cityLights[i + 1];
        const inFarCity = px >= 215 && px <= 410 && py >= 238 && py <= 263;
        const inNearCity = px <= 224 && py >= 283 && py <= 307;
        if ((!inFarCity && !inNearCity) || index % (inNearCity ? 2 : 3) !== 0) continue;
        const pulse = reducedMotion ? .67 : .59 + .17 * Math.sin(time * (1 + index % 4 * .24) + index * 9);
        context.globalAlpha = pulse;
        context.fillStyle = lightColors[cityLights[i + 2]];
        context.beginPath();
        context.arc(px * sx, py * sy, Math.max(.8, unit * .52), 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
    };
    const resize = () => {
      width = host.clientWidth;
      height = host.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2, 4096 / Math.max(1, width), 2304 / Math.max(1, height));
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      base.width = canvas.width;
      base.height = canvas.height;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      baseContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      drawCityBase(baseContext, width, height);
      paint(0);
    };
    const animate = (time: number) => {
      if (time - lastDraw > 70) { paint(time / 1000); lastDraw = time; }
      frame = requestAnimationFrame(animate);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    if (!reducedMotion) frame = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [reducedMotion]);

  return <canvas ref={canvasRef} className="city-layer" aria-hidden="true" />;
}
