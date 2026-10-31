"use client";

import { useEffect } from "react";

// Scroll horizontal del inicio: el scroll vertical (rueda, dedo, teclado) mueve la pista de pantallas
// hacia la derecha. La altura del riel se calcula para que cada px de scroll sea un px de avance; las
// pantallas con data-hold se detienen ese tramo (en alturas de pantalla; data-hold-wide en desktop)
// con su borde izquierdo alineado y reciben el progreso del tramo en --p. Los [data-scene] reciben
// --p según su posición horizontal: 0 cuando asoman por la derecha, 1 cuando salen por la
// izquierda. Además publica el avance para el parallax del paisaje (evento "home:pan", px) y para el
// CSS (--xr, en pantallas).
// Transiciones: entre pantallas no se queda a mitad de camino. Apenas la vista empieza a moverse
// entre dos puntos de anclaje (el comienzo de cada pantalla o panel), completa sola el pase en la
// dirección del scroll, como el cambio de pantalla de un juego; mientras dura (y mientras siga la
// inercia de la rueda) el scroll del usuario queda en pausa.
// Con el teclado, el foco dentro de la pista lleva el scroll hasta la pantalla de ese elemento; los
// enlaces a una pantalla (#contact) también, con scroll suave.
// Sin JS, la pista se recorre con scroll horizontal nativo (ver .home-stage en home.css).
type Step = { el: HTMLElement; y0: number; hold: number; x0: number; move: number };
const PASS_MS = 750;      // duración de un pase de una pantalla completa
const QUIET_MS = 220;     // pausa sin rueda que da por terminada la inercia después de un pase
const ease = (t: number) => (t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function HomeScroll() {
  useEffect(() => {
    const home = document.querySelector<HTMLElement>(".home");
    const rail = home?.querySelector<HTMLElement>(".home-rail");
    const stage = rail?.querySelector<HTMLElement>(".home-stage");
    const track = stage?.querySelector<HTMLElement>(".home-track");
    if (!home || !rail || !stage || !track) return;
    const screens = [...track.querySelectorAll<HTMLElement>("[data-screen]")];
    const scenes = [...track.querySelectorAll<HTMLElement>("[data-scene]")];
    const last = new Map<HTMLElement, string>();
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let steps: Step[] = [], snaps: number[] = [], total = 0, frame = 0, x = -1;
    let auto = 0, quietUntil = 0, lastY = window.scrollY, dir = 1;
    const leftIn = (el: HTMLElement) => { let l = 0; for (let e: HTMLElement | null = el; e && e !== track; e = e.offsetParent as HTMLElement | null) l += e.offsetLeft; return l; };

    const set = (el: HTMLElement, value: number) => {
      const v = Math.min(1, Math.max(0, value)).toFixed(4);
      if (last.get(el) !== v) { last.set(el, v); el.style.setProperty("--p", v); }
    };

    const measure = () => {
      home.classList.add("is-rail");
      const vw = stage.clientWidth, vh = window.innerHeight, wide = window.matchMedia("(min-width: 1001px)").matches;
      home.style.setProperty("--vw", `${vw}px`);
      const maxX = Math.max(0, track.scrollWidth - vw);
      steps = []; let y = 0;
      for (const el of screens) {
        const x0 = Math.min(el.offsetLeft, maxX), hold = parseFloat((wide && el.dataset.holdWide) || el.dataset.hold || "0") * vh;
        const move = Math.min(el.offsetLeft + el.offsetWidth, maxX) - x0;
        steps.push({ el, y0: y, hold, x0, move: Math.max(0, move) });
        y += hold + Math.max(0, move);
      }
      total = y;
      rail.style.height = `${total + vh}px`;
      // anclajes: el comienzo de cada pantalla y panel; en secciones más anchas que la vista, cada paso
      const xs = [0, maxX];
      for (const el of track.querySelectorAll<HTMLElement>("[data-screen], .home-panel")) xs.push(Math.min(maxX, leftIn(el)));
      for (const el of track.querySelectorAll<HTMLElement>(".home-step")) {
        const section = el.closest<HTMLElement>("[data-screen]");
        if (section && section.offsetWidth > vw + 1) xs.push(Math.min(maxX, Math.max(0, leftIn(el) - (vw - el.offsetWidth) / 2)));
      }
      snaps = xs.map(Math.round).sort((a, b) => a - b).filter((v, i, all) => i === 0 || v - all[i - 1] > 2);
      x = -1;
    };
    // scroll vertical (relativo al riel) en el que la vista queda en x; en un anclaje con tramo
    // detenido, yendo hacia adelante llega al principio del tramo y hacia atrás, al final
    const yAt = (tx: number, d: number) => {
      const at = steps.filter((s) => Math.abs(tx - s.x0) < 1);
      if (at.length) return d > 0 ? at[0].y0 : at[at.length - 1].y0 + at[at.length - 1].hold;
      const s = steps.find((st) => tx > st.x0 && tx <= st.x0 + st.move + .5);
      return s ? s.y0 + s.hold + (tx - s.x0) : total;
    };
    const animateTo = (top: number, ms: number) => {
      cancelAnimationFrame(auto);
      if (calm || ms <= 0) { auto = 0; quietUntil = performance.now() + QUIET_MS; window.scrollTo({ top, behavior: "instant" }); return; }
      const from = window.scrollY, t0 = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / ms);
        window.scrollTo({ top: from + (top - from) * ease(k), behavior: "instant" });
        if (k < 1) auto = requestAnimationFrame(tick);
        else { auto = 0; quietUntil = now + QUIET_MS; }
      };
      auto = requestAnimationFrame(tick);
    };

    const update = () => {
      frame = 0;
      const vw = stage.clientWidth;
      const y = Math.min(total, Math.max(0, window.scrollY - rail.offsetTop));
      let nx = steps.length ? steps[steps.length - 1].x0 + steps[steps.length - 1].move : 0;
      for (const s of steps) {
        if (s.hold) set(s.el, (y - s.y0) / s.hold);
        if (y < s.y0 + s.hold) { nx = s.x0; break; }
        if (y < s.y0 + s.hold + s.move) { nx = s.x0 + (y - s.y0 - s.hold); break; }
      }
      if (nx !== x) {
        x = nx;
        track.style.transform = `translate3d(${-x}px,0,0)`;
        home.style.setProperty("--xr", (x / vw).toFixed(4));
        window.dispatchEvent(new CustomEvent("home:pan", { detail: x }));
      }
      for (const el of scenes) {
        const r = el.getBoundingClientRect();
        if (r.right < -vw || r.left > 2 * vw) continue;
        set(el, (vw - r.left) / (vw + r.width));
      }
      // ¿la vista quedó entre dos anclajes? completar el pase en la dirección del scroll
      const sy = window.scrollY;
      if (sy !== lastY) { dir = sy > lastY ? 1 : -1; lastY = sy; }
      if (auto || performance.now() < quietUntil || snaps.some((v) => Math.abs(v - x) <= 1)) return;
      const next = snaps.findIndex((v) => v > x);
      if (next <= 0) return;
      const target = dir > 0 ? snaps[next] : snaps[next - 1];
      animateTo(rail.offsetTop + yAt(target, dir), Math.min(900, Math.max(280, Math.abs(target - x) / vw * PASS_MS)));
    };
    // durante un pase (y su inercia) la rueda, el dedo y las teclas de scroll no mueven la página
    const busy = () => auto !== 0 || performance.now() < quietUntil;
    const onWheel = (event: WheelEvent) => { if (!busy()) return; event.preventDefault(); if (!auto) quietUntil = performance.now() + QUIET_MS; };
    const onTouch = (event: TouchEvent) => { if (busy()) event.preventDefault(); };
    const onKey = (event: KeyboardEvent) => { if (busy() && ["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "Home", "End"].includes(event.key) && !(event.target as HTMLElement).closest("input, textarea, select")) event.preventDefault(); };
    const request = () => { if (!frame) frame = requestAnimationFrame(update); };
    // scroll de la página que deja alineado el panel de un elemento (al terminar su tramo detenido)
    const scrollFor = (target: HTMLElement) => {
      const panel = target.closest<HTMLElement>(".home-panel, [data-screen]");
      if (!panel) return null;
      let left = 0;
      for (let el: HTMLElement | null = panel; el && el !== track; el = el.offsetParent as HTMLElement | null) left += el.offsetLeft;
      const tx = Math.min(left, steps.length ? steps[steps.length - 1].x0 + steps[steps.length - 1].move : 0);
      const step = steps.find((s) => tx <= s.x0 + s.move) ?? steps[steps.length - 1];
      return step ? { x: tx, top: rail.offsetTop + step.y0 + step.hold + Math.max(0, tx - step.x0) } : null;
    };
    // foco con teclado: llevar la vista al panel del elemento (y que el escenario no se desplace solo)
    const onFocus = (event: FocusEvent) => {
      stage.scrollLeft = 0;
      const to = scrollFor(event.target as HTMLElement);
      if (to && Math.abs(to.x - x) > 2) animateTo(to.top, 0);
    };
    const goToHash = (hash: string, smooth: boolean) => {
      const target = hash.length > 1 ? track.querySelector<HTMLElement>(hash) : null;
      const to = target && scrollFor(target);
      if (!to) return false;
      animateTo(to.top, smooth ? Math.min(1600, Math.max(600, Math.abs(to.x - x) / stage.clientWidth * 260)) : 0);
      return true;
    };
    const onClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link || !goToHash(link.getAttribute("href") ?? "", true)) return;
      event.preventDefault();
      history.replaceState(null, "", link.getAttribute("href"));
    };
    const onStageScroll = () => { if (stage.scrollLeft) stage.scrollLeft = 0; };
    const relayout = () => { measure(); update(); };

    relayout();
    if (location.hash) { stage.scrollLeft = 0; goToHash(location.hash, false); }
    document.fonts?.ready.then(relayout);
    const resize = new ResizeObserver(relayout);
    resize.observe(track);
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", relayout);
    track.addEventListener("focusin", onFocus);
    stage.addEventListener("scroll", onStageScroll);
    home.addEventListener("click", onClick);
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchmove", onTouch, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(auto);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("keydown", onKey);
      home.removeEventListener("click", onClick);
      track.removeEventListener("focusin", onFocus);
      stage.removeEventListener("scroll", onStageScroll);
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", relayout);
      home.classList.remove("is-rail");
    };
  }, []);

  return null;
}
