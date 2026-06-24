import { useEffect, useRef, useState } from "react";

// Assinatura por toque/mouse. Chama onChange(dataUrl|null) ao desenhar/limpar.
export function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const [temTraco, setTemTraco] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Resolução física p/ traço nítido.
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1A3F7A";
  }, []);

  function pos(e: React.PointerEvent) {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function start(e: React.PointerEvent) {
    e.preventDefault();
    desenhando.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }
  function move(e: React.PointerEvent) {
    if (!desenhando.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (!temTraco) setTemTraco(true);
  }
  function end() {
    if (!desenhando.current) return;
    desenhando.current = false;
    onChange(temTraco ? canvasRef.current!.toDataURL("image/png") : null);
  }
  function limpar() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setTemTraco(false);
    onChange(null);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="h-36 w-full touch-none rounded-lg border border-dashed border-cinza-borda bg-white"
      />
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-cinza-secundario">Assine no quadro acima</span>
        <button type="button" onClick={limpar} className="text-xs text-azul-principal hover:underline">Limpar</button>
      </div>
    </div>
  );
}
