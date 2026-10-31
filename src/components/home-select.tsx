"use client";

import { useEffect } from "react";

// Selección de personaje en "¿Qué hago?": la tarjeta sobre la que pasa el mouse (o que recibe el
// foco) queda elegida aunque el mouse se vaya; arranca elegida la primera (data-selected en home.tsx).
export function HomeSelect() {
  useEffect(() => {
    const list = document.querySelector<HTMLElement>(".home-slides");
    if (!list) return;
    const choose = (event: Event) => {
      const card = (event.target as HTMLElement).closest<HTMLElement>(".home-slide");
      if (!card || card.hasAttribute("data-selected")) return;
      list.querySelector("[data-selected]")?.removeAttribute("data-selected");
      card.setAttribute("data-selected", "");
    };
    list.addEventListener("pointerover", choose);
    list.addEventListener("focusin", choose);
    return () => { list.removeEventListener("pointerover", choose); list.removeEventListener("focusin", choose); };
  }, []);

  return null;
}
