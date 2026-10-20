import timeline from "./journey-timeline.json";
import { heroContent, projectContent, servicesContent, startingContent } from "./content";

// Única configuración del recorrido. Los tiempos provienen de la misma línea de tiempo con la
// que se renderizó el video (tools/journey), así que no se duplican en los componentes.
const milestone = (id: string) => {
  const m = timeline.milestones.find((item) => item.id === id);
  if (!m) throw new Error(`Hito desconocido: ${id}`);
  return m;
};

export const JOURNEY = {
  duration: timeline.duration,
  fps: 30, // cadencia del video web (el máster de 60 fps queda en out/)
  video: "/video/montar-journey.mp4",
  posters: [0, 1, 2, 3].map((index) => `/video/montar-journey-poster-${index}.webp`),
  // Recorrido del scroll: alto por segundo de animación y tramo final estable en la cima.
  vhPerSecond: 48,
  endHoldVh: 70,
  // Encuadre horizontal en pantallas verticales: del inicio del sendero a la cima.
  panStart: 78,
  panEnd: 100,
} as const;

export type StageId = "home" | "servicios" | "necesidad" | "proyecto";

// Cada etapa empieza cuando el explorador toca el hito correspondiente (fotograma de contacto).
// `anchor` es el punto al que llevan la navegación y las tarjetas: la recogida ya terminó.
export const STAGES: { id: StageId; label: string; start: number; anchor: number }[] = [
  { id: "home", label: heroContent.stageLabel, start: 0, anchor: 0 },
  { id: "servicios", label: servicesContent.stageLabel, start: milestone("gear").contact, anchor: milestone("gear").end },
  { id: "necesidad", label: startingContent.stageLabel, start: milestone("nodes").contact, anchor: milestone("nodes").end },
  { id: "proyecto", label: projectContent.stageLabel, start: milestone("summit").contact, anchor: timeline.duration },
];

const totalUnits = JOURNEY.duration * JOURNEY.vhPerSecond + JOURNEY.endHoldVh;

/** Alto total de la pista de scroll (incluye el viewport fijado). */
export const trackHeight = `calc(100svh + ${totalUnits}svh)`;

/** Progreso de la pista (0–1) → segundos de animación. El tramo final mantiene la cima. */
export function timeAtProgress(progress: number) {
  const units = Math.min(1, Math.max(0, progress)) * totalUnits;
  return Math.min(JOURNEY.duration, units / JOURNEY.vhPerSecond);
}

/** Segundos → progreso de la pista (para posicionar anclas de navegación). */
export function progressAtTime(seconds: number) {
  return Math.min(1, Math.max(0, seconds) * JOURNEY.vhPerSecond / totalUnits);
}

export function stageAtTime(seconds: number) {
  let index = 0;
  STAGES.forEach((stage, i) => { if (seconds >= stage.start) index = i; });
  return index;
}

export const formatStage = (index: number) => `${String(index + 1).padStart(2, "0")} / ${String(STAGES.length).padStart(2, "0")}`;
