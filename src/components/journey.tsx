"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { JourneyClouds } from "./journey-clouds";
import { JourneyVideo } from "./journey-video";
import { ProjectPanel, ServicesPanel, StartingPanel } from "./journey-panels";
import { content, heroContent } from "@/lib/content";
import { JOURNEY, STAGES, formatStage, stageAtTime, stageProgress, targetAtProgress, trackHeight } from "@/lib/journey-config";

function Icon({kind}: {kind:number}) {
  if(kind===0) return <svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M3 34 15 15l7 10 5-6 10 15H3Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="miter"/><path d="M15 15V5h9l-3 3 3 3h-9" stroke="currentColor" strokeWidth="3"/></svg>;
  if(kind===1) return <svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M17 3h6v5l4 2 4-3 4 5-4 4 1 5 5 2-2 6-6-1-4 3v5h-7v-5l-4-2-5 2-3-6 5-3v-5l-4-4 4-5 5 3 4-2V3Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="miter"/><path d="M20 16h4v7h-7v-7h3Z" fill="currentColor"/></svg>;
  if(kind===2) return <svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M17 4h7v7h-7zM4 29h7v7H4zM17 29h7v7h-7zM29 29h7v7h-7zM20.5 11v8M7.5 29v-9h25v9M20.5 20v9" stroke="currentColor" strokeWidth="3"/></svg>;
  return <svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M4 6h32v28H4zM4 13h32M9 10h2m3 0h2m3 0h2M10 19h13M10 24h19M10 29h15" stroke="currentColor" strokeWidth="3"/></svg>;
}

function Arrow({diagonal=false,down=false}: {diagonal?:boolean;down?:boolean}) {
  const path=down?"M10 2v15m-5-5 5 5 5-5":diagonal?"M4 16 16 4M7 4h9v9":"M2 10h15m-5-5 5 5-5 5";
  return <svg className="arrow" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d={path} stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter"/></svg>;
}

export function Journey() {
  const [stage,setStage]=useState(0);
  const [assetsReady,setAssetsReady]=useState(false);
  const [reducedMotion,setReducedMotion]=useState(false);
  const [service,setService]=useState("");
  const [startingPoint,setStartingPoint]=useState("");
  const trackRef=useRef<HTMLDivElement>(null);
  const stageRef=useRef<HTMLDivElement>(null);
  // El scroll fija el destino; el cabezal (timeRef) avanza hacia él reproduciendo la animación.
  // Video, textos y contador leen solo el cabezal.
  const targetRef=useRef(0);
  const timeRef=useRef(0);
  // El trayecto en curso lo inició la navegación (más rápido que un gesto de scroll).
  const navTripRef=useRef(false);
  const whatsapp=`https://wa.me/${content.contacto.whatsapp}?text=Hola%20Fabricio%2C%20quiero%20hablarte%20de%20un%20proyecto`;

  useEffect(()=>{
    const media=window.matchMedia("(prefers-reduced-motion: reduce)");
    const update=()=>setReducedMotion(media.matches);update();media.addEventListener("change",update);
    return()=>media.removeEventListener("change",update);
  },[]);

  // Scroll → progreso de la pista → tiempo de destino. El scroll se ajusta a cada etapa, así que
  // en reposo el destino es el ancla de una etapa.
  useEffect(()=>{
    if(reducedMotion) return;
    let first=true;
    const update=()=>{
      const track=trackRef.current, sticky=stageRef.current;
      if(!track||!sticky) return;
      const distance=track.offsetHeight-sticky.offsetHeight;
      const progress=distance>0?-track.getBoundingClientRect().top/distance:0;
      targetRef.current=targetAtProgress(progress);
      // Al cargar en mitad del recorrido se muestra directamente ese punto, sin reproducir desde el inicio.
      if(first){timeRef.current=targetRef.current;first=false;setStage(stageAtTime(timeRef.current));}
    };
    update();window.addEventListener("scroll",update,{passive:true});window.addEventListener("resize",update);
    return()=>{window.removeEventListener("scroll",update);window.removeEventListener("resize",update);};
  },[reducedMotion]);

  // Cabezal: recorre la animación hasta el destino a velocidad de reproducción (con aceleración
  // y frenado suaves), en ambos sentidos. La etapa cambia cuando el explorador toca cada hito.
  useEffect(()=>{
    if(reducedMotion) return;
    let frame=0, last=performance.now(), speed=0, direction=0, cruise=0, tripTarget=NaN, journey="";
    const tick=(now:number)=>{
      // tiempo real aunque el navegador pinte a menos cuadros (solo se limita tras una pausa larga)
      const dt=Math.min(.12,(now-last)/1000); last=now;
      const remaining=targetRef.current-timeRef.current, distance=Math.abs(remaining);
      if(distance<1e-3){timeRef.current=targetRef.current;speed=0;direction=0;tripTarget=NaN;navTripRef.current=false;}
      else{
        const dir=Math.sign(remaining);
        if(dir!==direction){direction=dir;speed=0;}
        // velocidad de crucero fijada por trayecto: un salto largo dura como mucho maxTravel
        const nav=navTripRef.current;
        if(targetRef.current!==tripTarget){tripTarget=targetRef.current;cruise=nav?Math.max(JOURNEY.navMinSpeed,distance/JOURNEY.navMaxTravel):Math.max(JOURNEY.minSpeed,distance/JOURNEY.maxTravel);}
        const desired=cruise*Math.min(1,.3+distance/(nav?.8:.5));
        speed+=Math.max(-(nav?10:6)*dt,Math.min((nav?10:6)*dt,desired-speed));
        const step=speed*dt;
        timeRef.current=step>=distance?targetRef.current:timeRef.current+dir*step;
      }
      setStage(stageAtTime(timeRef.current));
      // avance del recorrido para el paralaje de las nubes
      const next=(timeRef.current/JOURNEY.duration).toFixed(4);
      if(next!==journey){journey=next;stageRef.current?.style.setProperty("--journey",next);}
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(frame);
  },[reducedMotion]);

  // Lectura secuencial: la etapa activa es la sección visible.
  useEffect(()=>{
    if(!reducedMotion) return;
    const sections=STAGES.map((_,index)=>document.getElementById(`etapa-${index}`)).filter((section):section is HTMLElement=>Boolean(section));
    const observer=new IntersectionObserver((entries)=>{
      for(const entry of entries) if(entry.isIntersecting) setStage(sections.indexOf(entry.target as HTMLElement));
    },{rootMargin:"-45% 0px -45% 0px"});
    sections.forEach(section=>observer.observe(section));
    return()=>observer.disconnect();
  },[reducedMotion]);

  useEffect(()=>{
    let active=true;
    let timeout:ReturnType<typeof setTimeout>;
    const poster=new Image();
    const posterLoaded=new Promise<void>(resolve=>{poster.onload=()=>resolve();poster.onerror=()=>resolve();});
    poster.src=JOURNEY.posters[0];
    const fallback=new Promise<void>(resolve=>{timeout=setTimeout(resolve,8000);});
    Promise.race([Promise.allSettled([document.fonts.ready,posterLoaded]),fallback]).then(()=>{clearTimeout(timeout);if(active)setAssetsReady(true);});
    return()=>{active=false;clearTimeout(timeout);};
  },[]);

  const goTo=(index:number)=>{
    const target=document.getElementById(`etapa-${index}`);
    if(!target)return;
    // El scroll llega al ancla; el cabezal recorre la animación desde el punto actual hasta allí.
    navTripRef.current=true;
    window.scrollTo({top:target.getBoundingClientRect().top+window.scrollY,behavior:"instant"});
  };

  const panels:ReactNode[]=[
    <div key="home" className="copy-panel is-visible">
      <p className="hero-prefix">{heroContent.titlePrefix}</p>
      <h1>{heroContent.title}</h1>
      <p className="hero-subhead">{heroContent.subtitle}</p>
      <p className="hero-description">{heroContent.description}</p>
      <button className="hero-button" type="button" onClick={()=>goTo(3)}>{heroContent.action} <Arrow/></button>
      <div className="hero-meta"><p className="signature">{content.marca.firma}</p><a href={whatsapp} target="_blank" rel="noopener noreferrer" className="whatsapp-link">{content.interfaz.whatsapp} <Arrow diagonal/></a></div>
    </div>,
    <ServicesPanel key="servicios" kicker={`${formatStage(1)} — ${STAGES[1].label}`} selected={service} onChoose={(value)=>{setService(value);goTo(2);}}/>,
    <StartingPanel key="necesidad" kicker={`${formatStage(2)} — ${STAGES[2].label}`} selected={startingPoint} onChoose={(value)=>{setStartingPoint(value);goTo(3);}}/>,
    <ProjectPanel key="proyecto" kicker={`${formatStage(3)} — ${STAGES[3].label}`} service={service} startingPoint={startingPoint} onServiceChange={setService} onStartingPointChange={setStartingPoint}/>,
  ];

  const header=<header className="site-header"><a href="#etapa-0" onClick={(event)=>{event.preventDefault();goTo(0);}} className="brand" aria-label={`${content.marca.nombre}, volver al inicio`}>{content.marca.nombre.split(".")[0]}<span>{content.marca.nombre.split(".")[1]}</span></a></header>;

  const footer=<>
    <div className="journey-footer">
      <nav className="milestones" aria-label={content.interfaz.etapas}>
        {STAGES.map((item,index)=><button key={item.id} type="button" className={`milestone ${stage===index?"is-active":""} ${stage>index?"is-complete":""}`} onClick={()=>goTo(index)} aria-label={`Ir a ${item.label}`} aria-current={stage===index?"step":undefined}>
          <span className="milestone-icon"><Icon kind={index}/></span><span className="milestone-label">{item.label}</span>
        </button>)}
      </nav>
      <span className="step-display">{formatStage(stage)} — {STAGES[stage].label}</span>
    </div>
    <div className="scroll-cue" aria-hidden="true">{stage<3?<>{content.interfaz.scroll} <Arrow down/></>:content.interfaz.recorridoCompleto}{!reducedMotion&&<span className="playhead-note">{content.interfaz.playhead}</span>}</div>
    <p className="sr-only" aria-live="polite">{stage===0?content.interfaz.inicio:`Etapa ${stage+1} de ${STAGES.length}: ${STAGES[stage].label}`}</p>
  </>;

  const loader=!assetsReady&&<div className="scene-loader" role="status" aria-label="Cargando el paisaje">
    <div className="loader-art" aria-hidden="true"><span className="loader-sun"/><span className="loader-mountain loader-mountain-back"/><span className="loader-mountain loader-mountain-front"/><span className="loader-path"/><span className="loader-traveler"/></div>
    <span className="loader-label">Cargando el camino<span className="loader-dots">...</span></span>
  </div>;

  if(reducedMotion) return <main className="journey-sequence" aria-busy={!assetsReady}>
    {header}
    {STAGES.map((item,index)=><section key={item.id} id={`etapa-${index}`} className="sequence-section" style={{backgroundImage:`url(${JOURNEY.posters[index]})`,["--pan" as string]:`${JOURNEY.panStart+(JOURNEY.panEnd-JOURNEY.panStart)*item.anchor/JOURNEY.duration}%`}} aria-label={item.label}>
      <div className="scene-vignette" aria-hidden="true"/>
      {panels[index]}
    </section>)}
    <div className="sequence-chrome">{footer}</div>
    {loader}
  </main>;

  return <main aria-busy={!assetsReady}>
    <div className="journey-track" ref={trackRef} style={{height:trackHeight}}>
      {STAGES.map((item,index)=><span key={item.id} id={`etapa-${index}`} className="stage-anchor" style={{top:`calc((100% - 100svh) * ${stageProgress(index)})`}} aria-hidden="true"/>)}
      <div className="fixed-stage" ref={stageRef} data-step={stage}>
        <JourneyVideo timeRef={timeRef} stage={stage}/>
        <JourneyClouds/>
        <div className="scene-vignette" aria-hidden="true"/>
        {header}
        {panels.map((panel,index)=><div key={STAGES[index].id} className={`stage-layer ${stage===index?"is-active":""}`} inert={stage!==index} aria-hidden={stage!==index}>{panel}</div>)}
        {footer}
      </div>
    </div>
    {loader}
  </main>;
}
