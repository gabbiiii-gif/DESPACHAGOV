import { useEffect, useRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { gsap } from "gsap";

// Re-anima o conteúdo a cada troca de rota (fade + leve subida).
// Respeita prefers-reduced-motion.
export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from(el, { opacity: 0, y: 12, duration: 0.4, ease: "power2.out" });
    }, el);
    return () => ctx.revert();
  }, [pathname]);
  return <div ref={ref}>{children}</div>;
}
