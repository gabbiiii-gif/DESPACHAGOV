import { useEffect, useRef } from "react";
import { gsap } from "gsap";

const reduzido = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Animação de entrada (fade + leve subida) ao montar. Respeita reduced-motion.
export function useEntrada<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduzido()) return;
    const ctx = gsap.context(() => {
      gsap.from(el, { opacity: 0, y: 14, duration: 0.5, ease: "power2.out" });
    }, el);
    return () => ctx.revert();
  }, []);
  return ref;
}

// Anima os filhos diretos em cascata quando `quando` muda (ex.: dados carregados).
export function useStagger<T extends HTMLElement = HTMLDivElement>(quando: unknown) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduzido() || el.children.length === 0) return;
    const ctx = gsap.context(() => {
      gsap.from(el.children, { opacity: 0, y: 12, duration: 0.4, stagger: 0.06, ease: "power2.out" });
    }, el);
    return () => ctx.revert();
  }, [quando]);
  return ref;
}
