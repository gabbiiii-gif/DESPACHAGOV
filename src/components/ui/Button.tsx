import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "acento" | "outline" | "ghost";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-azul-principal text-white hover:bg-azul-escuro focus-visible:outline-azul-principal",
  acento: "bg-laranja-acento text-white hover:bg-laranja-vibrante focus-visible:outline-laranja-acento",
  outline: "border border-cinza-borda bg-white text-cinza-texto hover:bg-cinza-fundo",
  ghost: "text-cinza-texto hover:bg-cinza-fundo",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export function Button({ variant = "primary", loading, disabled, children, className = "", ...rest }: Props) {
  return (
    <button
      className={`${BASE} ${VARIANTS[variant]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading ? "..." : children}
    </button>
  );
}
