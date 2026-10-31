"use client";

import { ContactForm } from "./contact-form";
import { choiceIcons, projectContent, serviceLabel, servicesContent, startingContent } from "@/lib/content";

export const services = servicesContent.list;
export const startingPoints = startingContent.list;

function ChoiceIcon({ kind }: { kind: string }) {
  const src = choiceIcons[kind];
  return src ? <img src={src} alt="" draggable={false} decoding="async" /> : null;
}

function ChoiceArrow() {
  return <svg className="choice-arrow" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M2 10h15m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="2"/></svg>;
}

export function ServicesPanel({ kicker, selected, onChoose }: { kicker: string; selected: string; onChoose: (value: string) => void }) {
  return <section className="content-panel services-panel" aria-labelledby="services-title">
    <p className="panel-kicker">{kicker}</p>
    <h2 id="services-title">{servicesContent.title}</h2>
    <p className="panel-lead">{servicesContent.descripcion}</p>
    <div className="choices services-grid">
      {services.map((value) => <button key={value} className={`choice-card ${selected === value ? "is-selected" : ""}`} type="button" onClick={() => onChoose(value)} aria-pressed={selected === value}>
        <span className="choice-icon"><ChoiceIcon kind={value}/></span><span className="choice-title">{serviceLabel(value)}</span><ChoiceArrow/>
      </button>)}
    </div>
    <p className="panel-examples">{servicesContent.examples}</p>
  </section>;
}

export function StartingPanel({ kicker, selected, onChoose }: { kicker: string; selected: string; onChoose: (value: string) => void }) {
  return <section className="content-panel starting-panel" aria-labelledby="starting-title">
    <p className="panel-kicker">{kicker}</p>
    <h2 id="starting-title">{startingContent.title}</h2>
    <p className="panel-lead">{startingContent.descripcion}</p>
    <div className="choices starting-grid">
      {startingPoints.map((item) => <button key={item.title} className={`choice-card ${selected === item.title ? "is-selected" : ""}`} type="button" onClick={() => onChoose(item.title)} aria-pressed={selected === item.title}>
        <span className="choice-icon"><ChoiceIcon kind={item.title}/></span><span className="choice-title">{item.title}</span><span className="choice-description">{item.description}</span><ChoiceArrow/>
      </button>)}
    </div>
  </section>;
}

export function ProjectPanel({ kicker, service, startingPoint, onServiceChange, onStartingPointChange }: {
  kicker: string;
  service: string;
  startingPoint: string;
  onServiceChange: (value: string) => void;
  onStartingPointChange: (value: string) => void;
}) {
  return <section className="content-panel project-panel" aria-labelledby="project-title">
    <p className="panel-kicker">{kicker}</p>
    <h2 id="project-title">{projectContent.title}</h2>
    <p className="panel-lead">{projectContent.descripcion}</p>
    <ContactForm service={service} startingPoint={startingPoint} onServiceChange={onServiceChange} onStartingPointChange={onStartingPointChange} icon={<ChoiceArrow/>}/>
  </section>;
}
