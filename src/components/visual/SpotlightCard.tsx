import { useRef, type ReactNode, type MouseEvent } from "react";
import "./SpotlightCard.css";

// Card com "holofote" que segue o cursor (react-bits SpotlightCard, port TS,
// adaptado ao tema claro). O chrome do card (borda/fundo) vem por className.
export function SpotlightCard({
  children, className = "", spotlightColor = "rgba(36, 86, 166, 0.14)",
}: {
  children: ReactNode; className?: string; spotlightColor?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mouse-x", `${e.clientX - r.left}px`);
    el.style.setProperty("--mouse-y", `${e.clientY - r.top}px`);
    el.style.setProperty("--spotlight-color", spotlightColor);
  };

  return (
    <div ref={ref} onMouseMove={onMove} className={`dg-spotlight ${className}`}>
      {children}
    </div>
  );
}
