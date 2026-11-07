"use client";

import { useEffect, useState } from "react";
import { isCalm, MOTION_EVENT } from "@/lib/motion";

// Interruptor 8-bit fijo abajo a la izquierda para encender o apagar las animaciones (lib/motion.ts).
// Se ve también sobre la pantalla de carga. El clic lo atiende el script del <head> (motionFlag), que
// ya funciona antes de que React tome la página; el aspecto sale de html.calm en CSS y React solo
// mantiene aria-checked al día. Sin JS no se muestra (home.css).
export function MotionToggle() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    const sync = () => setOn(!isCalm());
    sync();
    window.addEventListener(MOTION_EVENT, sync);
    return () => window.removeEventListener(MOTION_EVENT, sync);
  }, []);

  return <button type="button" role="switch" aria-checked={on} className="motion-toggle" suppressHydrationWarning>
    <span className="motion-toggle-label">Animaciones</span>
    <span className="motion-toggle-track" aria-hidden="true"><span className="motion-toggle-knob"/></span>
  </button>;
}
