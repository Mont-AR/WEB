"use client";

import { useEffect, useRef } from "react";

// Paisaje de fondo del inicio: atardecer dibujado a mano en código (src/lib/hero-sunset.js, cargado
// aparte para no sumar al JS inicial). La cámara sigue el avance horizontal de las pantallas
// (evento "home:pan" de home-scroll.tsx) y cada plano se desplaza a su velocidad. Cuando el paisaje
// dibujó su primer cuadro marca .home[data-ready] y se va el loader (con un tope por si algo falla).
const READY_FALLBACK = 8000;

export function HomeHeroScene() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let hero: { destroy(): void; setPan(px: number): void } | undefined, cancelled = false, pan = 0;
    const ready = () => el.closest(".home")?.setAttribute("data-ready", "");
    const fallback = window.setTimeout(ready, READY_FALLBACK);
    const onPan = (e: Event) => { pan = (e as CustomEvent<number>).detail; hero?.setPan(pan); };
    window.addEventListener("home:pan", onPan);
    import("@/lib/hero-sunset").then(({ mountHero }) => {
      if (cancelled) return;
      hero = mountHero(el);
      hero.setPan(pan);
      requestAnimationFrame(() => requestAnimationFrame(ready));
    }).catch(ready);
    return () => { cancelled = true; window.clearTimeout(fallback); window.removeEventListener("home:pan", onPan); hero?.destroy(); };
  }, []);

  return <div ref={ref} className="home-hero-scene" aria-hidden="true"/>;
}
