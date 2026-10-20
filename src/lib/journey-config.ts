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
  // Cada etapa ocupa una pantalla de scroll; el scroll se ajusta (snap) a cada una.
  vhPerStage: 100,
  // Reproducción entre etapas con scroll: velocidad mínima (s de animación por s real) y
  // duración máxima de un trayecto largo.
  minSpeed: 1.4,
  maxTravel: 3.6,
  // Desde la navegación (barra inferior y botones) el recorrido es más ágil.
  navMinSpeed: 2.6,
  navMaxTravel: 2.2,
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

const segments = STAGES.length - 1;

/** Alto total de la pista de scroll (incluye el viewport fijado). */
export const trackHeight = `calc(100svh + ${segments * JOURNEY.vhPerStage}svh)`;

/** Progreso de la pista de cada etapa (0, 1/3, 2/3, 1): donde se ajusta el scroll. */
export const stageProgress = (index: number) => index / segments;

/**
 * Progreso de la pista (0–1) → tiempo de destino. Entre dos puntos de ajuste se interpola
 * entre los tiempos de sus etapas; en reposo el destino es siempre el ancla de una etapa.
 */
export function targetAtProgress(progress: number) {
  const p = Math.min(1, Math.max(0, progress)) * segments;
  const i = Math.min(segments - 1, Math.floor(p));
  return STAGES[i].anchor + (STAGES[i + 1].anchor - STAGES[i].anchor) * (p - i);
}
export function stageAtTime(seconds: number) {
  let index = 0;
  STAGES.forEach((stage, i) => { if (seconds >= stage.start) index = i; });
  return index;
}

export const formatStage = (index: number) => `${String(index + 1).padStart(2, "0")} / ${String(STAGES.length).padStart(2, "0")}`;
