"use client";

import { useEffect, useState } from "react";
import { PixelScene } from "./pixel-scene";
import { ProjectPanel, ServicesPanel, StartingPanel } from "./journey-panels";
import { content, heroContent, projectContent, servicesContent, startingContent } from "@/lib/content";

const stages = [
  { title: servicesContent.title, short: servicesContent.navLabel },
  { title: startingContent.title, short: startingContent.navLabel },
  { title: projectContent.title, short: projectContent.navLabel },
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
  const [assetsReady,setAssetsReady]=useState(false);
  const [reducedMotion,setReducedMotion]=useState(false);
  const [service,setService]=useState("");
  const [startingPoint,setStartingPoint]=useState("");
  const whatsapp=`https://wa.me/${content.contacto.whatsapp}?text=Hola%20Fabricio%2C%20quiero%20hablarte%20de%20un%20proyecto`;

  useEffect(()=>{
    const media=window.matchMedia("(prefers-reduced-motion: reduce)");
    const update=()=>setReducedMotion(media.matches);update();media.addEventListener("change",update);
    return()=>media.removeEventListener("change",update);
  },[]);

  useEffect(()=>{
    const update=()=>{
      const sections=[0,1,2,3].map(index=>document.getElementById(`etapa-${index}`));
      const closest=sections.reduce((best,section,index)=>{
        if(!section) return best;
        const bestDistance=Math.abs((sections[best]?.offsetTop ?? 0)-window.scrollY);
        return Math.abs(section.offsetTop-window.scrollY)<bestDistance?index:best;
      },0);
      setStep(closest);
    };
    update();window.addEventListener("scroll",update,{passive:true});window.addEventListener("resize",update);
    return()=>{window.removeEventListener("scroll",update);window.removeEventListener("resize",update);};
  },[]);

  useEffect(()=>{
    let active=true;
    let timeout:ReturnType<typeof setTimeout>;
    const waitForImage=(image:HTMLImageElement)=>new Promise<void>(resolve=>{
      if(image.complete){resolve();return;}
      const done=()=>resolve();
      image.addEventListener("load",done,{once:true});
      image.addEventListener("error",done,{once:true});
    });
    const sceneImages=Array.from(document.querySelectorAll<HTMLImageElement>(".scene-layers img"));
    const physicalWidth=window.innerWidth*(window.devicePixelRatio||1);
    const tier=physicalWidth>=2560?"large":physicalWidth>=1500?"base":"small";
    const explorer=new Image();
    explorer.src=`/art/explorer${tier==="base"?".png":`-${tier}.webp`}`;
    const explorerReady=waitForImage(explorer);
    const loading=Promise.allSettled([document.fonts.ready,explorerReady,...sceneImages.map(waitForImage)]);
    const fallback=new Promise<void>(resolve=>{timeout=setTimeout(resolve,12000);});
    Promise.race([loading,fallback]).then(()=>{clearTimeout(timeout);if(active)setAssetsReady(true);});
    return()=>{active=false;clearTimeout(timeout);};
  },[]);

  const goTo=(index:number)=>{
    const target=document.getElementById(`etapa-${index}`);
    if(!target)return;
    setStep(index);
    window.scrollTo({top:target.offsetTop,behavior:"instant"});
  };

  return <main aria-busy={!assetsReady}>
    <div className="fixed-stage" data-step={step}>
      <PixelScene step={step} reducedMotion={reducedMotion}/>
      <div className="scene-vignette" aria-hidden="true"/>
      <header className="site-header"><a href="#etapa-0" onClick={(event)=>{event.preventDefault();goTo(0);}} className="brand" aria-label={`${content.marca.nombre}, volver al inicio`}>{content.marca.nombre.split(".")[0]}<span>{content.marca.nombre.split(".")[1]}</span></a></header>

      {step===0&&<div className="copy-panel is-visible">
        <p className="hero-prefix">{heroContent.titlePrefix}</p>
        <h1>{heroContent.title}</h1>
        <p className="hero-subhead">{heroContent.subtitle}</p>
        <p className="hero-description">{heroContent.description}</p>
        <button className="hero-button" type="button" onClick={()=>goTo(3)}>{heroContent.action} <Arrow/></button>
        <div className="hero-meta"><p className="signature">{content.marca.firma}</p><a href={whatsapp} target="_blank" rel="noopener noreferrer" className="whatsapp-link">{content.interfaz.whatsapp} <Arrow diagonal/></a></div>
      </div>}

      {step===1&&<ServicesPanel selected={service} onChoose={(value)=>{setService(value);goTo(2);}}/>}
      {step===2&&<StartingPanel selected={startingPoint} onChoose={(value)=>{setStartingPoint(value);goTo(3);}}/>}
      {step===3&&<ProjectPanel service={service} startingPoint={startingPoint} onServiceChange={setService} onStartingPointChange={setStartingPoint}/>}

      <nav className="milestones" aria-label={content.interfaz.etapas}>
        {stages.map((stage,index)=><button key={stage.title} type="button" className={`milestone milestone-${index+1} ${step===index+1?"is-active":""} ${step>index+1?"is-complete":""}`} onClick={()=>goTo(index+1)} aria-label={`Ir a ${stage.title}`} aria-current={step===index+1?"step":undefined}>
          <span className="milestone-icon"><Icon kind={index}/></span><span className="milestone-label">{stage.short}</span>
        </button>)}
      </nav>

      <div className="journey-footer"><span className="step-display">{String(step).padStart(2,"0")} / {String(stages.length).padStart(2,"0")}</span></div>
      <div className="scroll-cue" aria-hidden="true">{step<3?content.interfaz.scroll:content.interfaz.recorridoCompleto} {step<3&&<Arrow down/>}</div>
      <p className="sr-only" aria-live="polite">{step===0?content.interfaz.inicio:`Avance ${step} de ${stages.length}: ${stages[step-1]?.title}`}</p>
    </div>
    {!assetsReady&&<div className="scene-loader" role="status" aria-label="Cargando el paisaje">
      <div className="loader-art" aria-hidden="true"><span className="loader-sun"/><span className="loader-mountain loader-mountain-back"/><span className="loader-mountain loader-mountain-front"/><span className="loader-path"/><span className="loader-traveler"/></div>
      <span className="loader-label">Cargando el camino<span className="loader-dots">...</span></span>
    </div>}
    <div className="scroll-track" aria-hidden="true">{[0,1,2,3].map(index=><section key={index} id={`etapa-${index}`} className="scroll-page"/>)}</div>
  </main>;
}
