import type { HTMLAttributes } from "react";

export function Card({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-cinza-borda bg-cinza-card p-6 shadow-sm ${className}`}
      {...rest}
    />
  );
}

export function Alert({ tipo = "erro", children }: { tipo?: "erro" | "info" | "sucesso"; children: React.ReactNode }) {
  const cores = {
    erro: "bg-vermelho-critico/10 text-vermelho-critico",
    info: "bg-azul-info/10 text-azul-info",
    sucesso: "bg-verde-sucesso/10 text-verde-sucesso",
  } as const;
  return (
    <div role="alert" className={`rounded-lg px-3.5 py-2.5 text-sm ${cores[tipo]}`}>
      {children}
    </div>
  );
}
