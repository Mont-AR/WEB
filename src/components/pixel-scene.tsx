"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";

const W = 640;
const H = 360;
const pathPoints = [
  { x: 427, y: 278 },
  { x: 492, y: 251 },
  { x: 550, y: 218 },
  { x: 603, y: 176 },
];
const mobilePathPoints = [
  pathPoints[0],
  { x: 440, y: 260 },
  { x: 485, y: 230 },
  { x: 550, y: 200 },
];

type Props = { step: number; reducedMotion: boolean };
function hash(n: number) { const x = Math.sin(n * 127.1 + 78.233) * 43758.5453; return x - Math.floor(x); }
function rect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function poly(c: CanvasRenderingContext2D, points: number[], color: string) {
  c.fillStyle = color; c.beginPath(); c.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) c.lineTo(points[i], points[i + 1]);
  c.closePath(); c.fill();
}
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function cloud(c: CanvasRenderingContext2D, x: number, y: number, scale: number, seed: number) {
  const blocks = 22;
  rect(c,x-12*scale,y-9*scale,blocks*7*scale+24*scale,9*scale,"#7d0a80");
  for (let i = 0; i < blocks; i++) {
    const xx = x + i * 7 * scale;
    const wave=Math.sin((i / (blocks - 1)) * Math.PI);
    const height = (9 + 19 * Math.pow(wave,1.4) + Math.sin(i*.65+seed)*4 + hash(seed+i)*3) * scale;
    const yy = y - height;
    rect(c, xx, yy, 8 * scale, height, "#9b0b88");
    if (i % 3 === 0) rect(c, xx + 2 * scale, yy + 3 * scale, 7 * scale, 4 * scale, "#c71391");
    if (i % 2 === 0) rect(c, xx, y - 4 * scale, 10 * scale, 3 * scale, "#df238e");
  }
  for(let i=0;i<8;i++) rect(c,x+(i*24-12)*scale,y+(i%3)*2*scale,17*scale,2*scale,i%2?"#e42d91":"#ad148a");
}

function mountains(c: CanvasRenderingContext2D) {
  poly(c, [0,210, 34,174, 65,206, 110,177, 143,211, 211,173, 250,207, 292,184, 328,215, 378,175, 419,214, 476,177, 527,218, 571,176, 640,216,640,306,0,306], "#32206f");
  poly(c, [0,236, 51,197, 86,227, 143,189, 184,231, 224,203, 265,235, 302,199, 337,237, 383,181, 414,220, 450,161, 489,227, 531,190, 573,234,640,196,640,316,0,316], "#201454");
  poly(c, [302,241, 383,181, 414,220, 450,161, 489,227, 530,190, 570,244, 535,259, 399,255], "#47217c");
  poly(c, [450,161, 457,182, 475,198, 489,227, 465,207, 451,184, 439,201, 424,213], "#ee5a9a");
  poly(c, [450,161, 465,181, 473,192, 460,186, 456,176, 450,170, 438,188, 420,215, 436,195], "#ff9a77");
  poly(c, [383,181, 393,207, 420,225, 408,220, 386,198, 369,215, 350,233], "#8d4cbb");
  poly(c, [302,199, 316,218, 337,237, 326,225, 302,209, 282,231], "#7951a5");
  for (let i = 0; i < 85; i++) {
    const x = 270 + hash(i * 5 + 1) * 330;
    const y = 204 + hash(i * 7 + 8) * 49;
    rect(c,x,y,1 + hash(i+29)*4,1 + hash(i+83)*2, i%3===0 ? "#6d2b93" : "#44226e");
  }
  poly(c, [0,224, 56,206, 111,223, 169,208, 225,238, 274,226, 311,248, 364,220, 403,253, 439,229, 491,254, 640,222,640,294,0,294], "#160e47");
}

function sun(c: CanvasRenderingContext2D, time: number) {
  const cx=472, cy=161, radius=44;
  const halo = c.createRadialGradient(cx,cy,18,cx,cy,92);
  halo.addColorStop(0,`rgba(255,134,78,${0.25 + Math.sin(time*0.7)*0.03})`);
  halo.addColorStop(1,"rgba(241,50,150,0)");
  c.fillStyle=halo;c.fillRect(cx-94,cy-94,188,188);
  c.save(); c.beginPath(); c.arc(cx,cy,radius,0,Math.PI*2); c.clip();
  const g=c.createLinearGradient(0,cy-radius,0,cy+radius);g.addColorStop(0,"#ffd286");g.addColorStop(.56,"#ffac6f");g.addColorStop(1,"#ff6b81");
  c.fillStyle=g;c.fillRect(cx-radius,cy-radius,radius*2,radius*2);
  for(let i=0;i<5;i++) rect(c,cx-radius,cy+4+i*9,radius*2,2+i%2,"#dd3787");
  c.restore();
}

function cityAndRiver(c: CanvasRenderingContext2D, time: number) {
  poly(c,[0,259,80,254,171,262,247,247,321,257,383,249,436,257,495,244,559,257,640,252,640,315,0,315],"#160d43");
  for(let i=0;i<196;i++) {
    const x=22+hash(i*11+2)*524, y=244+hash(i*17+6)*50;
    const lit=Math.sin(time*(1.1+hash(i)*1.4)+i*19)>-.26;
    rect(c,x,y,hash(i+4)>.68?3:1.5,1.5,lit?(i%4===0?"#fa488d":"#ffa66b"):"#4a2269");
  }
  poly(c,[394,259,429,261,450,270,421,280,372,283,334,295,309,302,242,311,230,319,166,333,92,340,10,346,0,360,421,360,465,326,419,311,414,299,453,282,470,269],"#38237a");
  poly(c,[409,260,431,263,449,270,417,278,373,280,337,294,305,300,243,314,177,327,86,343,0,350,0,360,337,360,408,324,419,307,413,294,451,277],"#472d90");
  for(let i=0;i<34;i++) {
    const y=266+i*2.75; const middle=lerp(420,65,i/34)+Math.sin(i*.8)*18;
    const length=lerp(36,140,i/34);
    rect(c,middle-length*.65 + ((time*13+i*21)%(length*.8)),y,Math.max(5,length*.15),i%5===0?2:1,i%3===0?"#ff916a":i%3===1?"#e454a2":"#51d4da");
    if(i%4===0) rect(c,middle-length*.3,y+1,length*.5,1,"#89479f");
  }
}

function foreground(c: CanvasRenderingContext2D, time: number) {
  // The path is a sequence of angular terraces, authored in scene coordinates.
  poly(c,[273,360,342,326,393,310,423,288,462,272,490,254,518,240,548,221,579,200,604,181,640,166,640,360],"#110d34");
  poly(c,[324,360,367,330,415,307,458,280,493,260,525,239,553,220,580,200,610,184,640,178,640,219,603,218,582,232,564,254,537,270,503,291,462,313,416,340,385,360],"#b65c78");
  poly(c,[335,360,376,333,420,309,461,281,493,262,526,240,555,219,581,199,612,183,640,179,640,195,604,202,581,216,554,239,520,260,483,286,443,315,392,347,371,360],"#d98677");
  poly(c,[366,360,408,330,452,302,489,277,527,251,562,226,592,202,619,186,640,181,640,191,610,203,583,224,551,250,517,275,479,302,433,332,393,360],"#7c3d70");
  for(let i=0;i<58;i++) {
    const t=i/58;const x=lerp(349,626,t)+Math.sin(t*17)*6;const y=lerp(351,184,t)+Math.sin(t*10)*3;
    if(i%3!==0) rect(c,x,y,lerp(10,2,t),lerp(4,1,t),i%4===0?"#e68275":"#884169");
  }
  for(let i=0;i<18;i++) {
    const t=i/18, x=lerp(358,624,t)+Math.sin(i*.5)*6, y=lerp(346,183,t)+Math.sin(i*.9)*4;
    const shimmer=.67+.33*Math.sin(time*2+i*1.7);
    rect(c,x,y,lerp(14,3,t),lerp(5,2,t),shimmer>.72?"#65ffe0":"#23b9bf");
    rect(c,x+1,y+1,Math.max(2,lerp(7,1,t)),1,"#baffeb");
  }
  // Silhouetted rocks and foliage along the trail.
  for(let i=0;i<125;i++) {
    const x=hash(i*3+2)*W, y=298+hash(i*7+4)*72;
    if(x>325&&x<565&&y<334) continue;
    const h=3+hash(i*11+6)*16;
    rect(c,x,y-h,3+hash(i*19)*8,h,i%7===0?"#4c1c75":i%9===0?"#ac3582":"#0b0b34");
    if(i%6===0) rect(c,x+2,y-h,3,2,"#bc4f87");
  }
  poly(c,[0,319,23,314,40,330,65,317,82,334,107,325,128,344,154,328,187,347,220,332,248,353,281,335,309,356,0,360],"#080a2d");
}

function traveler(c: CanvasRenderingContext2D, x: number, y: number, time: number, moving: boolean) {
  const bob=moving?Math.sin(time*12)*2:Math.sin(time*1.8)*.5;
  c.save();c.translate(Math.round(x),Math.round(y+bob));
  rect(c,-7,4,5,14,"#0b092d");rect(c,2,5,5,13,"#0b092d");
  rect(c,-8,15,7,3,"#050623");rect(c,2,16,8,3,"#050623");
  rect(c,-7,-13,13,20,"#eb7b62");rect(c,-4,-11,8,18,"#884273");
  rect(c,5,-10,5,15,"#f2a36a");rect(c,7,2,6,4,"#f3a56d");
  rect(c,-8,-28,15,14,"#f0a775");rect(c,3,-25,5,9,"#ffc080");
  rect(c,-10,-30,16,7,"#1a0b2e");rect(c,-11,-25,7,9,"#180a2e");rect(c,-1,-34,10,5,"#1d0d35");
  rect(c,7,-31,4,3,"#ffb563");rect(c,5,-22,2,2,"#201037");
  rect(c,-16,-13,9,22,"#062e56");rect(c,-17,-15,10,4,"#15cfce");rect(c,-16,5,10,4,"#14bfc4");
  rect(c,-14,-9,6,11,"#061e43");rect(c,-13,-5,4,2,"#3af6dc");
  c.restore();
}

function draw(c: CanvasRenderingContext2D, time: number) {
  c.clearRect(0,0,W,H);
  for(let i=0;i<105;i++) {
    const x=hash(i*3+11)*W, y=hash(i*13+9)*145;
    const twinkle=.4+.6*Math.sin(time*(.8+hash(i+1)*2)+i);
    if(twinkle>.68) rect(c,x,y, i%17===0?3:1, i%17===0?3:1, i%8===0?"#80fafa":"#f7b8ef");
    if(i%17===0) {rect(c,x-2,y+1,7,1,"#d35dc8");rect(c,x+1,y-2,1,7,"#e66bc9");}
  }
  cloud(c, -35 + Math.sin(time*.09)*22, 88, .72, 12);
  cloud(c, 382 + Math.sin(time*.075+2)*19, 92, .75, 53);
  cloud(c, 569 + Math.sin(time*.085+1)*15, 71, .53, 86);
  cloud(c, 290 + Math.sin(time*.06)*15, 137, .33, 23);
  sun(c,time);mountains(c);cityAndRiver(c,time);foreground(c,time);
}

export function PixelScene({step,reducedMotion}: Props) {
  const skyRef=useRef<HTMLDivElement>(null);
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const travelerRef=useRef<HTMLCanvasElement>(null);
  const positionRef=useRef({...pathPoints[0]});
  const movingRef=useRef(false);
  const [isMobile,setIsMobile]=useState(false);
  const lastMobileRef=useRef(false);

  useEffect(()=>{
    const media=window.matchMedia("(max-width: 700px)");
    const update=()=>setIsMobile(media.matches);
    update();media.addEventListener("change",update);
    return()=>media.removeEventListener("change",update);
  },[]);

  useEffect(()=>{
    const host=skyRef.current;
    if(!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer=new THREE.WebGLRenderer({alpha:false,antialias:false,powerPreference:"low-power"}); }
    catch { return; }
    renderer.setPixelRatio(1);renderer.setSize(W,H);renderer.domElement.setAttribute("aria-hidden","true");
    host.appendChild(renderer.domElement);
    const material=new THREE.ShaderMaterial({
      uniforms:{uTime:{value:0}},
      vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position,1.0); }`,
      fragmentShader:`
        precision mediump float; varying vec2 vUv; uniform float uTime;
        void main(){
          float y=vUv.y;
          vec3 deep=vec3(.023,.022,.16); vec3 purple=vec3(.23,.035,.43); vec3 pink=vec3(.69,.055,.40);
          vec3 col=mix(pink,purple,smoothstep(.22,.63,y));
          col=mix(col,deep,smoothstep(.57,1.0,y));
          float d=distance(vUv,vec2(.737,.55));
          float glow=exp(-d*d*26.0)*(0.65+0.05*sin(uTime*.8));
          col+=vec3(.83,.14,.22)*glow;
          gl_FragColor=vec4(col,1.0);
        }`,
      depthTest:false,depthWrite:false
    });
    const scene=new THREE.Scene(); const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);scene.add(quad);
    const camera=new THREE.Camera(); let frame=0;const start=performance.now();
    const animate=()=>{material.uniforms.uTime.value=(performance.now()-start)/1000;renderer.render(scene,camera);frame=requestAnimationFrame(animate);};
    if(reducedMotion) renderer.render(scene,camera); else animate();
    return()=>{cancelAnimationFrame(frame);renderer.dispose();material.dispose();quad.geometry.dispose();renderer.domElement.remove();};
  },[reducedMotion]);

  useEffect(()=>{
    const canvas=canvasRef.current;const c=canvas?.getContext("2d",{alpha:true});
    const travelerCanvas=travelerRef.current;const tc=travelerCanvas?.getContext("2d",{alpha:true});
    if(!c||!tc) return;
    let frame=0;const start=performance.now();
    const tick=()=>{
      const time=reducedMotion?0:(performance.now()-start)/1000;
      draw(c,time);
      tc.clearRect(0,0,W,H);
      traveler(tc,positionRef.current.x,positionRef.current.y,time,movingRef.current);
      if(!reducedMotion) frame=requestAnimationFrame(tick);
    };tick();
    return()=>cancelAnimationFrame(frame);
  },[reducedMotion]);

  useEffect(()=>{
    const points=isMobile?mobilePathPoints:pathPoints;
    const target={...points[Math.min(3,Math.max(0,step))]};
    gsap.killTweensOf(positionRef.current);
    if(reducedMotion||lastMobileRef.current!==isMobile){
      Object.assign(positionRef.current,target);movingRef.current=false;
      const tc=travelerRef.current?.getContext("2d");
      if(tc){tc.clearRect(0,0,W,H);traveler(tc,target.x,target.y,0,false);}
      lastMobileRef.current=isMobile;
      return;
    }
    lastMobileRef.current=isMobile;
    movingRef.current=true;
    gsap.to(positionRef.current,{...target,duration:1.1,ease:"power2.inOut",onComplete:()=>{movingRef.current=false;}});
  },[step,reducedMotion,isMobile]);

  return <><div className="scene-layers" aria-hidden="true"><div className="sky-layer" ref={skyRef}/><canvas ref={canvasRef} width={W} height={H} className="pixel-layer"/></div><div className="traveler-wrapper" aria-hidden="true"><canvas ref={travelerRef} width={W} height={H}/></div></>;
}
