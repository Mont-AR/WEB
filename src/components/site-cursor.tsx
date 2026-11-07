"use client";

import { useEffect, useRef } from "react";
import { isCalm } from "@/lib/motion";

// Puntero animado de todo el sitio, en pixel art: flecha, mano sobre lo que se puede clickear y flecha
// con una "i" sobre lo que solo muestra información (las tarjetas de "¿Qué hago?"). Deja una estela
// de píxeles al moverse y una chispa al hacer clic. Solo con mouse (pointer: fine); en los campos de
// texto vuelve el cursor del sistema. Con las animaciones apagadas (lib/motion.ts) vuelve el puntero del sistema (globals.css).
const ARROW = [
  "B.........", "BB........", "BWB.......", "BWWB......", "BWWWB.....", "BWWWWB....", "BWWWWWB...", "BWWWWWWB..",
  "BWWWWWWWB.", "BWWWWWBBBB", "BWWBWWB...", "BWB.BWWB..", "BB..BWWB..", "B....BWWB.", ".....BWWB.", "......BB..",
];
const HAND = [
  "....BB......", "...BWWB.....", "...BWWB.....", "...BWWB.....", "...BWWBBB...", "...BWWBWWBB.", ".BBBWWBWWBWB", "BWWBWWWWWBWB",
  "BWWWWWWWWWWB", ".BWWWWWWWWWB", "..BWWWWWWWWB", "..BWWWWWWWB.", "...BWWWWWWB.", "...BWWWWWB..", "....BBBBBB..",
];
const INFO = ["..CCCCC..", ".CCCWCCC.", "CCCCCCCCC", "CCCCWCCCC", "CCCCWCCCC", "CCCCWCCCC", ".CCCWCCC.", "..CCCCC.."];
const COLORS: Record<string, string> = { B: "#0d0a3d", W: "#fff6d9", C: "#61f7e7" };
const PX = 2;
const TRAIL = ["#61f7e7", "#e42a9b", "#ffb77e", "#b48cff"];

function Sprite({ rows, x = 0, y = 0 }: { rows: string[]; x?: number; y?: number }) {
  return <>{rows.flatMap((row, j) => [...row].map((c, i) => c === "." ? null
    : <rect key={`${x}-${i}-${j}`} x={x + i * PX} y={y + j * PX} width={PX} height={PX} fill={COLORS[c]}/>))}</>;
}

export function SiteCursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = ref.current;
    if (!cursor || !window.matchMedia("(pointer: fine)").matches) return;
    const root = document.documentElement;
    root.classList.add("has-cursor");
    const pool = Array.from({ length: 10 }, () => { const d = document.createElement("i"); d.className = "cursor-bit"; d.setAttribute("aria-hidden", "true"); document.body.appendChild(d); return d; });
    let next = 0, lastBit = 0, lastX = 0, lastY = 0;

    const spark = (x: number, y: number, dx: number, dy: number, color: string, ms: number) => {
      const d = pool[next++ % pool.length];
      d.style.background = color;
      d.animate([{ transform: `translate(${x}px,${y}px) scale(1)`, opacity: 1 }, { transform: `translate(${x + dx}px,${y + dy}px) scale(.3)`, opacity: 0 }], { duration: ms, easing: "steps(4)" });
    };
    const kindOf = (el: Element | null) => {
      if (!el) return "arrow";
      if (el.closest("input:not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=button]), textarea, [contenteditable]")) return "text";
      if (el.closest(".home-slide")) return "info";
      if (el.closest("a, button, select, label, summary, [role=button]")) return "link";
      return "arrow";
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const { clientX: x, clientY: y } = event;
      cursor.style.transform = `translate3d(${x}px,${y}px,0)`;
      cursor.dataset.kind = kindOf(event.target as Element);
      cursor.dataset.visible = "";
      const now = performance.now();
      if (!isCalm() && now - lastBit > 34 && Math.hypot(x - lastX, y - lastY) > 6) {
        lastBit = now;
        spark(x + 4, y + 4, (lastX - x) * .3, (lastY - y) * .3 + 6, TRAIL[Math.floor(now / 34) % TRAIL.length], 420);
      }
      lastX = x; lastY = y;
    };
    const click = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || isCalm()) return;
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; spark(event.clientX - 2, event.clientY - 2, Math.cos(a) * 18, Math.sin(a) * 18, TRAIL[i % TRAIL.length], 360); }
    };
    const leave = () => { delete cursor.dataset.visible; };
    // al scrollear cambia lo que hay debajo del puntero aunque el mouse esté quieto
    let frame = 0;
    const rescan = () => { frame = 0; cursor.dataset.kind = kindOf(document.elementFromPoint(lastX, lastY)); };
    const scroll = () => { if (!frame && cursor.dataset.visible !== undefined) frame = requestAnimationFrame(rescan); };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", click, { passive: true });
    document.addEventListener("mouseleave", leave);
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", click);
      document.removeEventListener("mouseleave", leave);
      pool.forEach((d) => d.remove());
      root.classList.remove("has-cursor");
    };
  }, []);

  return <div ref={ref} className="site-cursor" aria-hidden="true">
    <svg className="cursor-arrow" width={10 * PX} height={16 * PX} shapeRendering="crispEdges"><Sprite rows={ARROW}/></svg>
    <svg className="cursor-hand" width={12 * PX} height={15 * PX} shapeRendering="crispEdges"><Sprite rows={HAND}/></svg>
    <svg className="cursor-info" width={20 * PX} height={16 * PX} shapeRendering="crispEdges"><Sprite rows={ARROW}/><Sprite rows={INFO} x={10 * PX} y={8 * PX}/></svg>
  </div>;
}
