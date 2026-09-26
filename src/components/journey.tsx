"use client";

import { useEffect, useState } from "react";
import { PixelScene } from "./pixel-scene";
import { ProjectPanel, ServicesPanel, StartingPanel } from "./journey-panels";

const stages = [
  { title: "¿Qué hago?", short: "Servicios" },
  { title: "¿En qué punto estás?", short: "Tu punto de partida" },
  { title: "Contame tu proyecto", short: "Tu proyecto" },
] as const;

function Icon({kind}: {kind:number}) {
  if(kind===0) return <svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M17 3h6v5l4 2 4-3 4 5-4 4 1 5 5 2-2 6-6-1-4 3v5h-7v-5l-4-2-5 2-3-6 5-3v-5l-4-4 4-5 5 3 4-2V3Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="miter"/><path d="M20 16h4v7h-7v-7h3Z" fill="currentColor"/></svg>;
  if(kind===1) return <svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M17 4h7v7h-7zM4 29h7v7H4zM17 29h7v7h-7zM29 29h7v7h-7zM20.5 11v8M7.5 29v-9h25v9M20.5 20v9" stroke="currentColor" strokeWidth="3"/></svg>;
  return <svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M4 6h32v28H4zM4 13h32M9 10h2m3 0h2m3 0h2M10 19h13M10 24h19M10 29h15" stroke="currentColor" strokeWidth="3"/></svg>;
}

function Arrow({diagonal=false,down=false}: {diagonal?:boolean;down?:boolean}) {
  const path=down?"M10 2v15m-5-5 5 5 5-5":diagonal?"M4 16 16 4M7 4h9v9":"M2 10h15m-5-5 5 5-5 5";
  return <svg className="arrow" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d={path} stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter"/></svg>;
}

export function Journey() {
  const [step,setStep]=useState(0);
  const [reducedMotion,setReducedMotion]=useState(false);
  const [service,setService]=useState("");
  const [startingPoint,setStartingPoint]=useState("");
  const whatsapp="https://wa.me/5491158272260?text=Hola%20Fabricio%2C%20quiero%20hablarte%20de%20un%20proyecto";

  useEffect(()=>{
    const media=window.matchMedia("(prefers-reduced-motion: reduce)");
    const update=()=>setReducedMotion(media.matches);update();media.addEventListener("change",update);
    return()=>media.removeEventListener("change",update);
  },[]);

  useEffect(()=>{
    const update=()=>{
      const value=Math.round(window.scrollY/Math.max(1,window.innerHeight));
      setStep(Math.max(0,Math.min(3,value)));
    };
    update();window.addEventListener("scroll",update,{passive:true});window.addEventListener("resize",update);
    return()=>{window.removeEventListener("scroll",update);window.removeEventListener("resize",update);};
  },[]);

  const goTo=(index:number)=>{
    document.getElementById(`etapa-${index}`)?.scrollIntoView({behavior:reducedMotion?"instant":"smooth",block:"start"});
  };

  return <main>
    <div className="fixed-stage" data-step={step}>
      <PixelScene step={step} reducedMotion={reducedMotion}/>
      <div className="scene-vignette" aria-hidden="true"/>
      <header className="site-header"><a href="#etapa-0" onClick={(event)=>{event.preventDefault();goTo(0);}} className="brand" aria-label="Mont.AR, volver al inicio">MONT<span>AR</span></a></header>

      {step===0&&<div className="copy-panel is-visible">
        <h1>TUS<br/>HERRAMIENTAS<br/>DIGITALES</h1>
        <p className="hero-subhead">PARA DAR EL PRÓXIMO PASO</p>
        <p className="hero-description">Webs, sistemas y automatizaciones a medida.</p>
        <button className="hero-button" type="button" onClick={()=>goTo(3)}>HABLEMOS DE TU PROYECTO <Arrow/></button>
        <div className="hero-meta"><p className="signature">FABRICIO MONTIVERO · ARGENTINA</p><a href={whatsapp} target="_blank" rel="noopener noreferrer" className="whatsapp-link">WHATSAPP <Arrow diagonal/></a></div>
      </div>}

      {step===1&&<ServicesPanel selected={service} onChoose={(value)=>{setService(value);goTo(2);}}/>}
      {step===2&&<StartingPanel selected={startingPoint} onChoose={(value)=>{setStartingPoint(value);goTo(3);}}/>}
      {step===3&&<ProjectPanel service={service} startingPoint={startingPoint} onServiceChange={setService} onStartingPointChange={setStartingPoint}/>}

      <nav className="milestones" aria-label="Etapas del recorrido">
        {stages.map((stage,index)=><button key={stage.title} type="button" className={`milestone milestone-${index+1} ${step===index+1?"is-active":""} ${step>index+1?"is-complete":""}`} onClick={()=>goTo(index+1)} aria-label={`Ir a ${stage.title}`} aria-current={step===index+1?"step":undefined}>
          <span className="milestone-icon"><Icon kind={index}/></span><span className="milestone-label">{stage.short}</span>
        </button>)}
      </nav>

      <div className="journey-footer"><span className="step-display">{String(step).padStart(2,"0")} / 03</span></div>
      <div className="scroll-cue" aria-hidden="true">{step<3?"SCROLL PARA AVANZAR":"RECORRIDO COMPLETO"} {step<3&&<Arrow down/>}</div>
      <p className="sr-only" aria-live="polite">{step===0?"Inicio del recorrido":`Avance ${step} de 3: ${stages[step-1]?.title}`}</p>
    </div>
    <div className="scroll-track" aria-hidden="true">{[0,1,2,3].map(index=><section key={index} id={`etapa-${index}`} className="scroll-page"/>)}</div>
  </main>;
}
