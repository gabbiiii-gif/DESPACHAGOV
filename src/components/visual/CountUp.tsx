import { useEffect, useRef, useState } from "react";

const REDUZIDO = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Número que anima de 0 até `to` (ease-out cubic), via rAF — leve, sem libs.
// Respeita prefers-reduced-motion (mostra o valor final direto, sem animar).
export function CountUp({
  to, duration = 1100, decimals = 0, prefix = "", suffix = "", className,
}: {
  to: number; duration?: number; decimals?: number; prefix?: string; suffix?: string; className?: string;
}) {
  const [val, setVal] = useState(0);
  const inicioRef = useRef<number | null>(null);

  useEffect(() => {
    if (REDUZIDO) return;
    let raf = 0;
    inicioRef.current = null;
    const tick = (t: number) => {
      if (inicioRef.current === null) inicioRef.current = t;
      const p = Math.min(1, (t - inicioRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(to * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);

  return <span className={className}>{prefix}{(REDUZIDO ? to : val).toFixed(decimals)}{suffix}</span>;
}
