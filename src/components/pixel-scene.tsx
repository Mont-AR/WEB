"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { CityLayer } from "./city-layer";
import { RiverLayer } from "./river-layer";
import {
  SCENE_HEIGHT,
  SCENE_WIDTH,
  drawExplorer,
  type ExplorerPosition,
} from "./scene-art";

const pathPoints: ExplorerPosition[] = [
  { x: 429, y: 304, scale: 1 },
  { x: 496, y: 258, scale: .78 },
  { x: 551, y: 218, scale: .58 },
  { x: 603, y: 175, scale: .43 },
];
const mobilePathPoints: ExplorerPosition[] = [
  { x: 429, y: 293, scale: .95 },
  { x: 440, y: 262, scale: .7 },
  { x: 485, y: 230, scale: .56 },
  { x: 550, y: 200, scale: .44 },
];

type Props = { step: number; reducedMotion: boolean };

const spriteCrops = [
  [308, 240, 633, 1018],
  [300, 145, 629, 1140],
  [298, 216, 606, 1027],
  [308, 205, 623, 1036],
  [292, 240, 641, 1004],
] as const;

const artVariants = {
  "cloud-bank": [1076, 2152, 4304],
  "mountain-range": [1035, 2069, 4138],
  trail: [836, 1672, 4180],
} as const;

function ArtImage({ name, className, sizes }: { name: keyof typeof artVariants; className: string; sizes: string }) {
  const [small, base, large] = artVariants[name];
  return <img
    className={className}
    src={`/art/${name}.png`}
    srcSet={`/art/${name}-small.webp ${small}w, /art/${name}.png ${base}w, /art/${name}-large.webp ${large}w`}
    sizes={sizes}
    alt=""
    decoding="async"
  />;
}

function paintExplorer(c: CanvasRenderingContext2D, images: HTMLImageElement[], position: ExplorerPosition, time: number, moving: boolean) {
  const frame = moving ? [0, 3, 1, 3, 0, 4, 2, 4][Math.floor(time * 10) % 8] : 0;
  const image = images[frame]?.complete && images[frame]?.naturalWidth ? images[frame] : images[0];
  if (!image?.complete || !image.naturalWidth) {
    drawExplorer(c, position, time, moving);
    return;
  }
  const { x, y, scale } = position;
  const bob = moving ? Math.sin(time * 13) * 1.7 : Math.sin(time * 1.5) * .25;
  const [sx, sy, sw, sh] = spriteCrops[images.indexOf(image)];
  const sourceScale = image.naturalWidth / 1159;
  c.drawImage(image, sx * sourceScale, sy * sourceScale, sw * sourceScale, sh * sourceScale, Math.round(x - 27.5 * scale), Math.round(y - 88 * scale + bob), 55 * scale, 88 * scale);
}

function StarField({ reducedMotion }: { reducedMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const context = canvas?.getContext("2d");
    if (!canvas || !host || !context) return;

    let seed = 1739;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const stars = Array.from({ length: 180 }, (_, index) => ({
      x: random(), y: random() * .41, radius: .35 + random() * 1.15,
      phase: random() * Math.PI * 2, speed: .35 + random() * 1.25,
      hue: index % 7 === 0 ? 193 : index % 5 === 0 ? 310 : 224,
      bright: index % 37 === 0,
    }));
    let width = 0, height = 0, frame = 0;
    const resize = () => {
      width = host.clientWidth;
      height = host.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2, 4096 / Math.max(1, width), 2304 / Math.max(1, height));
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (reducedMotion) draw(0);
    };
    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      for (const star of stars) {
        const x = star.x * width, y = star.y * height;
        const alpha = reducedMotion ? .72 : .53 + .24 * Math.sin(time * star.speed + star.phase);
        if (star.bright) {
          const glow = context.createRadialGradient(x, y, 0, x, y, 11);
          glow.addColorStop(0, `hsla(${star.hue},100%,91%,${alpha * .72})`);
          glow.addColorStop(1, `hsla(${star.hue},100%,72%,0)`);
          context.fillStyle = glow;
          context.beginPath(); context.arc(x, y, 11, 0, Math.PI * 2); context.fill();
        }
        context.fillStyle = `hsla(${star.hue},100%,${star.bright ? 95 : 86}%,${alpha})`;
        context.beginPath(); context.arc(x, y, star.bright ? 1.7 : star.radius, 0, Math.PI * 2); context.fill();
      }
    };
    const animate = (time: number) => { draw(time / 1000); frame = requestAnimationFrame(animate); };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    if (!reducedMotion) frame = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [reducedMotion]);

  return <canvas ref={canvasRef} className="star-layer" aria-hidden="true" />;
}

export function PixelScene({ step, reducedMotion }: Props) {
  const skyRef = useRef<HTMLDivElement>(null);
  const travelerRef = useRef<HTMLCanvasElement>(null);
  const explorerImagesRef = useRef<HTMLImageElement[]>([]);
  const positionRef = useRef<ExplorerPosition>({ ...pathPoints[0] });
  const movingRef = useRef(false);
  const [isMobile, setIsMobile] = useState(false);
  const [spriteTier, setSpriteTier] = useState<"small" | "base" | "large" | null>(null);
  const lastMobileRef = useRef(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const update = () => {
      const physicalWidth = window.innerWidth * (window.devicePixelRatio || 1);
      setSpriteTier(physicalWidth >= 2560 ? "large" : physicalWidth >= 1500 ? "base" : "small");
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const host = skyRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: false, antialias: false, powerPreference: "low-power" });
    } catch {
      return;
    }
    renderer.setPixelRatio(1);
    renderer.setSize(SCENE_WIDTH, SCENE_HEIGHT, false);
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);
    const material = new THREE.ShaderMaterial({
      vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position,1.0); }",
      fragmentShader: `
        precision mediump float; varying vec2 vUv;
        void main(){
          float y=vUv.y;
          vec3 night=vec3(.015,.019,.13);
          vec3 violet=vec3(.17,.035,.38);
          vec3 dusk=vec3(.67,.045,.39);
          vec3 col=mix(dusk,violet,smoothstep(.18,.61,y));
          col=mix(col,night,smoothstep(.55,1.0,y));
          gl_FragColor=vec4(col,1.0);
        }`,
      depthTest: false,
      depthWrite: false,
    });
    const scene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);
    const camera = new THREE.Camera();
    renderer.render(scene, camera);
    return () => {
      renderer.dispose();
      material.dispose();
      quad.geometry.dispose();
      renderer.domElement.remove();
    };
  }, []);

  useEffect(() => {
    const travelerCanvas = travelerRef.current;
    const travelerContext = travelerCanvas?.getContext("2d", { alpha: true });
    if (!travelerContext || !spriteTier) return;
    travelerContext.imageSmoothingEnabled = false;
    const explorers = [new Image(), new Image(), new Image(), new Image(), new Image()];
    explorerImagesRef.current = explorers;

    let frame = 0;
    const start = performance.now();
    const tick = () => {
      const time = reducedMotion ? 0 : (performance.now() - start) / 1000;
      travelerContext.clearRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
      paintExplorer(travelerContext, explorers, positionRef.current, time, movingRef.current);
      if (!reducedMotion) frame = requestAnimationFrame(tick);
    };
    ["explorer", "explorer-step-a", "explorer-step-b", "explorer-step-c", "explorer-step-d"].forEach((name, index) => {
      explorers[index].onload = () => { if (reducedMotion) tick(); };
      explorers[index].src = `/art/${name}${spriteTier === "base" ? ".png" : `-${spriteTier}.webp`}`;
    });
    tick();
    return () => { cancelAnimationFrame(frame); explorers.forEach(image => { image.onload = null; }); if (explorerImagesRef.current === explorers) explorerImagesRef.current = []; };
  }, [reducedMotion, spriteTier]);

  useEffect(() => {
    const points = isMobile ? mobilePathPoints : pathPoints;
    const target = { ...points[Math.min(3, Math.max(0, step))] };
    gsap.killTweensOf(positionRef.current);
    if (reducedMotion || lastMobileRef.current !== isMobile) {
      Object.assign(positionRef.current, target);
      movingRef.current = false;
      const context = travelerRef.current?.getContext("2d");
      if (context) {
        context.clearRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
        paintExplorer(context, explorerImagesRef.current, target, 0, false);
      }
      lastMobileRef.current = isMobile;
      return;
    }
    lastMobileRef.current = isMobile;
    movingRef.current = true;
    gsap.to(positionRef.current, {
      ...target,
      duration: 1.1,
      ease: "power2.inOut",
      onComplete: () => { movingRef.current = false; },
    });
  }, [step, reducedMotion, isMobile]);

  return <>
    <div className="scene-layers" aria-hidden="true">
      <div className="sky-layer" ref={skyRef} />
      <StarField reducedMotion={reducedMotion} />
      <div className="sun-disc" />
      <div className="asset-layer cloud-layer">
        <ArtImage name="cloud-bank" className="cloud-asset cloud-asset-left" sizes="(max-width: 700px) 72vw, 44vw" />
        <ArtImage name="cloud-bank" className="cloud-asset cloud-asset-middle" sizes="(max-width: 700px) 42vw, 25vw" />
        <ArtImage name="cloud-bank" className="cloud-asset cloud-asset-right" sizes="(max-width: 700px) 73vw, 44vw" />
      </div>
      <div className="asset-layer mountain-layer">
        <ArtImage name="mountain-range" className="mountain-asset" sizes="(max-width: 700px) 165vw, 100vw" />
      </div>
      <CityLayer reducedMotion={reducedMotion} />
      <RiverLayer />
      <div className="asset-layer trail-layer"><ArtImage name="trail" className="trail-asset" sizes="(max-width: 700px) 165vw, 100vw" /></div>
    </div>
    <div className="traveler-wrapper" aria-hidden="true">
      <canvas ref={travelerRef} width={SCENE_WIDTH} height={SCENE_HEIGHT} />
    </div>
  </>;
}
