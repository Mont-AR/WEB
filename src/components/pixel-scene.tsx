"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";
import {
  SCENE_HEIGHT,
  SCENE_WIDTH,
  drawAtmosphere,
  drawExplorer,
  drawLandscape,
  drawLightEffects,
  drawRiverEffects,
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
] as const;

function paintExplorer(c: CanvasRenderingContext2D, images: HTMLImageElement[], position: ExplorerPosition, time: number, moving: boolean) {
  const frame = moving ? [0, 1, 0, 2][Math.floor(time * 8) % 4] : 0;
  const image = images[frame]?.complete && images[frame]?.naturalWidth ? images[frame] : images[0];
  if (!image?.complete || !image.naturalWidth) {
    drawExplorer(c, position, time, moving);
    return;
  }
  const { x, y, scale } = position;
  const bob = moving ? Math.sin(time * 13) * 1.7 : Math.sin(time * 1.5) * .25;
  const [sx, sy, sw, sh] = spriteCrops[images.indexOf(image)];
  c.drawImage(image, sx, sy, sw, sh, Math.round(x - 27.5 * scale), Math.round(y - 88 * scale + bob), 55 * scale, 88 * scale);
}

export function PixelScene({ step, reducedMotion }: Props) {
  const skyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const foregroundRef = useRef<HTMLCanvasElement>(null);
  const riverEffectsRef = useRef<HTMLCanvasElement>(null);
  const travelerRef = useRef<HTMLCanvasElement>(null);
  const explorerImagesRef = useRef<HTMLImageElement[]>([]);
  const positionRef = useRef<ExplorerPosition>({ ...pathPoints[0] });
  const movingRef = useRef(false);
  const [isMobile, setIsMobile] = useState(false);
  const lastMobileRef = useRef(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
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
      uniforms: { uTime: { value: 0 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position,1.0); }",
      fragmentShader: `
        precision mediump float; varying vec2 vUv; uniform float uTime;
        void main(){
          float y=vUv.y;
          vec3 night=vec3(.015,.019,.13);
          vec3 violet=vec3(.17,.035,.38);
          vec3 dusk=vec3(.67,.045,.39);
          vec3 col=mix(dusk,violet,smoothstep(.18,.61,y));
          col=mix(col,night,smoothstep(.55,1.0,y));
          float d=distance(vUv,vec2(.734,.55));
          float glow=exp(-d*d*29.0)*(.78+.035*sin(uTime*.8));
          col+=vec3(.85,.16,.21)*glow;
          gl_FragColor=vec4(col,1.0);
        }`,
      depthTest: false,
      depthWrite: false,
    });
    const scene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);
    const camera = new THREE.Camera();
    let frame = 0;
    const start = performance.now();
    const animate = () => {
      material.uniforms.uTime.value = (performance.now() - start) / 1000;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    if (reducedMotion) renderer.render(scene, camera);
    else animate();
    return () => {
      cancelAnimationFrame(frame);
      renderer.dispose();
      material.dispose();
      quad.geometry.dispose();
      renderer.domElement.remove();
    };
  }, [reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    const foregroundContext = foregroundRef.current?.getContext("2d", { alpha: true });
    const riverContext = riverEffectsRef.current?.getContext("2d", { alpha: true });
    const travelerCanvas = travelerRef.current;
    const travelerContext = travelerCanvas?.getContext("2d", { alpha: true });
    if (!context || !foregroundContext || !riverContext || !travelerContext) return;
    const landscape = document.createElement("canvas");
    landscape.width = SCENE_WIDTH;
    landscape.height = SCENE_HEIGHT;
    const landscapeContext = landscape.getContext("2d");
    if (!landscapeContext) return;
    drawLandscape(landscapeContext);
    travelerContext.imageSmoothingEnabled = false;
    const explorers = [new Image(), new Image(), new Image()];
    explorerImagesRef.current = explorers;

    let frame = 0;
    const start = performance.now();
    const tick = () => {
      const time = reducedMotion ? 0 : (performance.now() - start) / 1000;
      drawAtmosphere(context, time);
      foregroundContext.clearRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
      foregroundContext.drawImage(landscape, 0, 0);
      drawLightEffects(foregroundContext, time);
      riverContext.clearRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
      drawRiverEffects(riverContext, time);
      travelerContext.clearRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
      paintExplorer(travelerContext, explorers, positionRef.current, time, movingRef.current);
      if (!reducedMotion) frame = requestAnimationFrame(tick);
    };
    ["/art/explorer.png", "/art/explorer-step-a.png", "/art/explorer-step-b.png"].forEach((src, index) => {
      explorers[index].onload = () => { if (reducedMotion) tick(); };
      explorers[index].src = src;
    });
    tick();
    return () => { cancelAnimationFrame(frame); explorers.forEach(image => { image.onload = null; }); if (explorerImagesRef.current === explorers) explorerImagesRef.current = []; };
  }, [reducedMotion]);

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
      <canvas ref={canvasRef} width={SCENE_WIDTH} height={SCENE_HEIGHT} className="pixel-layer atmosphere-layer" />
      <div className="asset-layer cloud-layer">
        <img className="cloud-asset cloud-asset-left" src="/art/cloud-bank.png" alt="" />
        <img className="cloud-asset cloud-asset-middle" src="/art/cloud-bank.png" alt="" />
        <img className="cloud-asset cloud-asset-right" src="/art/cloud-bank.png" alt="" />
      </div>
      <div className="asset-layer mountain-layer">
        <img className="mountain-asset" src="/art/mountain-range.png" alt="" />
      </div>
      <canvas ref={foregroundRef} width={SCENE_WIDTH} height={SCENE_HEIGHT} className="pixel-layer foreground-layer" />
      <div className="asset-layer river-layer"><img className="river-asset" src="/art/river.png" alt="" /></div>
      <canvas ref={riverEffectsRef} width={SCENE_WIDTH} height={SCENE_HEIGHT} className="pixel-layer river-effects-layer" />
      <div className="asset-layer trail-layer"><img className="trail-asset" src="/art/trail.png" alt="" /></div>
    </div>
    <div className="traveler-wrapper" aria-hidden="true">
      <canvas ref={travelerRef} width={SCENE_WIDTH} height={SCENE_HEIGHT} />
    </div>
  </>;
}
