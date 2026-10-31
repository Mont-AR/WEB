"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { JOURNEY } from "@/lib/journey-config";
import timeline from "@/lib/journey-timeline.json";

type Props = {
  /** Segundos de animación que corresponden a la posición de scroll actual. */
  timeRef: RefObject<number>;
  /** Etapa activa: elige el póster mientras el render todavía no está listo. */
  stage: number;
};

// Render 2.5D en vivo: el motor de tools/journey dibuja cada fotograma (explorador, iconos, ruta,
// luces y cielo) sobre la ilustración, y ese fotograma se apoya en un plano con relieve según un mapa
// de profundidad. La cámara se acerca al explorador a lo largo del recorrido y responde al puntero,
// así que el paisaje 2D gana paralaje real. Sin WebGL se dibuja el fotograma plano en un canvas 2D.
// Three.js y el motor se cargan aparte para no sumarlos al primer pintado (mientras, se ve el póster).
const PLANE_H = 2;
const FOV = 30;
const Z0 = PLANE_H / 2 / Math.tan((FOV / 2) * Math.PI / 180);
const RELIEF = .9;      // profundidad máxima del relieve (unidades de escena)
const OVERSCAN = .9;    // margen para que el movimiento de cámara no muestre los bordes
const DOLLY = .32;      // acercamiento de la cámara del inicio a la cima
// margen al borde del plano para que el balanceo y el paralaje no muestren el fondo (en pantallas
// verticales el encuadre llega al borde derecho en la cima; arriba y abajo alcanza con menos)
const EDGE_X = .1, EDGE_Y = .04;

const vertexShader = /* glsl */ `
  uniform sampler2D uDepth;
  uniform float uRelief;
  uniform vec2 uRest;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    float d = texture2D(uDepth, uv).r;
    vDepth = d;
    vec3 p = position;
    p.z = d * uRelief;
    // desde la cámara de reposo el relieve no deforma la imagen: solo el desplazamiento crea paralaje
    p.xy = uRest + (p.xy - uRest) * (${Z0.toFixed(4)} - p.z) / ${Z0.toFixed(4)};
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vec3 c = texture2D(uMap, vUv).rgb;
    // bruma violeta muy leve en lo lejano para separar los planos
    c = mix(c, vec3(.28, .12, .42), (1.0 - smoothstep(.0, .35, vDepth)) * .08);
    gl_FragColor = vec4(c, 1.0);
  }
`;

const smoothstep = (k: number) => k * k * (3 - 2 * k);

export function JourneyRender({ timeRef, stage }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let frame = 0;
    let cleanup = () => {};
    // fuera de pantalla no se dibuja nada; al volver se retoma el loop
    let visible = true;
    let loop: ((now: number) => void) | null = null;
    const resume = () => { if (loop && visible && !frame) frame = requestAnimationFrame(loop); };
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; resume(); });
    visibility.observe(canvas);

    (async () => {
      const [THREE, { createJourneyEngine }, { buildDepthMap }] = await Promise.all([
        import("three"), import("@/lib/journey-engine"), import("@/lib/journey-depth"),
      ]);
      if (cancelled) return;
      const layers = await fetch(`${JOURNEY.layers}/layers.json`).then((r) => r.json());
      const images = Object.fromEntries((layers.files as string[]).map((f) => [f, `${JOURNEY.layers}/${f}`]));
      const engine = createJourneyEngine({ timeline, layers, images });
      await engine.ready();
      if (cancelled) return;
      const work = engine.renderTime(timeRef.current ?? 0);

      let renderer: InstanceType<typeof THREE.WebGLRenderer> | null = null;
      try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" }); }
      catch { renderer = null; }

      // ---------------------------------------------------------- sin WebGL: fotograma plano
      if (!renderer) {
        const ctx = canvas.getContext("2d")!;
        let last = NaN;
        const draw = () => {
          frame = 0;
          if (!visible) return;
          const t = timeRef.current ?? 0;
          const w = canvas.clientWidth, h = canvas.clientHeight;
          if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; last = NaN; }
          if (t !== last) {
            last = t;
            engine.renderTime(t);
            const s = Math.max(w / work.width, h / work.height);
            ctx.drawImage(work, (w - work.width * s) * .7, (h - work.height * s) / 2, work.width * s, work.height * s);
          }
          frame = requestAnimationFrame(draw);
        };
        loop = draw;
        draw();
        setReady(true);
        return;
      }

      // ---------------------------------------------------------- escena 2.5D
      renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(FOV, 1, .05, 20);
      const aspect = layers.width / layers.height;
      const planeW = PLANE_H * aspect;

      const map = new THREE.CanvasTexture(work);
      map.colorSpace = THREE.NoColorSpace;
      map.generateMipmaps = false;
      map.minFilter = THREE.LinearFilter;
      const skyImage = new Image();
      skyImage.src = `${JOURNEY.layers}/${layers.sky.file}`;
      await skyImage.decode();
      if (cancelled) { renderer.dispose(); return; }
      const depth = new THREE.CanvasTexture(buildDepthMap(layers.width, layers.height, { image: skyImage, ...layers.sky }));
      depth.colorSpace = THREE.NoColorSpace;

      const uniforms = { uMap: { value: map }, uDepth: { value: depth }, uRelief: { value: RELIEF }, uRest: { value: new THREE.Vector2() } };
      const geometry = new THREE.PlaneGeometry(planeW, PLANE_H, 320, 180);
      const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });
      scene.add(new THREE.Mesh(geometry, material));

      // motas de luz que flotan entre el sendero y la cámara: refuerzan la profundidad
      const MOTES = 90;
      const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; })();
      const motePos = new Float32Array(MOTES * 3);
      const moteSeed = Array.from({ length: MOTES }, () => ({
        x: (.05 + rnd() * .5) * planeW, y: -.95 + rnd() * 1.1, z: .25 + rnd() * (RELIEF + .25),
        ph: rnd() * Math.PI * 2, sp: .2 + rnd() * .5,
      }));
      const motes = new THREE.BufferGeometry();
      motes.setAttribute("position", new THREE.BufferAttribute(motePos, 3));
      const moteMaterial = new THREE.PointsMaterial({ color: 0x61f7e7, size: .016, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending });
      scene.add(new THREE.Points(motes, moteMaterial));

      const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
      const onPointer = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        pointer.x = e.clientX / innerWidth * 2 - 1;
        pointer.y = e.clientY / innerHeight * 2 - 1;
      };
      window.addEventListener("pointermove", onPointer, { passive: true });

      let width = 0, height = 0, lastT = NaN;
      const resize = () => {
        width = canvas.clientWidth; height = canvas.clientHeight;
        // en pantallas chicas se limita la densidad: el relieve se redibuja en cada cuadro
        renderer!.setPixelRatio(Math.min(devicePixelRatio, Math.min(width, height) < 700 ? 1.5 : 2));
        renderer!.setSize(width, height, false);
        camera.aspect = width / height;
        // encuadre "cover": se ve toda la altura o todo el ancho, con margen para el movimiento
        const visH = (camera.aspect >= aspect ? planeW / camera.aspect : PLANE_H) * OVERSCAN;
        camera.fov = 2 * Math.atan(visH / 2 / Z0) * 180 / Math.PI;
        camera.updateProjectionMatrix();
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(canvas);

      const start = performance.now();
      const tick = (now: number) => {
        frame = 0;
        if (!visible) return;
        const t = timeRef.current ?? 0;
        if (t !== lastT) { lastT = t; engine.renderTime(t); map.needsUpdate = true; }
        const k = smoothstep(Math.min(1, t / JOURNEY.duration));
        const clock = (now - start) / 1000;

        // cámara de reposo: encuadre horizontal (en pantallas angostas acompaña al explorador) y
        // un leve seguimiento del explorador
        const narrow = camera.aspect < 1;
        // en vertical el primer plano ya ocupa mucho: el acercamiento es menor
        const dolly = (narrow ? DOLLY * .35 : DOLLY) * k;
        const visH = 2 * (Z0 - dolly) * Math.tan(camera.fov * Math.PI / 360);
        const visW = visH * camera.aspect;
        const maxX = Math.max(0, (planeW - visW) / 2 - EDGE_X), maxY = Math.max(0, (PLANE_H - visH) / 2 - EDGE_Y);
        const pan = narrow ? (JOURNEY.panStart + (JOURNEY.panEnd - JOURNEY.panStart) * k) / 100 : .7;
        const ex = engine.explorerAt(t);
        const exX = (ex.x / layers.width - .5) * planeW, exY = (.5 - ex.y / layers.height) * PLANE_H;
        let cx = -maxX + 2 * maxX * pan, cy = 0;
        // en vertical el acercamiento recorta mucho: la cámara sube con el explorador hasta la cima
        cx += (exX - cx) * (narrow ? .5 : .12) * k; cy += (exY - cy) * (narrow ? .75 : .18) * k;
        cx = Math.max(-maxX, Math.min(maxX, cx)); cy = Math.max(-maxY, Math.min(maxY, cy));
        uniforms.uRest.value.set(cx, cy);

        // desplazamiento: puntero + balanceo lento, y acercamiento según el avance del recorrido
        pointer.sx += (pointer.x - pointer.sx) * .05; pointer.sy += (pointer.y - pointer.sy) * .05;
        const swayX = Math.sin(clock * .21) * .025, swayY = Math.sin(clock * .17 + 1) * .015;
        const ox = pointer.sx * .1 + swayX, oy = -pointer.sy * .06 + swayY;
        camera.position.set(cx + ox, cy + oy, Z0 - dolly);
        camera.lookAt(cx + ox * .35, cy + oy * .35, RELIEF * .45);

        for (let i = 0; i < MOTES; i++) {
          const m = moteSeed[i];
          motePos[i * 3] = m.x - planeW / 2 + Math.sin(clock * m.sp + m.ph) * .03;
          motePos[i * 3 + 1] = m.y + ((clock * m.sp * .04 + m.ph) % 1) * .12;
          motePos[i * 3 + 2] = m.z;
        }
        motes.attributes.position.needsUpdate = true;
        moteMaterial.opacity = .35 + .25 * Math.sin(clock * 1.3);

        renderer!.render(scene, camera);
        frame = requestAnimationFrame(tick);
      };
      loop = tick;
      resume();
      setReady(true);

      cleanup = () => {
        observer.disconnect();
        window.removeEventListener("pointermove", onPointer);
        geometry.dispose(); material.dispose(); motes.dispose(); moteMaterial.dispose();
        map.dispose(); depth.dispose(); renderer!.dispose();
      };
    })().catch((error) => console.error("No se pudo iniciar el render del recorrido", error));

    return () => {
      cancelled = true;
      visibility.disconnect();
      cancelAnimationFrame(frame);
      cleanup();
    };
  }, [timeRef]);

  return <canvas
    ref={canvasRef}
    className={`journey-render ${ready ? "is-ready" : ""}`}
    style={ready ? undefined : { backgroundImage: `url(${JOURNEY.posters[stage]})` }}
    aria-hidden="true"
  />;
}
