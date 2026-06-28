import type { ReactNode } from "react";
import "./GradientText.css";

// Texto com gradiente animado (react-bits GradientText, reescrito em CSS puro —
// sem framer-motion). O gradiente desliza horizontalmente.
export function GradientText({
  children, className = "", colors = ["#2456A6", "#1f9d6b", "#C2602F", "#2456A6"],
}: {
  children: ReactNode; className?: string; colors?: string[];
}) {
  const cores = [...colors, colors[0]].join(",");
  return (
    <span
      className={`dg-gradient-text ${className}`}
      style={{ backgroundImage: `linear-gradient(to right, ${cores})`, backgroundSize: "300% 100%" }}
    >
      {children}
    </span>
  );
}
