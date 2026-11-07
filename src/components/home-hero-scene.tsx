"use client";

import { useEffect, useRef } from "react";
import { content } from "@/lib/content";
import { isCalm, MOTION_EVENT } from "@/lib/motion";

// Paisaje de fondo del inicio: atardecer dibujado a mano en código (src/lib/hero-sunset.js, cargado
// aparte para no sumar al JS inicial). La cámara sigue el avance horizontal de las pantallas
// (evento "home:pan" de home-scroll.tsx) y cada plano se desplaza a su velocidad. Cuando el paisaje
// dibujó su primer cuadro marca .home[data-ready] y se va el loader (con un tope por si algo falla).
// Con las animaciones apagadas (html.calm, lib/motion.ts) el paisaje no se carga: queda el fondo liso
// de .home-hero-scene (home.css) y no hay loader. Si se encienden, se carga y aparece con un
// fundido; si se apagan, se desmonta.
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
    let hero: Hero | undefined, loading = 0, pan = 0, roadEnd: number | null = null, sent = false;
    const ready = () => el.closest(".home")?.setAttribute("data-ready", "");
    const fallback = window.setTimeout(ready, READY_FALLBACK);
    const onPan = (e: Event) => { pan = (e as CustomEvent<number>).detail; hero?.setPan(pan); };
    const onRoadEnd = (e: Event) => { roadEnd = (e as CustomEvent<number>).detail; hero?.setRoadEnd(roadEnd); };
    const onMail = (e: Event) => { sent = (e as CustomEvent<boolean>).detail; hero?.setMail(sent); };
    // el formulario pregunta dónde está la puerta: el evento es síncrono y la respuesta vuelve en detail
    const onMailPoint = (e: Event) => { const point = hero?.mailPoint(); if (point) Object.assign((e as CustomEvent<object>).detail, point); };

    // cada carga lleva un número: si mientras llega el script se apagan las animaciones, se descarta
    const mount = () => {
      if (hero || loading) return;
      const ticket = loading = Date.now();
      import("@/lib/hero-sunset").then(({ mountHero }) => {
        if (loading !== ticket) return;
        loading = 0;
        hero = mountHero(el, { mailLabel: content.marca.nombre, reducedMotion: false }) as Hero;
        hero.setPan(pan);
        if (roadEnd !== null) hero.setRoadEnd(roadEnd);
        if (sent) hero.setMail(true);
        requestAnimationFrame(() => requestAnimationFrame(ready));
      }).catch(() => { loading = 0; ready(); });
    };
    const unmount = () => { loading = 0; hero?.destroy(); hero = undefined; };
    const onMotion = () => { if (isCalm()) unmount(); else mount(); };

    window.addEventListener("home:pan", onPan);
    window.addEventListener("home:road-end", onRoadEnd);
    window.addEventListener("home:mail", onMail);
    window.addEventListener("home:mail-point", onMailPoint);
    window.addEventListener(MOTION_EVENT, onMotion);
    // apagadas desde el principio: nada que esperar, se va el loader y queda el fondo liso
    if (isCalm()) ready(); else mount();
    return () => { window.clearTimeout(fallback); window.removeEventListener("home:pan", onPan); window.removeEventListener("home:road-end", onRoadEnd); window.removeEventListener("home:mail", onMail); window.removeEventListener("home:mail-point", onMailPoint); window.removeEventListener(MOTION_EVENT, onMotion); unmount(); };
  }, []);

  return <div ref={ref} className="home-hero-scene" aria-hidden="true"/>;
}
