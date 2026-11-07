"use client";

import { useEffect, useRef } from "react";
import { isCalm } from "@/lib/motion";

// Video de un proyecto: mudo y en bucle, se descarga y reproduce solo mientras está en pantalla.
export function HomeProjectVideo({ src, poster }: { src: string; poster?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !isCalm()) video.play().catch(() => undefined);
      else video.pause();
    }, { threshold: .25 });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return <video ref={ref} src={src} poster={poster || undefined} muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1}/>;
}
