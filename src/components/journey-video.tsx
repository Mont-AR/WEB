"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { JOURNEY } from "@/lib/journey-config";

type Props = {
  /** Segundos de animación que corresponden a la posición de scroll actual. */
  timeRef: RefObject<number>;
  /** Etapa activa: elige el póster mientras el video todavía no está listo. */
  stage: number;
};

// Video pre-renderizado usado como cabezal de reproducción: nunca se reproduce solo;
// cada fotograma se busca a partir del tiempo que dicta el scroll.
export function JourneyVideo({ timeRef, stage }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    let objectUrl = "";
    let frame = 0;
    // Se descarga completo para que buscar fotogramas (también hacia atrás) sea inmediato.
    fetch(JOURNEY.video)
      .then((response) => response.ok ? response.blob() : Promise.reject(new Error(String(response.status))))
      .then((blob) => { if (cancelled) return; objectUrl = URL.createObjectURL(blob); video.src = objectUrl; })
      .catch(() => { if (!cancelled) video.src = JOURNEY.video; });

    const keepPaused = () => { if (!video.paused) video.pause(); };
    // Safari en iOS solo pinta fotogramas buscados después de iniciar el decodificador.
    const prime = () => { video.play().then(keepPaused, () => undefined); };
    const markReady = () => setReady(true);
    video.addEventListener("play", keepPaused);
    video.addEventListener("loadedmetadata", prime, { once: true });
    video.addEventListener("loadeddata", markReady, { once: true });

    const last = JOURNEY.duration - .5 / JOURNEY.fps;
    let pan = "";
    const tick = () => {
      const time = timeRef.current ?? 0;
      if (video.readyState >= 1 && !video.seeking) {
        // centro del fotograma para que todos los navegadores muestren el mismo cuadro
        const target = Math.min(last, (Math.floor(time * JOURNEY.fps) + .5) / JOURNEY.fps);
        if (Math.abs(video.currentTime - target) > .25 / JOURNEY.fps) video.currentTime = target;
      }
      // En pantallas verticales el encuadre acompaña al explorador (solo lo usa el CSS en vertical).
      const k = Math.min(1, time / JOURNEY.duration);
      const next = `${(JOURNEY.panStart + (JOURNEY.panEnd - JOURNEY.panStart) * k * k * (3 - 2 * k)).toFixed(1)}%`;
      if (next !== pan) { pan = next; video.style.setProperty("--pan", pan); }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      video.removeEventListener("play", keepPaused);
      video.removeEventListener("loadedmetadata", prime);
      video.removeEventListener("loadeddata", markReady);
      video.removeAttribute("src");
      video.load();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [timeRef]);

  return <video
    ref={videoRef}
    className={`journey-video ${ready ? "is-ready" : ""}`}
    poster={ready ? undefined : JOURNEY.posters[stage]}
    muted
    playsInline
    preload="auto"
    disablePictureInPicture
    disableRemotePlayback
    aria-hidden="true"
    tabIndex={-1}
  />;
}
