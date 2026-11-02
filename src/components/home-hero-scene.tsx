"use client";

import { useEffect, useRef } from "react";
import { content } from "@/lib/content";

// Paisaje de fondo del inicio: atardecer dibujado a mano en código (src/lib/hero-sunset.js, cargado
// aparte para no sumar al JS inicial). La cámara sigue el avance horizontal de las pantallas
// (evento "home:pan" de home-scroll.tsx) y cada plano se desplaza a su velocidad. Cuando el paisaje
// dibujó su primer cuadro marca .home[data-ready] y se va el loader (con un tope por si algo falla).
// El camino termina en un buzón: home-scroll.tsx dice dónde ("home:road-end", px de la pista) y el
// formulario lo usa con "home:mail" (levantar la banderita) y "home:mail-point" (dónde está la puerta).
const READY_FALLBACK = 8000;

type Hero = {
  destroy(): void;
  setPan(px: number): void;
  setRoadEnd(px: number): void;
  setMail(sent: boolean): void;
  mailPoint(): { x: number; y: number } | null;
};

export function HomeHeroScene() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let hero: Hero | undefined, cancelled = false, pan = 0, roadEnd: number | null = null, sent = false;
    const ready = () => el.closest(".home")?.setAttribute("data-ready", "");
    const fallback = window.setTimeout(ready, READY_FALLBACK);
    const onPan = (e: Event) => { pan = (e as CustomEvent<number>).detail; hero?.setPan(pan); };
    const onRoadEnd = (e: Event) => { roadEnd = (e as CustomEvent<number>).detail; hero?.setRoadEnd(roadEnd); };
    const onMail = (e: Event) => { sent = (e as CustomEvent<boolean>).detail; hero?.setMail(sent); };
    // el formulario pregunta dónde está la puerta: el evento es síncrono y la respuesta vuelve en detail
    const onMailPoint = (e: Event) => { const point = hero?.mailPoint(); if (point) Object.assign((e as CustomEvent<object>).detail, point); };
    window.addEventListener("home:pan", onPan);
    window.addEventListener("home:road-end", onRoadEnd);
    window.addEventListener("home:mail", onMail);
    window.addEventListener("home:mail-point", onMailPoint);
    import("@/lib/hero-sunset").then(({ mountHero }) => {
      if (cancelled) return;
      hero = mountHero(el, { mailLabel: content.marca.nombre }) as Hero;
      hero.setPan(pan);
      if (roadEnd !== null) hero.setRoadEnd(roadEnd);
      if (sent) hero.setMail(true);
      requestAnimationFrame(() => requestAnimationFrame(ready));
    }).catch(ready);
    return () => { cancelled = true; window.clearTimeout(fallback); window.removeEventListener("home:pan", onPan); window.removeEventListener("home:road-end", onRoadEnd); window.removeEventListener("home:mail", onMail); window.removeEventListener("home:mail-point", onMailPoint); hero?.destroy(); };
  }, []);

  return <div ref={ref} className="home-hero-scene" aria-hidden="true"/>;
}
